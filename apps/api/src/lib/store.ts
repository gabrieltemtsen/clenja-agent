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

type DbShape = {
  challenges: Record<string, Challenge>;
  policySpent: PolicyState;
  receipts: Receipt[];
  beneficiaries: Beneficiary[];
  cashouts: CashoutOrder[];
};

const DB_PATH = process.env.STATE_DB_PATH || "./.data/state.json";

function ensureFile() {
  if (!existsSync(DB_PATH)) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const init: DbShape = { challenges: {}, policySpent: {}, receipts: [], beneficiaries: [], cashouts: [] };
    writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
  }
}

function readDb(): DbShape {
  ensureFile();
  return JSON.parse(readFileSync(DB_PATH, "utf8")) as DbShape;
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
  }
};
