"use client";

import { useState } from "react";
import { getJson, postJson } from "../lib/api";
import { Badge, Card, ErrorText, Hint } from "../components";

export default function CashoutStatusPage() {
  const [payoutId, setPayoutId] = useState("");
  const [status, setStatus] = useState("processing");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  async function fetchStatus() {
    setErr("");
    try {
      const r = await getJson<any>(`/v1/offramp/status/${encodeURIComponent(payoutId)}?x=1`);
      setResult(r);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function updateStatus() {
    setErr("");
    try {
      const r = await postJson<any>(`/v1/offramp/status/${encodeURIComponent(payoutId)}`, { status });
      setResult(r);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main>
      <h2>Cashout Status</h2>

      <Card title="Payout lifecycle" right={<Badge text="Ops" />}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={payoutId} onChange={(e) => setPayoutId(e.target.value)} placeholder="payoutId" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>pending</option>
            <option>processing</option>
            <option>settled</option>
            <option>failed</option>
          </select>
          <button onClick={fetchStatus}>Fetch status</button>
          <button onClick={updateStatus}>Update status</button>
        </div>
        <Hint text="Allowed transitions: pending → processing → settled/failed" />
      </Card>

      <ErrorText text={err} />

      <Card title="Result">
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </Card>
    </main>
  );
}
