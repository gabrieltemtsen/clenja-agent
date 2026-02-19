"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

/* ── SVG Icons (inline to avoid dependencies) ────── */
export function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
export function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
export function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
export function IconCashout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
export function IconScript() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
export function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
export function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
export function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}
export function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
export function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
export function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
export function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
export function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
export function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
export function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
export function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
export function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
export function IconActivity() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

/* ── Navigation Links ─────────────────────────────── */
const NAV_LINKS = [
  { href: "/", label: "Home", icon: IconHome, section: "main" },
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard, section: "main" },
  { href: "/agent", label: "Agent Chat", icon: IconChat, section: "main" },
  { href: "/beneficiaries", label: "Beneficiaries", icon: IconUsers, section: "operations" },
  { href: "/cashout-status", label: "Cashout Status", icon: IconCashout, section: "operations" },
  { href: "/demo-script", label: "Demo Script", icon: IconScript, section: "other" },
];

/* ── Sidebar ──────────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();
  const mainLinks = NAV_LINKS.filter((l) => l.section === "main");
  const opsLinks = NAV_LINKS.filter((l) => l.section === "operations");
  const otherLinks = NAV_LINKS.filter((l) => l.section === "other");

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">C</div>
          <div>
            <div className="sidebar-logo-text">CLENJA</div>
            <div className="sidebar-logo-tag">Agentic Finance</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigate</div>
        {mainLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`sidebar-link ${pathname === link.href ? "active" : ""}`}>
            <span className="sidebar-link-icon"><link.icon /></span>
            {link.label}
          </Link>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>Operations</div>
        {opsLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`sidebar-link ${pathname === link.href ? "active" : ""}`}>
            <span className="sidebar-link-icon"><link.icon /></span>
            {link.label}
          </Link>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>Resources</div>
        {otherLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`sidebar-link ${pathname === link.href ? "active" : ""}`}>
            <span className="sidebar-link-icon"><link.icon /></span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <WalletButton />
        <div className="sidebar-badge" style={{ marginTop: 10 }}>
          <span className="sidebar-badge-dot" />
          Celo Mainnet
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile Navigation ────────────────────────────── */
export function MobileNav() {
  const pathname = usePathname();
  const mobileLinks = NAV_LINKS.filter((l) => l.section !== "other").slice(0, 5);

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <div className="sidebar-logo-icon" style={{ width: 30, height: 30, fontSize: 13 }}>C</div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>CLENJA</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="sidebar-badge" style={{ fontSize: 10 }}>
            <span className="sidebar-badge-dot" />
            Celo
          </div>
          <WalletButton />
        </div>
      </header>
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          {mobileLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`mobile-nav-item ${pathname === link.href ? "active" : ""}`}>
              <span className="mobile-nav-icon"><link.icon /></span>
              <span>{link.label.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

/* ── Shared UI Components ─────────────────────────── */
export function GlassCard({
  title,
  subtitle,
  children,
  right,
  className = "",
  glow = false,
  style,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`glass-card ${glow ? "glow" : ""} ${className}`} style={style}>
      {(title || right) && (
        <div className="glass-card-header">
          <div>
            {title && <h3 className="glass-card-title">{title}</h3>}
            {subtitle && <p className="glass-card-subtitle">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  iconColor = "green",
  change,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconColor?: "green" | "blue" | "purple" | "amber" | "cyan" | "red";
  change?: { text: string; positive: boolean };
  delay?: number;
}) {
  return (
    <div className="stat-card" style={{ animationDelay: `${delay * 0.1}s` }}>
      {icon && <div className={`stat-card-icon ${iconColor}`}>{icon}</div>}
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {change && (
        <div className={`stat-card-change ${change.positive ? "positive" : "negative"}`}>
          {change.positive ? "↑" : "↓"} {change.text}
        </div>
      )}
    </div>
  );
}

export function Badge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {text}
    </span>
  );
}

export function Hint({ text }: { text: string }) {
  return (
    <p className="hint">
      <span className="hint-icon"><IconInfo /></span>
      {text}
    </p>
  );
}

export function ErrorText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="error-box">
      <span style={{ marginTop: 1 }}>⚠</span>
      {text}
    </div>
  );
}

export function Spinner({ size = "default" }: { size?: "default" | "lg" }) {
  return <div className={`spinner ${size === "lg" ? "spinner-lg" : ""}`} />;
}

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-description">{description}</div>
    </div>
  );
}

export function TokenPill({ token, amount }: { token: string; amount: string }) {
  const isStable = token.toLowerCase().includes("usd");
  return (
    <span className="token-pill">
      <span className={`token-icon ${isStable ? "cusd" : "celo"}`}>
        {isStable ? "$" : "C"}
      </span>
      {amount} {token}
    </span>
  );
}

/* ── Legacy compat (old components.tsx references) ── */
export function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <GlassCard title={title} right={right}>{children}</GlassCard>;
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return <StatCard label={label} value={value} />;
}
