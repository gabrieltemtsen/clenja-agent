"use client";

import { useState } from "react";
import { getJson, postJson } from "../lib/api";

export default function CashoutStatusPage() {
  const [payoutId, setPayoutId] = useState("");
  const [status, setStatus] = useState("processing");
  const [result, setResult] = useState<any>(null);

  async function fetchStatus() {
    const r = await getJson<any>(`/v1/offramp/status/${encodeURIComponent(payoutId)}?x=1`);
    setResult(r);
  }

  async function updateStatus() {
    const r = await postJson<any>(`/v1/offramp/status/${encodeURIComponent(payoutId)}`, { status });
    setResult(r);
  }

  return (
    <main>
      <h2>Cashout Status</h2>
      <input value={payoutId} onChange={(e) => setPayoutId(e.target.value)} placeholder="payoutId" />
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginLeft: 8 }}>
        <option>pending</option><option>processing</option><option>settled</option><option>failed</option>
      </select>
      <div style={{ marginTop: 8 }}>
        <button onClick={fetchStatus}>Fetch status</button>
        <button onClick={updateStatus} style={{ marginLeft: 8 }}>Update status</button>
      </div>
      <pre style={{ whiteSpace: "pre-wrap", background: "#11182f", padding: 12, borderRadius: 8 }}>{JSON.stringify(result, null, 2)}</pre>
    </main>
  );
}
