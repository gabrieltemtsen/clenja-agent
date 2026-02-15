import { randomUUID } from "node:crypto";
import { Turnkey } from "@turnkey/sdk-server";
import { Interface, Transaction, parseUnits } from "ethers";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult } from "./wallet.js";
import { safetyConfig, turnkeyConfig } from "../lib/config.js";
import { store } from "../lib/store.js";

type TurnkeyLiveStatus = { mode: "mock" | "live"; healthy: boolean; lastError?: string; lastCheckedAt?: number };
let liveStatus: TurnkeyLiveStatus = {
  mode: "live",
  healthy: false,
  lastError: "turnkey_not_initialized",
  lastCheckedAt: Date.now(),
};

function setLiveStatus(ok: boolean, err?: string) {
  liveStatus = { mode: "live", healthy: ok, lastError: err, lastCheckedAt: Date.now() };
}

export function getTurnkeyLiveStatus() {
  return liveStatus;
}

const CUSD_TOKEN_ADDRESS = process.env.CUSD_TOKEN_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const CELO_CHAIN_ID = Number(process.env.CELO_CHAIN_ID || 42220);

function assertConfig() {
  const missing = !turnkeyConfig.organizationId || !turnkeyConfig.apiPublicKey || !turnkeyConfig.apiPrivateKey;
  if (missing && safetyConfig.strictLiveMode) throw new Error("turnkey_live_strict_config_missing");
  return !missing;
}

function nowMs() {
  return String(Date.now());
}

let tk: Turnkey | null = null;
function client() {
  if (!tk) {
    tk = new Turnkey({
      apiBaseUrl: "https://api.turnkey.com",
      apiPublicKey: turnkeyConfig.apiPublicKey,
      apiPrivateKey: turnkeyConfig.apiPrivateKey,
      defaultOrganizationId: turnkeyConfig.organizationId,
    });
  }
  return tk.apiClient();
}

function mkWalletName(userId: string) {
  return `clenja-${userId.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}`;
}

async function rpc(method: string, params: any[]) {
  const r = await fetch(turnkeyConfig.celoRpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await r.json();
  if (data.error) throw new Error(`rpc_${data.error?.code || "error"}`);
  return data.result;
}

async function getOrCreateWallet(userId: string): Promise<{ address: string; walletId: string }> {
  const cached = store.getWallet(userId, "turnkey");
  if (cached?.walletAddress && cached?.meta?.walletId) {
    return { address: cached.walletAddress, walletId: cached.meta.walletId };
  }

  const c = client();
  const walletName = mkWalletName(userId);

  try {
    const created = await c.createWallet({
      walletName,
      accounts: [
        {
          curve: "CURVE_SECP256K1",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0",
          addressFormat: "ADDRESS_FORMAT_ETHEREUM",
        },
      ],
      timestampMs: nowMs(),
    });

    const walletId = String((created as any)?.walletId || "");
    const address = String((created as any)?.addresses?.[0] || "");
    if (!walletId || !address) throw new Error("turnkey_wallet_create_failed");

    store.upsertWallet({
      userId,
      provider: "turnkey",
      walletAddress: address,
      meta: { walletId },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { address, walletId };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!msg.toLowerCase().includes("wallet label must be unique")) {
      throw e;
    }

    // Wallet already exists in Turnkey but local state mapping may be missing (fresh deploy/ephemeral FS).
    const wallets = await c.getWallets();
    const found = (wallets as any)?.wallets?.find((w: any) => String(w?.walletName || "") === walletName);
    const walletId = String(found?.walletId || "");
    if (!walletId) throw new Error("turnkey_wallet_exists_but_not_found");

    const accounts = await c.getWalletAccounts({ walletId, includeWalletDetails: false });
    const address = String((accounts as any)?.accounts?.[0]?.address || "");
    if (!address) throw new Error("turnkey_wallet_account_not_found");

    store.upsertWallet({
      userId,
      provider: "turnkey",
      walletAddress: address,
      meta: { walletId },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { address, walletId };
  }
}

export class TurnkeyWalletProvider implements WalletProvider {
  async createOrLinkUserWallet(userId: string) {
    const ok = assertConfig();
    if (!ok) {
      setLiveStatus(false, "turnkey_not_configured");
      throw new Error("turnkey_not_configured");
    }

    try {
      const w = await getOrCreateWallet(userId);
      setLiveStatus(true);
      return { walletAddress: w.address };
    } catch (e: any) {
      const msg = String(e?.message || e);
      setLiveStatus(false, msg);
      throw new Error(msg);
    }
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const w = await this.createOrLinkUserWallet(userId);
    try {
      const hex = await rpc("eth_getBalance", [w.walletAddress, "latest"]);
      const wei = BigInt(hex || "0x0");
      const celo = (Number(wei) / 1e18).toString();
      setLiveStatus(true);
      return {
        walletAddress: w.walletAddress,
        chain: "celo",
        balances: [
          { token: "CELO", amount: celo, usd: "0" },
          { token: "cUSD", amount: "0", usd: "0" },
        ],
      };
    } catch (e: any) {
      setLiveStatus(false, String(e?.message || e));
      throw e;
    }
  }

  async prepareSend(_input: PrepareSendInput): Promise<PrepareSendResult> {
    return {
      quoteId: `q_${randomUUID()}`,
      networkFee: "0.0004",
      estimatedArrival: "instant",
    };
  }

  async executeSend(input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }) {
    const { walletId, address } = await getOrCreateWallet(input.userId);

    const nonceHex = await rpc("eth_getTransactionCount", [address, "pending"]);
    const gasPriceHex = await rpc("eth_gasPrice", []);

    const txReq: any = {
      chainId: CELO_CHAIN_ID,
      nonce: Number(BigInt(nonceHex)),
      gasPrice: BigInt(gasPriceHex),
    };

    if (input.token === "CELO") {
      txReq.to = input.to;
      txReq.value = parseUnits(input.amount, 18);
      txReq.gasLimit = BigInt(21000);
    } else {
      const erc20 = new Interface(["function transfer(address to, uint256 amount)"]);
      txReq.to = CUSD_TOKEN_ADDRESS;
      txReq.value = 0n;
      txReq.data = erc20.encodeFunctionData("transfer", [input.to, parseUnits(input.amount, 18)]);
      txReq.gasLimit = BigInt(120000);
    }

    const unsignedTx = Transaction.from(txReq).unsignedSerialized;

    const signed = await client().signTransaction({
      signWith: address,
      unsignedTransaction: unsignedTx,
      type: "TRANSACTION_TYPE_ETHEREUM",
      timestampMs: nowMs(),
    });

    let rawSigned = String((signed as any)?.signedTransaction || "").trim();
    if (!rawSigned) throw new Error("turnkey_sign_failed");
    if (!rawSigned.startsWith("0x")) rawSigned = `0x${rawSigned}`;

    const txHash = await rpc("eth_sendRawTransaction", [rawSigned]);

    store.addAudit({
      id: `aud_${Date.now()}`,
      ts: Date.now(),
      userId: input.userId,
      action: "turnkey.send",
      status: "ok",
      detail: { txHash, walletId, token: input.token, amount: input.amount, to: input.to },
    });

    setLiveStatus(true);
    return {
      txHash: String(txHash),
      status: "submitted" as const,
    };
  }
}
