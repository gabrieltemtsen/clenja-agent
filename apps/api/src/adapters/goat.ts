import { randomUUID } from "node:crypto";
import { Turnkey } from "@turnkey/sdk-server";
import type { EvmChain, Signature } from "@goat-sdk/core";
import { EVMWalletClient, type EVMReadRequest, type EVMReadResult, type EVMTransaction, type EVMTypedData } from "@goat-sdk/wallet-evm";
import { ethers } from "ethers";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult, PrepareSwapInput, PrepareSwapResult } from "./wallet.js";
import { TurnkeyWalletProvider } from "./turnkey.js";
import { store } from "../lib/store.js";
import { turnkeyConfig } from "../lib/config.js";

const CUSD_TOKEN_ADDRESS = process.env.CUSD_TOKEN_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const CELO_CHAIN_ID = Number(process.env.CELO_CHAIN_ID || 42220);

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

function mkWalletName(userId: string) {
  return `clenja-${userId.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}`;
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

    store.upsertWallet({ userId, provider: "turnkey", walletAddress: address, meta: { walletId }, createdAt: Date.now(), updatedAt: Date.now() });
    return { address, walletId };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!msg.toLowerCase().includes("wallet label must be unique")) throw e;

    const wallets = await c.getWallets();
    const found = (wallets as any)?.wallets?.find((w: any) => String(w?.walletName || "") === walletName);
    const walletId = String(found?.walletId || "");
    if (!walletId) throw new Error("turnkey_wallet_exists_but_not_found");

    const accounts = await c.getWalletAccounts({ walletId, includeWalletDetails: false });
    const address = String((accounts as any)?.accounts?.[0]?.address || "");
    if (!address) throw new Error("turnkey_wallet_account_not_found");

    store.upsertWallet({ userId, provider: "turnkey", walletAddress: address, meta: { walletId }, createdAt: Date.now(), updatedAt: Date.now() });
    return { address, walletId };
  }
}

class GoatTurnkeyEvmWalletClient extends EVMWalletClient {
  constructor(private readonly address: `0x${string}`, private readonly walletId: string) {
    super({ enableSend: true });
  }

  getAddress(): string {
    return this.address;
  }

  getChain(): EvmChain {
    return {
      type: "evm",
      id: CELO_CHAIN_ID,
      nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    };
  }

  async signMessage(_message: string): Promise<Signature> {
    throw new Error("goat_turnkey_sign_message_not_implemented");
  }

  async signTypedData(_data: EVMTypedData): Promise<Signature> {
    throw new Error("goat_turnkey_sign_typed_data_not_implemented");
  }

  async getNativeBalance(): Promise<bigint> {
    const hex = await rpc("eth_getBalance", [this.address, "latest"]);
    return BigInt(hex || "0x0");
  }

  async read(request: EVMReadRequest): Promise<EVMReadResult> {
    const iface = new ethers.utils.Interface(request.abi as any);
    const data = iface.encodeFunctionData(request.functionName as string, (request.args || []) as any[]);
    const result = await rpc("eth_call", [{ to: request.address, data }, "latest"]);
    const decoded = iface.decodeFunctionResult(request.functionName as string, result);
    return { value: decoded?.[0] };
  }

  async sendTransaction(tx: EVMTransaction): Promise<{ hash: string }> {
    const nonceHex = await rpc("eth_getTransactionCount", [this.address, "pending"]);
    const gasPriceHex = await rpc("eth_gasPrice", []);

    let data: `0x${string}` | undefined = tx.data as any;
    if (tx.abi && tx.functionName) {
      const iface = new ethers.utils.Interface(tx.abi as any);
      data = iface.encodeFunctionData(tx.functionName as string, (tx.args || []) as any[]) as `0x${string}`;
    }

    const unsignedTx = ethers.utils.serializeTransaction({
      chainId: CELO_CHAIN_ID,
      nonce: Number(BigInt(nonceHex)),
      gasPrice: gasPriceHex,
      gasLimit: tx.value ? 21000 : 180000,
      to: tx.to,
      value: tx.value ? ethers.BigNumber.from(tx.value.toString()) : undefined,
      data,
    });

    const signed = await client().signTransaction({
      signWith: this.address,
      unsignedTransaction: unsignedTx,
      type: "TRANSACTION_TYPE_ETHEREUM",
      timestampMs: nowMs(),
    });

    let rawSigned = String((signed as any)?.signedTransaction || "").trim();
    if (!rawSigned) throw new Error("turnkey_sign_failed");
    if (!rawSigned.startsWith("0x")) rawSigned = `0x${rawSigned}`;

    const txHash = await rpc("eth_sendRawTransaction", [rawSigned]);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), action: "goat.turnkey.sendTransaction", status: "ok", detail: { txHash, walletId: this.walletId } });
    return { hash: String(txHash) };
  }
}

/**
 * GOAT execution engine implementation.
 *
 * - Native GOAT wallet flow for balance + send
 * - Swap remains delegated to current Turnkey+Mento path until GOAT Celo swap plugin is wired
 */
export class GoatWalletProvider implements WalletProvider {
  private readonly legacy = new TurnkeyWalletProvider();

  private async getGoatClient(userId: string) {
    const { address, walletId } = await getOrCreateWallet(userId);
    return new GoatTurnkeyEvmWalletClient(address as `0x${string}`, walletId);
  }

  async createOrLinkUserWallet(userId: string): Promise<{ walletAddress: string }> {
    const { address } = await getOrCreateWallet(userId);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "goat.wallet.createOrLink", status: "ok" });
    return { walletAddress: address };
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const c = await this.getGoatClient(userId);
    const walletAddress = c.getAddress();
    const [celo, cusd] = await Promise.all([
      c.balanceOf(walletAddress),
      c.balanceOf(walletAddress, CUSD_TOKEN_ADDRESS as `0x${string}`),
    ]);

    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "goat.wallet.balance", status: "ok" });
    return {
      walletAddress,
      chain: "celo",
      balances: [
        { token: "CELO", amount: celo.value, usd: "0" },
        { token: "cUSD", amount: cusd.value, usd: "0" },
      ],
    };
  }

  async prepareSend(_input: PrepareSendInput): Promise<PrepareSendResult> {
    return { quoteId: `q_${randomUUID()}`, networkFee: "0.0004", estimatedArrival: "instant" };
  }

  async executeSend(input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }): Promise<{ txHash: string; status: "submitted" | "confirmed" }> {
    const c = await this.getGoatClient(input.userId);
    const amountInBaseUnits = ethers.utils.parseUnits(input.amount, 18).toString();
    const r = await c.sendToken({
      recipient: input.to as `0x${string}`,
      amountInBaseUnits,
      tokenAddress: input.token === "cUSD" ? (CUSD_TOKEN_ADDRESS as `0x${string}`) : undefined,
    });

    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: input.userId, action: "goat.wallet.executeSend", status: "ok", detail: { txHash: r.hash } });
    return { txHash: r.hash, status: "submitted" };
  }

  async prepareSwap(input: PrepareSwapInput): Promise<PrepareSwapResult> {
    // Phase 2: native GOAT swap plugin integration for Celo.
    return this.legacy.prepareSwap(input);
  }

  async executeSwap(input: { userId: string; quoteId: string; fromToken: "CELO" | "cUSD"; toToken: "CELO" | "cUSD"; amountIn: string; minAmountOut: string }): Promise<{ txHash: string; status: "submitted" | "confirmed" }> {
    // Phase 2: native GOAT swap plugin integration for Celo.
    return this.legacy.executeSwap(input);
  }
}
