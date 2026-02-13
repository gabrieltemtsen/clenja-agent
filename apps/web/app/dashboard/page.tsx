"use client";

import { useState } from "react";
import { getJson } from "../lib/api";
import { Card, ErrorText, Hint } from "../components";

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
      <Card title="Overview Loader">
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
        <button onClick={load} style={{ marginLeft: 8 }}>Load</button>
        <Hint text="Use this for judge demo to show wallet + receipts + cashouts in one shot." />
      </Card>
      <ErrorText text={err} />
      {data && <Card title="Response"><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre></Card>}
    </main>
  );
}
