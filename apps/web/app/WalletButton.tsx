"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletButton() {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                if (!ready) {
                    return (
                        <div
                            aria-hidden="true"
                            style={{ opacity: 0, pointerEvents: "none", userSelect: "none" }}
                        />
                    );
                }

                if (!connected) {
                    return (
                        <button
                            className="wallet-connect-btn"
                            onClick={openConnectModal}
                            type="button"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            Connect Wallet
                        </button>
                    );
                }

                if (chain.unsupported) {
                    return (
                        <button
                            className="wallet-connect-btn wrong-network"
                            onClick={openChainModal}
                            type="button"
                        >
                            ⚠ Wrong Network
                        </button>
                    );
                }

                return (
                    <button
                        className="wallet-connect-btn connected"
                        onClick={openAccountModal}
                        type="button"
                    >
                        <span className="wallet-avatar">
                            {account.displayName.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="wallet-address">{account.displayName}</span>
                    </button>
                );
            }}
        </ConnectButton.Custom>
    );
}
