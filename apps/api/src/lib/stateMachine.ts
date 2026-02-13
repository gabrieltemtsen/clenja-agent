import { randomUUID } from "node:crypto";
import { store } from "./store.js";

type ChallengeType = "new_recipient_last4" | "cashout_otp";
type ChallengeStatus = "pending" | "verified" | "expired";

export type Challenge = {
  id: string;
  userId: string;
  type: ChallengeType;
  expected: string;
  status: ChallengeStatus;
  createdAt: number;
  expiresAt: number;
  context: Record<string, unknown>;
};

export function createChallenge(input: {
  userId: string;
  type: ChallengeType;
  expected: string;
  ttlSeconds?: number;
  context?: Record<string, unknown>;
}) {
  const now = Date.now();
  const ttl = (input.ttlSeconds ?? 300) * 1000;
  const challenge: Challenge = {
    id: `ch_${randomUUID()}`,
    userId: input.userId,
    type: input.type,
    expected: input.expected,
    status: "pending",
    createdAt: now,
    expiresAt: now + ttl,
    context: input.context ?? {},
  };
  store.putChallenge(challenge);
  return challenge;
}

export function verifyChallenge(challengeId: string, answer: string) {
  const ch = store.getChallenge(challengeId);
  if (!ch) return { ok: false as const, reason: "not_found" };
  if (Date.now() > ch.expiresAt) {
    ch.status = "expired";
    store.putChallenge(ch);
    return { ok: false as const, reason: "expired" };
  }
  if (ch.status !== "pending") return { ok: false as const, reason: "not_pending" };
  if (String(answer).trim() !== String(ch.expected).trim()) return { ok: false as const, reason: "invalid_answer" };

  ch.status = "verified";
  store.putChallenge(ch);
  return { ok: true as const, challenge: ch };
}

export function getChallenge(id: string) {
  return store.getChallenge(id);
}
