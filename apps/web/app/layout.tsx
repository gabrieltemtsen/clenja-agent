import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <h1>CLENJA Console</h1>
          <p style={{ opacity: 0.85 }}>Agentic wallet + cashout control panel</p>
          <p className="badge">Celo-inspired Demo Mode</p>
          {children}
        </div>
      </body>
    </html>
  );
}
