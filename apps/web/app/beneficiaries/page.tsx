"use client";

import { useState } from "react";
import { getJson, postJson } from "../lib/api";
import { Badge, Card, ErrorText, Hint } from "../components";

export default function BeneficiariesPage() {
  const [userId, setUserId] = useState("tg:123");
  const [country, setCountry] = useState("NG");
  const [bankName, setBankName] = useState("GTBank");
  const [accountName, setAccountName] = useState("Gabriel");
  const [accountNumber, setAccountNumber] = useState("0123456789");
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState("");

  async function createBeneficiary() {
    setErr("");
    try {
      await postJson("/v1/beneficiaries", { userId, country, bankName, accountName, accountNumber });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function load() {
    setErr("");
    try {
      const r = await getJson<any>(`/v1/beneficiaries?userId=${encodeURIComponent(userId)}`);
      setList(r.data?.beneficiaries || r.beneficiaries || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main>
      <h2>Beneficiaries</h2>
      <Card title="Add beneficiary" right={<Badge text="Bank rails" tone="good" />}>
        <div className="grid-2">
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="country" />
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="bank name" />
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="account name" />
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="account number" />
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button onClick={createBeneficiary}>Save beneficiary</button>
          <button onClick={load}>Refresh list</button>
        </div>
        <Hint text="Saved beneficiaries are used in chat commands like: cashout 50 cUSD to Gabriel" />
      </Card>

      <ErrorText text={err} />

      <Card title={`Saved beneficiaries (${list.length})`}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Bank</th>
              <th>Country</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <td>{b.accountName}</td>
                <td>{b.bankName}</td>
                <td>{b.country}</td>
                <td>{b.accountNumberMasked}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={4} style={{ color: "#9db0d1" }}>No beneficiaries saved yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
