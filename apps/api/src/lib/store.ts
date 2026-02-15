import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { Challenge } from "./stateMachine.js";

type PolicyState = Record<string, number>;

type Receipt = {
  id: string;
  userId: string;
  kind: "send" | "cashout";
  amount: string;
  token: string;
  ref: string;
  createdAt: number;
};

type Beneficiary = {
  id: string;
  userId: string;
  country: string;
  bankName: string;
  accountName: string;
  accountNumberMasked: string;
  accountNumberLast4: string;
  createdAt: number;
};

type CashoutOrder = {
  payoutId: string;
  userId: string;
  status: "pending" | "processing" | "settled" | "failed";
  amount: string;
  token: string;
  beneficiaryId?: string;
  createdAt: number;
  updatedAt: number;
};

type AuditEvent = {
  id: string;
  ts: number;
  userId?: string;
  action: string;
  status: "ok" | "error";
  detail?: Record<string, unknown>;
};

type IdempotencyRecord = {
  key: string;
  action: string;
  response: unknown;
  createdAt: number;
};

type WalletRecord = {
  userId: string;
  provider: "turnkey" | "para" | "mock";
  walletAddress: string;
  meta?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

type RecipientRecord = {
  id: string;
  userId: string;
  name: string;
  address: string;
  createdAt: number;
  updatedAt: number;
};

type DbShape = {
  challenges: Record<string, Challenge>;
  policySpent: PolicyState;
  receipts: Receipt[];
  beneficiaries: Beneficiary[];
  cashouts: CashoutOrder[];
  audit: AuditEvent[];
  idempotency: IdempotencyRecord[];
  wallets: WalletRecord[];
  recipients: RecipientRecord[];
};

const DB_PATH = process.env.STATE_DB_PATH || "./.data/state.json";

function ensureFile() {
  if (!existsSync(DB_PATH)) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const init: DbShape = { challenges: {}, policySpent: {}, receipts: [], beneficiaries: [], cashouts: [], audit: [], idempotency: [], wallets: [], recipients: [] };
    writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
  }
}

function readDb(): DbShape {
  ensureFile();
  const parsed = JSON.parse(readFileSync(DB_PATH, "utf8")) as Partial<DbShape>;
  return {
    challenges: parsed.challenges ?? {},
    policySpent: parsed.policySpent ?? {},
    receipts: parsed.receipts ?? [],
    beneficiaries: parsed.beneficiaries ?? [],
    cashouts: parsed.cashouts ?? [],
    audit: parsed.audit ?? [],
    idempotency: parsed.idempotency ?? [],
    wallets: parsed.wallets ?? [],
    recipients: parsed.recipients ?? [],
  };
}

function writeDb(data: DbShape) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const store = {
  getChallenge(id: string) {
    return readDb().challenges[id];
  },
  putChallenge(ch: Challenge) {
    const db = readDb();
    db.challenges[ch.id] = ch;
    writeDb(db);
  },
  policyGet(key: string) {
    return readDb().policySpent[key] ?? 0;
  },
  policySet(key: string, value: number) {
    const db = readDb();
    db.policySpent[key] = value;
    writeDb(db);
  },
  addReceipt(r: Receipt) {
    const db = readDb();
    db.receipts.unshift(r);
    db.receipts = db.receipts.slice(0, 1000);
    writeDb(db);
  },
  listReceipts(userId: string) {
    return readDb().receipts.filter((r) => r.userId === userId);
  },
  addBeneficiary(b: Beneficiary) {
    const db = readDb();
    db.beneficiaries.unshift(b);
    db.beneficiaries = db.beneficiaries.slice(0, 5000);
    writeDb(db);
  },
  listBeneficiaries(userId: string) {
    return readDb().beneficiaries.filter((b) => b.userId === userId);
  },
  addCashout(order: CashoutOrder) {
    const db = readDb();
    db.cashouts.unshift(order);
    db.cashouts = db.cashouts.slice(0, 5000);
    writeDb(db);
  },
  updateCashoutStatus(payoutId: string, status: CashoutOrder["status"]) {
    const db = readDb();
    const c = db.cashouts.find((x) => x.payoutId === payoutId);
    if (!c) return null;
    c.status = status;
    c.updatedAt = Date.now();
    writeDb(db);
    return c;
  },
  getCashout(payoutId: string) {
    return readDb().cashouts.find((x) => x.payoutId === payoutId);
  },
  listCashouts(userId: string) {
    return readDb().cashouts.filter((x) => x.userId === userId);
  },
  addAudit(event: AuditEvent) {
    const db = readDb();
    db.audit.unshift(event);
    db.audit = db.audit.slice(0, 5000);
    writeDb(db);
  },
  listAudit(userId?: string) {
    const list = readDb().audit;
    return userId ? list.filter((x) => x.userId === userId) : list;
  },
  getIdempotency(action: string, key: string) {
    return readDb().idempotency.find((x) => x.action === action && x.key === key);
  },
  putIdempotency(record: IdempotencyRecord) {
    const db = readDb();
    db.idempotency.unshift(record);
    db.idempotency = db.idempotency.slice(0, 5000);
    writeDb(db);
  },
  getWallet(userId: string, provider: WalletRecord["provider"]) {
    return readDb().wallets.find((w) => w.userId === userId && w.provider === provider);
  },
  upsertWallet(record: WalletRecord) {
    const db = readDb();
    const i = db.wallets.findIndex((w) => w.userId === record.userId && w.provider === record.provider);
    if (i >= 0) {
      db.wallets[i] = { ...db.wallets[i], ...record, updatedAt: Date.now() };
    } else {
      db.wallets.unshift({ ...record, createdAt: record.createdAt || Date.now(), updatedAt: Date.now() });
      db.wallets = db.wallets.slice(0, 10000);
    }
    writeDb(db);
  },
  listRecipients(userId: string) {
    return readDb().recipients.filter((r) => r.userId === userId);
  },
  upsertRecipient(record: RecipientRecord) {
    const db = readDb();
    const i = db.recipients.findIndex((r) => r.userId === record.userId && r.name.toLowerCase() === record.name.toLowerCase());
    if (i >= 0) {
      db.recipients[i] = { ...db.recipients[i], ...record, updatedAt: Date.now() };
    } else {
      db.recipients.unshift({ ...record, createdAt: record.createdAt || Date.now(), updatedAt: Date.now() });
      db.recipients = db.recipients.slice(0, 10000);
    }
    writeDb(db);
  }
};
