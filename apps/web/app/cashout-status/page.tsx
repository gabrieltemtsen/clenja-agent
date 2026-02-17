"use client";

import { useState } from "react";
import { getJson, postJson } from "../lib/api";
import { GlassCard, Badge, ErrorText, Hint, EmptyState, Spinner, IconCheck, IconX } from "../components";

const STEPS = ["pending", "processing", "settled"] as const;

function getStepState(current: string, step: string) {
  const idx = STEPS.indexOf(step as any);
  const curIdx = STEPS.indexOf(current as any);
  if (current === "failed") return step === current ? "failed" : idx <= curIdx ? "completed" : "pending";
  if (idx < curIdx) return "completed";
  if (idx === curIdx) return "active";
  return "pending";
}

export default function CashoutStatusPage() {
  const [payoutId, setPayoutId] = useState("");
  const [status, setStatus] = useState("processing");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  async function fetchStatus() {
    if (!payoutId.trim()) { setErr("Please enter a payout ID."); return; }
    setErr("");
    setFetchLoading(true);
    try {
      const r = await getJson<any>(`/v1/offramp/status/${encodeURIComponent(payoutId)}?x=1`);
      setResult(r);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setFetchLoading(false);
    }
  }

  async function updateStatus() {
    if (!payoutId.trim()) { setErr("Please enter a payout ID."); return; }
    setErr("");
    setUpdateLoading(true);
    try {
      const r = await postJson<any>(`/v1/offramp/status/${encodeURIComponent(payoutId)}`, { status });
      setResult(r);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUpdateLoading(false);
    }
  }

  const currentStatus = result?.status || "";

  return (
    <main>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Cashout Status</h1>
            <p className="page-subtitle">Track and manage payout lifecycle transitions</p>
          </div>
          <Badge text="Operations" tone="info" />
        </div>
      </div>

      {/* Controls */}
      <GlassCard title="Payout Lifecycle" right={<Badge text="Ops" tone="neutral" />} style={{ marginBottom: 20 }}>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="input-group">
            <label className="input-label">Payout ID</label>
            <input className="input" value={payoutId} onChange={(e) => setPayoutId(e.target.value)} placeholder="po_abc123..." />
          </div>
          <div className="input-group">
            <label className="input-label">Target Status</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="settled">Settled</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        <div className="flex-row" style={{ marginTop: 16, gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchStatus} disabled={fetchLoading}>
            {fetchLoading ? <Spinner /> : "Fetch Status"}
          </button>
          <button className="btn btn-primary" onClick={updateStatus} disabled={updateLoading}>
            {updateLoading ? <Spinner /> : "Update Status"}
          </button>
        </div>
        <Hint text="Allowed transitions: pending → processing → settled/failed" />
      </GlassCard>

      {err && <div style={{ marginBottom: 16 }}><ErrorText text={err} /></div>}

      {/* Visual stepper */}
      {currentStatus && (
        <GlassCard title="Status Pipeline" style={{ marginBottom: 20 }}>
          <div className="stepper">
            {STEPS.map((step, i) => {
              const state = getStepState(currentStatus, step);
              return (
                <div key={step} className={`stepper-step ${state}`}>
                  <div className="stepper-circle">
                    {state === "completed" ? <IconCheck /> : state === "failed" ? <IconX /> : i + 1}
                  </div>
                  <div className="stepper-label">{step.charAt(0).toUpperCase() + step.slice(1)}</div>
                </div>
              );
            })}
            {currentStatus === "failed" && (
              <div className="stepper-step failed">
                <div className="stepper-circle"><IconX /></div>
                <div className="stepper-label">Failed</div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Result */}
      <GlassCard title="Result">
        {result ? (
          <div className="flex-col" style={{ gap: 12 }}>
            <div className="flex-between" style={{
              padding: "12px 16px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Payout ID</span>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: "var(--text-primary)" }}>{result.payoutId}</span>
            </div>
            <div className="flex-between" style={{
              padding: "12px 16px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Status</span>
              <Badge
                text={result.status}
                tone={result.status === "settled" ? "good" : result.status === "failed" ? "bad" : result.status === "processing" ? "info" : "warn"}
              />
            </div>
            {result.updatedAt && (
              <div className="flex-between" style={{
                padding: "12px 16px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Updated</span>
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{new Date(result.updatedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon="📦"
            title="No data yet"
            description="Enter a payout ID and click Fetch Status to view the current state."
          />
        )}
      </GlassCard>
    </main>
  );
}
