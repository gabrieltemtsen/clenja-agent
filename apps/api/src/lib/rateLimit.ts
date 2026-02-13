type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

export function checkRateLimit(key: string) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true as const, remaining: MAX_PER_WINDOW - 1 };
  }
  if (b.count >= MAX_PER_WINDOW) {
    return { ok: false as const, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true as const, remaining: MAX_PER_WINDOW - b.count };
}
