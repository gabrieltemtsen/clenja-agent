import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/beneficiaries">Beneficiaries</Link>
        <Link href="/cashout-status">Cashout Status</Link>
        <Link href="/agent">Agent Playground</Link>
        <Link href="/demo-script">Demo Script</Link>
      </div>
      <p style={{ marginTop: 16 }}>Use this UI for demoing user balances, receipts, beneficiaries, and payout lifecycle.</p>
    </main>
  );
}
