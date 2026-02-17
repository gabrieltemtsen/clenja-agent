import Link from "next/link";
import { IconChat, IconWallet, IconCashout, IconShield, IconZap, IconGlobe, IconArrowRight } from "./components";

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-badge">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#35D07F", animation: "pulse 2s ease-in-out infinite" }} />
          Live on Celo Mainnet
        </div>
        <h1 className="hero-title">
          <span className="hero-title-gradient">Agentic Finance</span>
          <br />
          for Africa
        </h1>
        <p className="hero-description">
          CLENJA is a Telegram-first AI finance assistant that handles wallet operations, cross-border cashouts, and cooperative savings — all through natural language on the Celo blockchain.
        </p>
        <div className="hero-actions">
          <Link href="/agent" className="btn btn-primary btn-lg" style={{ gap: 8 }}>
            Try Agent Chat <IconArrowRight />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary btn-lg">
            View Dashboard
          </Link>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────── */}
      <section className="stats-grid" style={{ marginTop: 48 }}>
        <div className="stat-card animate-fadeInUp delay-1">
          <div className="stat-card-icon green">🌍</div>
          <div className="stat-card-label">Supported Countries</div>
          <div className="stat-card-value">4</div>
          <div className="stat-card-change positive">NG, KE, GH, ZA</div>
        </div>
        <div className="stat-card animate-fadeInUp delay-2">
          <div className="stat-card-icon blue">💬</div>
          <div className="stat-card-label">Intents Supported</div>
          <div className="stat-card-value">15+</div>
          <div className="stat-card-change positive">NLP-powered</div>
        </div>
        <div className="stat-card animate-fadeInUp delay-3">
          <div className="stat-card-icon purple">🔒</div>
          <div className="stat-card-label">Security Layers</div>
          <div className="stat-card-value">6</div>
          <div className="stat-card-change positive">Challenge-verified</div>
        </div>
        <div className="stat-card animate-fadeInUp delay-4">
          <div className="stat-card-icon cyan">⚡</div>
          <div className="stat-card-label">x402 Endpoints</div>
          <div className="stat-card-value">7</div>
          <div className="stat-card-change positive">Payment-gated</div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section style={{ marginTop: 64 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>How It Works</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, marginTop: 8 }}>
            Natural language meets decentralized finance
          </p>
        </div>
        <div className="features-grid">
          <FeatureCard
            icon={<IconChat />}
            iconBg="rgba(53, 208, 127, 0.12)"
            iconColor="var(--brand)"
            title="Agentic Chat"
            description="Send natural language commands via Telegram. Balance checks, transfers, swaps, and cashouts — no rigid menus needed."
            delay={1}
          />
          <FeatureCard
            icon={<IconWallet />}
            iconBg="rgba(79, 140, 255, 0.12)"
            iconColor="var(--accent-blue)"
            title="Smart Wallet"
            description="Per-user wallets on Celo with CELO and cUSD support. Automated quote simulation before every transaction."
            delay={2}
          />
          <FeatureCard
            icon={<IconCashout />}
            iconBg="rgba(164, 95, 255, 0.12)"
            iconColor="var(--accent-purple)"
            title="Instant Cashout"
            description="Convert stablecoins to local currency across African corridors. Full lifecycle tracking from quote to settlement."
            delay={3}
          />
          <FeatureCard
            icon={<IconShield />}
            iconBg="rgba(245, 166, 35, 0.12)"
            iconColor="var(--accent-amber)"
            title="Policy & Safety"
            description="Challenge-based confirmations, daily spend caps, per-recipient limits, and immutable receipt logging."
            delay={4}
          />
          <FeatureCard
            icon={<IconZap />}
            iconBg="rgba(0, 212, 255, 0.12)"
            iconColor="var(--accent-cyan)"
            title="x402 Infra APIs"
            description="Payment-gated endpoints for other agents and developers. Monetize your wallet and cashout infrastructure."
            delay={5}
          />
          <FeatureCard
            icon={<IconGlobe />}
            iconBg="rgba(255, 95, 95, 0.12)"
            iconColor="var(--accent-red)"
            title="Africa-First"
            description="Designed for mobile-first African users. Support for NGN, KES, GHS, ZAR with local bank rails integration."
            delay={5}
          />
        </div>
      </section>

      {/* ── Architecture ──────────────────────────── */}
      <section style={{ marginTop: 64 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Architecture</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, marginTop: 8 }}>
            Modular, adapter-driven design for maximum flexibility
          </p>
        </div>
        <div className="glass-card" style={{ padding: 32 }}>
          <div className="flex-col" style={{ gap: 20 }}>
            <ArchLayer
              label="User Layer"
              items={["Telegram Bot", "WhatsApp (coming)", "Web Console"]}
              color="var(--brand)"
            />
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 20 }}>↓</div>
            <ArchLayer
              label="Agentic Layer"
              items={["Intent Parsing", "Policy Engine", "Challenge System", "Execution"]}
              color="var(--accent-blue)"
            />
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 20 }}>↓</div>
            <ArchLayer
              label="API Layer"
              items={["Chat Routes", "Wallet Routes", "Offramp Routes", "x402 Middleware"]}
              color="var(--accent-purple)"
            />
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 20 }}>↓</div>
            <ArchLayer
              label="Adapter Layer"
              items={["Wallet Provider (Para)", "Offramp Provider", "State Store"]}
              color="var(--accent-amber)"
            />
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────── */}
      <section style={{ textAlign: "center", padding: "64px 0 32px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Ready to explore?</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 24 }}>
          Start with the Agent Chat to see CLENJA in action.
        </p>
        <div className="hero-actions">
          <Link href="/agent" className="btn btn-primary btn-lg" style={{ gap: 8 }}>
            Open Agent Chat <IconArrowRight />
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div className={`feature-card animate-fadeInUp delay-${delay}`}>
      <div className="feature-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}

function ArchLayer({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: 1, textTransform: "uppercase", minWidth: 100 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: `color-mix(in srgb, ${color} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
