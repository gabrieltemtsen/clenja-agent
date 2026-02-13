export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#11182f", border: "1px solid #243053", borderRadius: 12, padding: 14, marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  );
}

export function Hint({ text }: { text: string }) {
  return <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{text}</p>;
}

export function ErrorText({ text }: { text: string }) {
  if (!text) return null;
  return <p style={{ color: "#ff8d8d", background: "#2a1010", padding: 8, borderRadius: 8 }}>{text}</p>;
}
