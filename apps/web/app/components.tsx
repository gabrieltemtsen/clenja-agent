export function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Hint({ text }: { text: string }) {
  return <p className="hint">{text}</p>;
}

export function ErrorText({ text }: { text: string }) {
  if (!text) return null;
  return <p className="error">{text}</p>;
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export function Badge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  return <span className={`status ${tone}`}>{text}</span>;
}
