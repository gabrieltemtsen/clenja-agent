export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif", background: "#0b1020", color: "#f5f7ff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
          <h1>CLENJA Console</h1>
          <p style={{ opacity: 0.8 }}>Agentic wallet + cashout control panel</p>
          <p style={{ fontSize: 12, background: "#1d3a1f", color: "#b9ffbf", display: "inline-block", padding: "4px 8px", borderRadius: 999 }}>
            Demo Mode (Hackathon)
          </p>
          {children}
        </div>
      </body>
    </html>
  );
}
