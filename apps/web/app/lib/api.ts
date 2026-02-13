export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787";

export async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP_${r.status}`);
  return r.json();
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP_${r.status}`);
  return r.json();
}
