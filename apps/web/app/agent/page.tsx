"use client";

import { useState } from "react";
import { postJson } from "../lib/api";

export default function AgentPage() {
  const [userId, setUserId] = useState("tg:123");
  const [text, setText] = useState("cashout 50 cUSD");
  const [challengeId, setChallengeId] = useState("");
  const [answer, setAnswer] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState("");

  async function sendMessage() {
    setError("");
    try {
      const r = await postJson<any>("/v1/chat/message", { userId, text });
      setResponse(r);
      if (r.challengeId) setChallengeId(r.challengeId);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function confirm() {
    setError("");
    try {
      const r = await postJson<any>("/v1/chat/confirm", { userId, challengeId, answer });
      setResponse(r);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main>
      <h2>Agent Chat Playground</h2>
      <p>Test natural-language actions and confirmation flow from web.</p>

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="message" />
      </div>
      <button onClick={sendMessage} style={{ marginTop: 8 }}>Send message</button>

      <h3 style={{ marginTop: 20 }}>Confirm Action</h3>
      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input value={challengeId} onChange={(e) => setChallengeId(e.target.value)} placeholder="challengeId" />
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="answer" />
      </div>
      <button onClick={confirm} style={{ marginTop: 8 }}>Confirm</button>

      {error && <p style={{ color: "#ff8080" }}>{error}</p>}
      <pre style={{ whiteSpace: "pre-wrap", background: "#11182f", padding: 12, borderRadius: 8 }}>{JSON.stringify(response, null, 2)}</pre>
    </main>
  );
}
