import type { Response } from "express";

export function ok(res: Response, data: unknown, meta?: Record<string, unknown>) {
  return res.json({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function fail(res: Response, code: string, message: string, status = 400, details?: unknown) {
  return res.status(status).json({ ok: false, error: { code, message, details } });
}
