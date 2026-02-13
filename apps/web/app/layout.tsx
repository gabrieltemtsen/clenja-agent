export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif", background: "#0b1020", color: "#f5f7ff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
          <h1>CLENJA Console</h1>
          <p style={{ opacity: 0.8 }}>Agentic wallet + cashout control panel</p>
          {children}
        </div>
      </body>
    </html>
  );
}
