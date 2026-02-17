"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { postJson } from "../lib/api";
import { GlassCard, Badge, Hint, IconSend, IconClock } from "../components";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  time: string;
  data?: any;
  challengeId?: string;
}

const SUGGESTIONS = [
  "What's my balance?",
  "Send 5 cUSD to 0xabc...1234",
  "Cashout 50 cUSD",
  "Show my history",
  "List recipients",
  "Set daily limit 100",
  "Swap 10 CELO to cUSD",
  "Help",
];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AgentPage() {
  const [userId, setUserId] = useState("tg:123");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "agent", text: "Hey 👋 I'm CLENJA, your agentic finance assistant. Ask me to check balance, send funds, swap tokens, or cashout to your bank.", time: getTime() },
  ]);
  const [loading, setLoading] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: msg, time: getTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // If there's a pending challenge and it looks like a confirmation answer
      if (pendingChallenge && msg.length <= 6) {
        const r = await postJson<any>("/v1/chat/confirm", { userId, challengeId: pendingChallenge, answer: msg });
        const agentMsg: Message = { id: `a-${Date.now()}`, role: "agent", text: r.reply || JSON.stringify(r), time: getTime(), data: r };
        setMessages((prev) => [...prev, agentMsg]);
        setPendingChallenge(null);
      } else {
        const r = await postJson<any>("/v1/chat/message", { userId, text: msg });
        const agentMsg: Message = {
          id: `a-${Date.now()}`,
          role: "agent",
          text: r.reply || JSON.stringify(r),
          time: getTime(),
          data: r,
          challengeId: r.challengeId,
        };
        setMessages((prev) => [...prev, agentMsg]);
        if (r.challengeId) setPendingChallenge(r.challengeId);
      }
    } catch (e: any) {
      const errMsg: Message = { id: `e-${Date.now()}`, role: "agent", text: `⚠ Error: ${e.message}`, time: getTime() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Agent Chat</h1>
            <p className="page-subtitle">Talk to CLENJA using natural language</p>
          </div>
          <div className="flex-row gap-sm">
            <div className="input-group">
              <input
                className="input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="userId"
                style={{ width: 140, fontSize: 12, padding: "6px 10px" }}
              />
            </div>
            <Badge text={pendingChallenge ? "Challenge pending" : "Ready"} tone={pendingChallenge ? "warn" : "good"} />
          </div>
        </div>
      </div>

      {/* Chat container */}
      <GlassCard className="chat-container" style={{ padding: 0 }}>
        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
              <div className="chat-bubble-meta">
                <IconClock /> {msg.time}
              </div>
              {msg.challengeId && (
                <div style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  background: "rgba(245, 166, 35, 0.08)",
                  border: "1px solid rgba(245, 166, 35, 0.2)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  color: "var(--accent-amber)",
                }}>
                  ⚡ Confirmation required — type your answer below
                </div>
              )}
              {msg.data?.txHash && (
                <a
                  href={msg.data.txUrl || `https://celoscan.io/tx/${msg.data.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", marginTop: 6, fontSize: 11, padding: "4px 10px",
                    background: "rgba(53, 208, 127, 0.08)", border: "1px solid rgba(53, 208, 127, 0.2)",
                    borderRadius: "var(--radius-full)", color: "var(--brand)",
                  }}
                >
                  View on CeloScan →
                </a>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble agent" style={{ display: "flex", gap: 6, padding: "14px 20px" }}>
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button key={s} className="chat-suggestion-chip" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="chat-input-bar">
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingChallenge ? "Type your confirmation code..." : "Ask CLENJA anything..."}
            disabled={loading}
            autoFocus
          />
          <button className="chat-send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            <IconSend />
          </button>
        </div>
      </GlassCard>

      <Hint text="Examples: balance · history · cashout 50 cUSD · send 5 cUSD to 0xabc1234 · swap 10 CELO to cUSD · set daily limit 100" />
    </main>
  );
}
