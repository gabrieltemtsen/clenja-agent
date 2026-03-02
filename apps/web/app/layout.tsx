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
        <meta name="talentapp:project_verification" content="5e9e77e53337a5b5f788a3df9a55716dba2a12c29d5f4ebf08e25cf0469e4fe591615004df9fd1139d2509e244341c5f7a3899c07b580f3c3d493a8091ee603c" />
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
