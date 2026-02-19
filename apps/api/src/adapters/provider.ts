import type { WalletProvider } from "./wallet.js";
import { ParaWalletProvider } from "./para.js";
// import { TurnkeyWalletProvider } from "./turnkey.js";
import { ConnectedWalletProvider } from "./connected.js";
import { GoatWalletProvider } from "./goat.js";
import { executionConfig, walletConfig } from "../lib/config.js";

export function makeWalletProvider(): WalletProvider {
  if (executionConfig.engine === "goat" || walletConfig.provider === "goat") return new GoatWalletProvider();
  if (walletConfig.provider === "turnkey") return new ConnectedWalletProvider();
  return new ParaWalletProvider();
}
