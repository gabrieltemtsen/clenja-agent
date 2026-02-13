"use client";

import { useState } from "react";
import { getJson, postJson } from "../lib/api";

export default function BeneficiariesPage() {
  const [userId, setUserId] = useState("tg:123");
  const [country, setCountry] = useState("NG");
  const [bankName, setBankName] = useState("GTBank");
  const [accountName, setAccountName] = useState("Gabriel");
  const [accountNumber, setAccountNumber] = useState("0123456789");
  const [list, setList] = useState<any[]>([]);

  async function createBeneficiary() {
    await postJson("/v1/beneficiaries", { userId, country, bankName, accountName, accountNumber });
    await load();
  }

  async function load() {
    const r = await getJson<any>(`/v1/beneficiaries?userId=${encodeURIComponent(userId)}`);
    setList(r.beneficiaries || []);
  }

  return (
    <main>
      <h2>Beneficiaries</h2>
      <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="country" />
        <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="bankName" />
        <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="accountName" />
        <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="accountNumber" />
      </div>
      <button onClick={createBeneficiary} style={{ marginTop: 8, marginRight: 8 }}>Save beneficiary</button>
      <button onClick={load} style={{ marginTop: 8 }}>Refresh list</button>
      <pre style={{ whiteSpace: "pre-wrap", background: "#11182f", padding: 12, borderRadius: 8 }}>{JSON.stringify(list, null, 2)}</pre>
    </main>
  );
}
