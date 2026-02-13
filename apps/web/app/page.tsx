import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/beneficiaries">Beneficiaries</Link>
        <Link href="/cashout-status">Cashout Status</Link>
        <Link href="/agent">Agent Playground</Link>
      </div>
      <p style={{ marginTop: 16 }}>Use this UI for demoing user balances, receipts, beneficiaries, and payout lifecycle.</p>
    </main>
  );
}
