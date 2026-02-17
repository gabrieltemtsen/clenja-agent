"use client";

import { useMemo, useState } from "react";
import { getJson } from "../lib/api";
import { GlassCard, StatCard, Badge, ErrorText, Hint, TokenPill, Spinner, EmptyState, IconWallet, IconActivity, IconCashout, IconShield, IconRefresh } from "../components";

export default function DashboardPage() {
  const [userId, setUserId] = useState("tg:123");
  const [data, setData] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        getJson<any>(`/v1/dashboard/overview?userId=${encodeURIComponent(userId)}`),
        getJson<any>(`/v1/readiness`),
      ]);
      setData(d);
      setReadiness(r);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const balances = data?.balance?.balances ?? [];
    const receipts = data?.receipts ?? [];
    const cashouts = data?.cashouts ?? [];
    return {
      balances,
      receiptsCount: receipts.length,
      cashoutsCount: cashouts.length,
      latestCashoutStatus: cashouts[0]?.status || "none",
      receipts: receipts.slice(0, 8),
      cashouts: cashouts.slice(0, 5),
    };
  }, [data]);

  return (
    <main>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Monitor your wallet, transactions, and system health</p>
          </div>
          <Badge text={data ? "Live data" : "Not loaded"} tone={data ? "good" : "neutral"} />
        </div>
      </div>

      {/* User selector */}
      <GlassCard style={{ marginBottom: 20 }}>
        <div className="flex-row flex-wrap gap-sm">
          <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="input-label">User ID</label>
            <input className="input" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. tg:123" />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading} style={{ alignSelf: "flex-end" }}>
            {loading ? <Spinner /> : <><IconRefresh /> Load Overview</>}
          </button>
        </div>
        <Hint text="Enter a user ID to load wallet balances, transaction receipts, and cashout history." />
      </GlassCard>

      {err && <div style={{ marginBottom: 16 }}><ErrorText text={err} /></div>}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Tokens"
          value={summary.balances.length}
          icon={<IconWallet />}
          iconColor="green"
          delay={0}
        />
        <StatCard
          label="Transactions"
          value={summary.receiptsCount}
          icon={<IconActivity />}
          iconColor="blue"
          delay={1}
        />
        <StatCard
          label="Cashouts"
          value={summary.cashoutsCount}
          icon={<IconCashout />}
          iconColor="purple"
          delay={2}
        />
        <StatCard
          label="System Status"
          value={readiness?.ok ? "Healthy" : "—"}
          icon={<IconShield />}
          iconColor={readiness?.ok ? "green" : "amber"}
          delay={3}
        />
      </div>

      {/* Token balances */}
      {summary.balances.length > 0 && (
        <GlassCard title="Token Balances" right={<Badge text="Wallet" tone="good" />} style={{ marginBottom: 20 }}>
          <div className="flex-row flex-wrap" style={{ gap: 12 }}>
            {summary.balances.map((b: any, i: number) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 20px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                flex: "1 1 200px",
              }}>
                <TokenPill token={b.token} amount={b.amount} />
                {b.usd && <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>≈ ${b.usd}</span>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="grid-2">
        {/* Readiness */}
        <GlassCard
          title="System Readiness"
          right={<Badge text={readiness?.ok ? "All systems go" : "Unknown"} tone={readiness?.ok ? "good" : "neutral"} />}
        >
          {readiness ? (
            <div className="flex-col" style={{ gap: 8 }}>
              {Object.entries(readiness.providers || {}).map(([name, status]: any) => (
                <div key={name} className="flex-between" style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                  <Badge text={status.ok ? "OK" : "Down"} tone={status.ok ? "good" : "bad"} />
                </div>
              ))}
              {!readiness.providers && <pre style={{ margin: 0 }}>{JSON.stringify(readiness, null, 2)}</pre>}
            </div>
          ) : (
            <EmptyState icon="🔌" title="Not loaded" description="Click Load Overview to check system status." />
          )}
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard
          title="Recent Activity"
          right={<Badge text={`${summary.receiptsCount} txns`} tone="info" />}
        >
          {summary.receipts.length > 0 ? (
            <div className="flex-col" style={{ gap: 6 }}>
              {summary.receipts.map((r: any, i: number) => (
                <div key={i} className="flex-between" style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  animation: `fadeInUp 0.3s ease-out ${i * 0.05}s both`,
                }}>
                  <div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      color: r.kind === "send" ? "var(--accent-blue)" : r.kind === "swap" ? "var(--accent-purple)" : "var(--accent-amber)",
                    }}>
                      {r.kind}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>
                      {r.amount} {r.token}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                    {r.ref?.slice(0, 10)}...
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📋" title="No activity" description="Transactions will appear here after loading." />
          )}
        </GlassCard>
      </div>
    </main>
  );
}
