export type PolicyCheckInput = {
  userId: string;
  action: "send" | "cashout";
  amount: number;
  token: "CELO" | "cUSD";
  recipient?: string;
};

const DAILY_LIMIT_USD = 200;
const PER_TX_LIMIT_USD = 50;

const spentToday = new Map<string, number>();

export function checkPolicy(input: PolicyCheckInput) {
  if (input.amount <= 0) return { ok: false as const, reason: "invalid_amount" };
  if (input.amount > PER_TX_LIMIT_USD) return { ok: false as const, reason: "over_per_tx_limit" };

  const key = `${input.userId}:${new Date().toISOString().slice(0, 10)}`;
  const used = spentToday.get(key) ?? 0;
  if (used + input.amount > DAILY_LIMIT_USD) return { ok: false as const, reason: "over_daily_limit" };

  return { ok: true as const };
}

export function recordPolicySpend(userId: string, amount: number) {
  const key = `${userId}:${new Date().toISOString().slice(0, 10)}`;
  spentToday.set(key, (spentToday.get(key) ?? 0) + amount);
}
