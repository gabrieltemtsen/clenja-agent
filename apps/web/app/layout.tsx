import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CLENJA — Agentic Finance on Celo",
  description: "AI-powered agentic finance assistant with wallet operations, cashout orchestration, and onchain actions on Celo.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#060B18" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}

/* Client-side shell for navigation */
import { LayoutClient } from "./layout-client";

function LayoutShell({ children }: { children: React.ReactNode }) {
  return <LayoutClient>{children}</LayoutClient>;
}
