"use client";

import { useState } from "react";
import { getJson } from "../lib/api";

export default function DashboardPage() {
  const [userId, setUserId] = useState("tg:123");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const d = await getJson<any>(`/v1/dashboard/overview?userId=${encodeURIComponent(userId)}`);
      setData(d);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main>
      <h2>Dashboard</h2>
      <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
      <button onClick={load} style={{ marginLeft: 8 }}>Load</button>
      {err && <p style={{ color: "#ff8080" }}>{err}</p>}
      {data && <pre style={{ whiteSpace: "pre-wrap", background: "#11182f", padding: 12, borderRadius: 8 }}>{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
