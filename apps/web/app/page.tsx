export default function Page() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>CLENJA Agent</h1>
      <p>Chat-native Celo wallet, payments, coop credit, and Africa-first cashout.</p>
      <h2>Infra APIs (x402)</h2>
      <ul>
        <li>GET /v1/wallet/balance</li>
        <li>POST /v1/wallet/send/prepare</li>
        <li>POST /v1/offramp/quote</li>
        <li>POST /v1/offramp/create</li>
      </ul>
    </main>
  );
}
