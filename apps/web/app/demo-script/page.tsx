export default function DemoScriptPage() {
  return (
    <main>
      <h2>Judge Demo Script (3-4 min)</h2>
      <ol>
        <li><strong>Intro (20s):</strong> CLENJA is a Telegram-first agentic finance assistant on Celo with x402 infra endpoints.</li>
        <li><strong>Agentic chat (60s):</strong> In Agent Playground, submit: <code>cashout 50 cUSD</code>. Show challenge-based confirmation and response.</li>
        <li><strong>Beneficiaries (40s):</strong> Save a beneficiary and list it from web UI.</li>
        <li><strong>Cashout lifecycle (40s):</strong> Use payoutId in cashout-status page; move status pending→processing→settled.</li>
        <li><strong>Dashboard (30s):</strong> Load overview and show receipts + cashouts.</li>
        <li><strong>Infra angle (30s):</strong> Show x402-protected endpoint and explain paid API for other agents/devs.</li>
      </ol>

      <h3>Expected talking points</h3>
      <ul>
        <li>Real-world utility + mobile-first UX</li>
        <li>Trust/safety via policy and confirmations</li>
        <li>Reusable infra via payment-gated APIs</li>
        <li>Africa-first cashout direction with provider adapters</li>
      </ul>
    </main>
  );
}
