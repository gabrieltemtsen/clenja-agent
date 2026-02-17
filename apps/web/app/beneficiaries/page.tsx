"use client";

import { useState } from "react";
import { getJson, postJson } from "../lib/api";
import { GlassCard, Badge, ErrorText, Hint, EmptyState, Spinner, IconRefresh } from "../components";

const COUNTRIES: Record<string, string> = { NG: "🇳🇬 Nigeria", KE: "🇰🇪 Kenya", GH: "🇬🇭 Ghana", ZA: "🇿🇦 South Africa" };

export default function BeneficiariesPage() {
  const [userId, setUserId] = useState("tg:123");
  const [country, setCountry] = useState("NG");
  const [bankName, setBankName] = useState("GTBank");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function createBeneficiary() {
    if (!accountName.trim() || !accountNumber.trim()) {
      setErr("Please fill in all fields.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await postJson("/v1/beneficiaries", { userId, country, bankName, accountName, accountNumber });
      setAccountName("");
      setAccountNumber("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await getJson<any>(`/v1/beneficiaries?userId=${encodeURIComponent(userId)}`);
      setList(r.data?.beneficiaries || r.beneficiaries || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? list.filter((b) =>
      b.accountName.toLowerCase().includes(search.toLowerCase()) ||
      b.bankName.toLowerCase().includes(search.toLowerCase())
    )
    : list;

  return (
    <main>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Beneficiaries</h1>
            <p className="page-subtitle">Manage bank accounts for cashout operations</p>
          </div>
          <Badge text={`${list.length} saved`} tone={list.length > 0 ? "good" : "neutral"} />
        </div>
      </div>

      {/* Add form */}
      <GlassCard title="Add Beneficiary" right={<Badge text="Bank rails" tone="info" />} style={{ marginBottom: 20 }}>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="input-group">
            <label className="input-label">User ID</label>
            <input className="input" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="tg:123" />
          </div>
          <div className="input-group">
            <label className="input-label">Country</label>
            <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {Object.entries(COUNTRIES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Bank Name</label>
            <input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="GTBank" />
          </div>
          <div className="input-group">
            <label className="input-label">Account Name</label>
            <input className="input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="input-group" style={{ gridColumn: "1 / -1" }}>
            <label className="input-label">Account Number</label>
            <input className="input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" />
          </div>
        </div>
        <div className="flex-row" style={{ marginTop: 16, gap: 10 }}>
          <button className="btn btn-primary" onClick={createBeneficiary} disabled={saving}>
            {saving ? <Spinner /> : "Save Beneficiary"}
          </button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? <Spinner /> : <><IconRefresh /> Refresh</>}
          </button>
        </div>
        <Hint text="Saved beneficiaries are used in chat commands like: cashout 50 cUSD to Gabriel" />
      </GlassCard>

      {err && <div style={{ marginBottom: 16 }}><ErrorText text={err} /></div>}

      {/* List */}
      <GlassCard title={`Saved Beneficiaries (${filtered.length})`}>
        {list.length > 3 && (
          <div style={{ marginBottom: 14 }}>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or bank..."
              style={{ maxWidth: 360 }}
            />
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="flex-col" style={{ gap: 8 }}>
            {filtered.map((b, i) => (
              <div key={b.id} className="beneficiary-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="beneficiary-avatar">
                  {getInitials(b.accountName)}
                </div>
                <div className="beneficiary-info">
                  <div className="beneficiary-name">{b.accountName}</div>
                  <div className="beneficiary-detail">
                    {b.bankName} · {COUNTRIES[b.country] || b.country} · ****{b.accountNumberLast4 || b.accountNumberMasked?.slice(-4)}
                  </div>
                </div>
                <Badge text={b.country} tone="neutral" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🏦"
            title="No beneficiaries yet"
            description="Add a bank account above to use for cashout operations."
          />
        )}
      </GlassCard>
    </main>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
