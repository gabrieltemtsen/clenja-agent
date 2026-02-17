export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787";

export async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const body = await r.json();
      if (body?.error) msg = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
      if (body?.reply) msg = body.reply;
    } catch { }
    throw new Error(msg);
  }
  return r.json();
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const b = await r.json();
      if (b?.error) msg = typeof b.error === "string" ? b.error : JSON.stringify(b.error);
      if (b?.reply) msg = b.reply;
    } catch { }
    throw new Error(msg);
  }
  return r.json();
}
