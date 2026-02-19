"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo } from "wagmi/chains";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
    appName: "CLENJA — Agentic Finance",
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "fallback_project_id",
    chains: [celo],
    transports: {
        [celo.id]: http(),
    },
    ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: "#35D07F",
                        accentColorForeground: "#060B18",
                        borderRadius: "medium",
                        fontStack: "system",
                        overlayBlur: "small",
                    })}
                    locale="en-US"
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
