"use client";

import { useState } from "react";
import { postJson } from "../lib/api";
import { Badge, Card, ErrorText, Hint } from "../components";

export default function AgentPage() {
  const [userId, setUserId] = useState("tg:123");
  const [text, setText] = useState("cashout 50 cUSD to Gabriel");
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
      <Card title="Step 1: Ask CLENJA" right={<Badge text="NLP" tone="good" />}>
        <div className="grid-2">
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="message" />
        </div>
        <button onClick={sendMessage} style={{ marginTop: 10 }}>Send message</button>
        <Hint text="Examples: balance · history · cashout 50 cUSD to Gabriel · send 5 cUSD to 0xabc1234" />
      </Card>

      <Card title="Step 2: Confirm (if required)">
        <div className="grid-2">
          <input value={challengeId} onChange={(e) => setChallengeId(e.target.value)} placeholder="challengeId" />
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="answer" />
        </div>
        <button onClick={confirm} style={{ marginTop: 10 }}>Confirm</button>
      </Card>

      <ErrorText text={error} />
      <Card title="Response payload"><pre>{JSON.stringify(response, null, 2)}</pre></Card>
    </main>
  );
}
