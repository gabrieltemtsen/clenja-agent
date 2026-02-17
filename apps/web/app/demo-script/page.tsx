import { GlassCard, Badge, IconChat, IconUsers, IconCashout, IconDashboard, IconZap, IconShield } from "../components";

const DEMO_STEPS = [
  {
    icon: <IconShield />,
    title: "Intro",
    time: "~20 seconds",
    description: "CLENJA is a Telegram-first agentic finance assistant on Celo with x402 infra endpoints. Explain the multi-track approach: real-world utility + reusable paid APIs.",
  },
  {
    icon: <IconChat />,
    title: "Agentic Chat Demo",
    time: "~60 seconds",
    description: "Navigate to Agent Playground. Submit natural language commands like 'cashout 50 cUSD' or 'send 5 cUSD to 0xabc'. Show challenge-based confirmation flow and response handling.",
  },
  {
    icon: <IconUsers />,
    title: "Beneficiaries Management",
    time: "~40 seconds",
    description: "Go to Beneficiaries page. Save a new beneficiary with bank details, then list saved beneficiaries. Show how chat references them: 'cashout 50 cUSD to Gabriel'.",
  },
  {
    icon: <IconCashout />,
    title: "Cashout Lifecycle",
    time: "~40 seconds",
    description: "Use the payoutId from the cashout in the Cashout Status page. Walk through the state machine: pending → processing → settled. Show the visual pipeline stepper.",
  },
  {
    icon: <IconDashboard />,
    title: "Dashboard Overview",
    time: "~30 seconds",
    description: "Load the dashboard overview. Show token balances, transaction receipts, cashout history, and system readiness indicators.",
  },
  {
    icon: <IconZap />,
    title: "Infra Angle — x402 APIs",
    time: "~30 seconds",
    description: "Show an x402-protected endpoint and explain the paid API model. Other agents/devs can consume wallet and cashout endpoints with automatic payment verification.",
  },
];

const TALKING_POINTS = [
  "Real-world utility + mobile-first UX for African users",
  "Trust and safety via policy engine and challenge confirmations",
  "Reusable infra via payment-gated APIs (x402)",
  "Africa-first cashout direction with provider adapter pattern",
  "Natural language intent parsing with no rigid command menus",
  "Immutable receipt and audit logging for all transactions",
];

export default function DemoScriptPage() {
  return (
    <main>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Demo Script</h1>
            <p className="page-subtitle">Judge presentation guide — 3-4 minute walkthrough</p>
          </div>
          <Badge text="3-4 min" tone="info" />
        </div>
      </div>

      {/* Steps */}
      <GlassCard style={{ marginBottom: 24 }}>
        <div className="flex-col" style={{ gap: 0 }}>
          {DEMO_STEPS.map((step, i) => (
            <div key={i} className="demo-step" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="demo-step-number">{i + 1}</div>
              <div className="demo-step-content">
                <div className="demo-step-title">{step.title}</div>
                <div className="demo-step-description">{step.description}</div>
                <div className="demo-step-time">⏱ {step.time}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Talking Points */}
      <GlassCard title="Key Talking Points" right={<Badge text="Prepare" tone="good" />}>
        <div className="callout" style={{ marginTop: 0 }}>
          <div className="callout-title">Expected Highlights</div>
          <ul className="callout-list">
            {TALKING_POINTS.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      </GlassCard>

      {/* Submission reminder */}
      <GlassCard title="Submission Checklist" right={<Badge text="Required" tone="warn" />} style={{ marginTop: 20 }}>
        <div className="flex-col" style={{ gap: 6 }}>
          {[
            "Karma project link",
            "Demo video link",
            "GitHub repo link",
            "Tweet tagging @Celo and @CeloDevs",
            "x402 endpoint evidence (402 → paid flow)",
            "Onchain tx/receipt examples",
            "Self unavailable-region screenshot",
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              fontSize: 13,
            }}>
              <span style={{
                width: 20, height: 20,
                borderRadius: 4,
                border: "2px solid var(--border-default)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color: "var(--text-tertiary)", fontSize: 11,
              }}>
                □
              </span>
              <span style={{ color: "var(--text-secondary)" }}>{item}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </main>
  );
}
