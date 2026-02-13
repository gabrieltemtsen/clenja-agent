"use client";

import { useMemo, useState } from "react";
import { getJson } from "../lib/api";
import { Badge, Card, ErrorText, Hint, Stat } from "../components";

export default function DashboardPage() {
  const [userId, setUserId] = useState("tg:123");
  const [data, setData] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const [d, r] = await Promise.all([
        getJson<any>(`/v1/dashboard/overview?userId=${encodeURIComponent(userId)}`),
        getJson<any>(`/v1/readiness`),
      ]);
      setData(d);
      setReadiness(r);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const summary = useMemo(() => {
    const balances = data?.balance?.balances ?? [];
    const receipts = data?.receipts ?? [];
    const cashouts = data?.cashouts ?? [];
    return {
      balancesCount: balances.length,
      receiptsCount: receipts.length,
      cashoutsCount: cashouts.length,
      latestCashoutStatus: cashouts[0]?.status || "none",
    };
  }, [data]);

  return (
    <main>
      <h2>Dashboard</h2>
      <Card title="Overview Loader" right={<Badge text="Live data" tone="good" />}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
          <button onClick={load}>Load overview</button>
        </div>
        <Hint text="Loads wallet state, receipts, cashouts, and provider readiness." />
      </Card>

      <ErrorText text={err} />

      <div className="stats">
        <Stat label="Balances" value={summary.balancesCount} />
        <Stat label="Receipts" value={summary.receiptsCount} />
        <Stat label="Cashouts" value={summary.cashoutsCount} />
      </div>

      <div className="grid-2">
        <Card
          title="System Readiness"
          right={<Badge text={readiness?.ok ? "healthy" : "degraded"} tone={readiness?.ok ? "good" : "warn"} />}
        >
          <pre>{JSON.stringify(readiness, null, 2)}</pre>
        </Card>

        <Card title="Latest Activity" right={<Badge text={summary.latestCashoutStatus} tone={summary.latestCashoutStatus === "settled" ? "good" : "neutral"} />}>
          <pre>{JSON.stringify({ receipts: data?.receipts?.slice(0, 5) ?? [], cashouts: data?.cashouts?.slice(0, 5) ?? [] }, null, 2)}</pre>
        </Card>
      </div>
    </main>
  );
}
