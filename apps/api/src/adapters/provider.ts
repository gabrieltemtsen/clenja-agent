import type { WalletProvider } from "./wallet.js";
import { ParaWalletProvider } from "./para.js";
import { TurnkeyWalletProvider } from "./turnkey.js";
import { walletConfig } from "../lib/config.js";

export function makeWalletProvider(): WalletProvider {
  if (walletConfig.provider === "turnkey") return new TurnkeyWalletProvider();
  return new ParaWalletProvider();
}
