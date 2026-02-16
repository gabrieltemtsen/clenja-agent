import type { WalletProvider } from "./wallet.js";
import { ParaWalletProvider } from "./para.js";
import { TurnkeyWalletProvider } from "./turnkey.js";
import { GoatWalletProvider } from "./goat.js";
import { executionConfig, walletConfig } from "../lib/config.js";

export function makeWalletProvider(): WalletProvider {
  if (executionConfig.engine === "goat" || walletConfig.provider === "goat") return new GoatWalletProvider();
  if (walletConfig.provider === "turnkey") return new TurnkeyWalletProvider();
  return new ParaWalletProvider();
}
