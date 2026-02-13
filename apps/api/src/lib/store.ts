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

type DbShape = {
  challenges: Record<string, Challenge>;
  policySpent: PolicyState;
  receipts: Receipt[];
};

const DB_PATH = process.env.STATE_DB_PATH || "./.data/state.json";

function ensureFile() {
  if (!existsSync(DB_PATH)) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const init: DbShape = { challenges: {}, policySpent: {}, receipts: [] };
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
  }
};
