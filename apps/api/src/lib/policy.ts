import { store } from "./store.js";

export type PolicyCheckInput = {
  userId: string;
  action: "send" | "cashout";
  amount: number;
  token: "CELO" | "cUSD";
  recipient?: string;
};

const DAILY_LIMIT_USD = 200;
const PER_TX_LIMIT_USD = 50;

export function getUserPolicy(userId: string) {
  return store.getUserPolicy(userId) || { userId, dailyLimitUsd: DAILY_LIMIT_USD, perTxLimitUsd: PER_TX_LIMIT_USD, paused: false, updatedAt: Date.now() };
}

export function checkPolicy(input: PolicyCheckInput) {
  if (input.amount <= 0) return { ok: false as const, reason: "invalid_amount" };
  const policy = getUserPolicy(input.userId);
  if (policy.paused) return { ok: false as const, reason: "sending_paused" };
  if (input.amount > policy.perTxLimitUsd) return { ok: false as const, reason: "over_per_tx_limit" };

  const key = `${input.userId}:${new Date().toISOString().slice(0, 10)}`;
  const used = store.policyGet(key);
  if (used + input.amount > policy.dailyLimitUsd) return { ok: false as const, reason: "over_daily_limit" };

  return { ok: true as const };
}

export function recordPolicySpend(userId: string, amount: number) {
  const key = `${userId}:${new Date().toISOString().slice(0, 10)}`;
  const current = store.policyGet(key);
  store.policySet(key, current + amount);
}
