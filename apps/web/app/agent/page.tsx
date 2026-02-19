"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { postJson } from "../lib/api";
import { GlassCard, Badge, Hint, IconSend, IconClock, IconWallet } from "../components";
import { TxSigningModal, type TxStep } from "../TxSigningModal";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  time: string;
  data?: any;
  challengeId?: string;
  actions?: { label: string, value: string }[];
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
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  // userId is derived from the connected wallet, or falls back to "anon"
  const userId = isConnected && address ? `wallet:${address.toLowerCase()}` : "anon";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      text: "Hey 👋 I'm CLENJA, your agentic finance assistant. Connect your wallet to get started, or ask me anything — balance checks, swaps, sends, and cashouts are all supported.",
      time: getTime(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<string | null>(null);

  // Client-side signing state
  const [signingSteps, setSigningSteps] = useState<TxStep[]>([]);
  const [isSigningOpen, setIsSigningOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // When wallet connects/disconnects, announce it in chat
  const prevAddress = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (address && address !== prevAddress.current) {
      const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
      if (prevAddress.current !== undefined || address) {
        setMessages((prev) => [
          ...prev,
          {
            id: `wallet-connected-${Date.now()}`,
            role: "agent",
            text: `✅ Wallet connected: ${short}\nYour conversations and history are now tied to your address. What would you like to do?`,
            time: getTime(),
          },
        ]);
      }
    }
    if (!address && prevAddress.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: `wallet-disconnected-${Date.now()}`,
          role: "agent",
          text: "Wallet disconnected. Reconnect anytime to resume your session.",
          time: getTime(),
        },
      ]);
    }
    prevAddress.current = address;
  }, [address]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: msg, time: getTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Check if message is a fallback trigger
      const isAgentFallback = msg.toLowerCase().includes("agent wallet") || msg.toLowerCase().includes("server");

      if (pendingChallenge && (msg.length <= 6 || isAgentFallback)) {
        // CHALLENGE RESPONSE

        // If wallet is connected, try to build tx for client-side signing first
        // Skip if user explicitly asks to use agent wallet
        if (userId.startsWith("wallet:") && address && !isAgentFallback && ["send", "swap"].some(k => messages[messages.length - 1].data?.kind === k || messages[messages.length - 1].text.toLowerCase().includes(k))) {
          // We infer typical actions, but safer to check `build-tx` response.

          try {
            // 1. Try to build tx
            const buildRes = await postJson<any>("/v1/chat/build-tx", {
              userId,
              challengeId: pendingChallenge,
              answer: msg,
              userAddress: address,
            });

            if (buildRes.steps && buildRes.steps.length > 0) {
              // 2. Client-side signing path
              setSigningSteps(buildRes.steps);
              setIsSigningOpen(true);
              setLoading(false); // Stop "typing" animation while modal handles it
              return; // Exit here, modal callback handles the rest
            }

            // If steps empty (e.g. error or unsupported action like cashout), falls through to standard confirm
          } catch (e: any) {
            console.warn("Build tx failed", e);
            if (e.message && e.message.includes("insufficient_funds_client")) {
              const errMsg: Message = {
                id: `err-fund-${Date.now()}`,
                role: "agent",
                text: "You don't have enough funds in your connected wallet to sign this.\n\nHowever, your Agent Wallet has funds. Would you like me to execute it via the server?",
                time: getTime(),
                actions: [{ label: "Use Agent Wallet", value: "Use Agent Wallet" }]
              };
              setMessages(prev => [...prev, errMsg]);
              setLoading(false);
              return; // Stop here, let user reply
            }
            // Fall through to standard /confirm
          }
        }

        // Standard server-side execution (legacy or cashout)
        // If message is "Use Agent Wallet", we need to supply the original answer code.
        let finalAnswer = msg;
        if (isAgentFallback) {
          // Find the last user message that looked like a code
          const lastCodeMsg = messages.slice().reverse().find(m => m.role === "user" && m.text.length <= 6 && /^\d+$/.test(m.text));
          if (lastCodeMsg) finalAnswer = lastCodeMsg.text;
          else finalAnswer = "000000"; // Trigger explicit failure if code lost
        }

        const r = await postJson<any>("/v1/chat/confirm", {
          userId,
          challengeId: pendingChallenge,
          answer: finalAnswer,
        });
        const agentMsg: Message = {
          id: `a-${Date.now()}`,
          role: "agent",
          text: r.reply || JSON.stringify(r),
          time: getTime(),
          data: r,
        };
        setMessages((prev) => [...prev, agentMsg]);
        setPendingChallenge(null);
      } else {
        // NORMAL MESSAGE
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
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: "agent",
        text: `⚠ Error: ${e.message}`,
        time: getTime(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      // Only reset loading if we didn't exit early for signing modal
      if (!isSigningOpen) setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSigningComplete(lastTxHash: string) {
    setIsSigningOpen(false);
    setPendingChallenge(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `tx-${Date.now()}`,
        role: "agent",
        text: "✅ Transaction signed and broadcast successfully!",
        time: getTime(),
        data: { txHash: lastTxHash },
      }
    ]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main>
      {isSigningOpen && (
        <TxSigningModal
          userId={userId}
          steps={signingSteps}
          onComplete={handleSigningComplete}
          onCancel={() => {
            setIsSigningOpen(false);
            setLoading(false);
            setMessages(prev => [...prev, { id: `cancel-${Date.now()}`, role: "agent", text: "Transaction cancelled.", time: getTime() }]);
          }}
        />
      )}

      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Agent Chat</h1>
            <p className="page-subtitle">Talk to CLENJA using natural language</p>
          </div>
          <div className="flex-row gap-sm" style={{ alignItems: "center" }}>
            {/* Wallet identity indicator */}
            {isConnected && address ? (
              <div className="wallet-identity-badge">
                <span className="wallet-identity-dot" />
                <span className="wallet-identity-text">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                className="wallet-connect-prompt-btn"
                onClick={openConnectModal}
                type="button"
              >
                <IconWallet />
                Connect Wallet
              </button>
            )}
            <Badge
              text={pendingChallenge ? "Challenge entry" : "Ready"}
              tone={pendingChallenge ? "warn" : "good"}
            />
          </div>
        </div>
      </div>

      {/* Wallet nudge banner — shown only when not connected */}
      {!isConnected && (
        <div className="wallet-nudge-banner">
          <span className="wallet-nudge-icon">
            <IconWallet />
          </span>
          <div>
            <strong>Connect your wallet</strong> to enable onchain operations — balance
            checks, swaps, sends, and cashouts are tied to your wallet address.
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 13, padding: "6px 14px" }} onClick={openConnectModal}>
            Connect
          </button>
        </div>
      )}

      {/* Chat container */}
      <GlassCard className="chat-container" style={{ padding: 0 }}>
        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

              {msg.actions && (
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {msg.actions.map(action => (
                    <button key={action.label}
                      onClick={() => sendMessage(action.value)}
                      style={{
                        background: "rgba(53, 208, 127, 0.15)", border: "1px solid rgba(53, 208, 127, 0.3)",
                        color: "var(--brand)", padding: "6px 12px", borderRadius: "8px",
                        fontSize: 13, cursor: "pointer", fontWeight: 500
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="chat-bubble-meta">
                <IconClock /> {msg.time}
              </div>
              {msg.challengeId && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "rgba(245, 166, 35, 0.08)",
                    border: "1px solid rgba(245, 166, 35, 0.2)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    color: "var(--accent-amber)",
                  }}
                >
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
              {msg.data?.depositTxHash && (
                <a
                  href={`https://celoscan.io/tx/${msg.data.depositTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", marginTop: 6, fontSize: 11, padding: "4px 10px",
                    background: "rgba(79, 140, 255, 0.08)", border: "1px solid rgba(79, 140, 255, 0.2)",
                    borderRadius: "var(--radius-full)", color: "var(--accent-blue)",
                  }}
                >
                  Deposit Tx →
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
            placeholder={
              pendingChallenge
                ? "Type your confirmation code..."
                : "Ask CLENJA anything..."
            }
            disabled={loading}
            autoFocus
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            <IconSend />
          </button>
        </div>
      </GlassCard>

      <Hint text="Examples: balance · history · cashout 50 cUSD · send 5 cUSD to 0xabc1234 · swap 10 CELO to cUSD · set daily limit 100" />
    </main>
  );
}
