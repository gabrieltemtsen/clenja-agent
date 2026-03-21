import { store } from "./store.js";

export type PolicyCheckInput = {
  userId: string;
  action: "send" | "cashout" | "swap";
  amount: number;
  token: "CELO" | "cUSD";
  recipient?: string;
};

// NOTE: These are "safety rails" limits, not onchain/provider limits.
// Current implementation treats `amount` as token units (not USD). Keep that in mind.
const DAILY_LIMIT_USD = 200;
const PER_TX_LIMIT_USD = 50;
const SWAP_PER_TX_LIMIT_USD = 200;

export function getUserPolicy(userId: string) {
  return store.getUserPolicy(userId) || {
    userId,
    dailyLimitUsd: DAILY_LIMIT_USD,
    perTxLimitUsd: PER_TX_LIMIT_USD,
    swapPerTxLimitUsd: SWAP_PER_TX_LIMIT_USD,
    paused: false,
    updatedAt: Date.now(),
  };
}

export function checkPolicy(input: PolicyCheckInput) {
  if (input.amount <= 0) return { ok: false as const, reason: "invalid_amount" };
  const policy = getUserPolicy(input.userId);
  if (policy.paused) return { ok: false as const, reason: "sending_paused" };

  const perTxLimit =
    input.action === "swap"
      ? (policy as any).swapPerTxLimitUsd ?? SWAP_PER_TX_LIMIT_USD
      : policy.perTxLimitUsd;

  if (input.amount > perTxLimit) return { ok: false as const, reason: "over_per_tx_limit" };

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
