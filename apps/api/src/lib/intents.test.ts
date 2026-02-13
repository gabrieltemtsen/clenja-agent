import test from "node:test";
import assert from "node:assert/strict";
import { parseIntent } from "./intents.js";

test("parse help intent", () => {
  const i = parseIntent("help");
  assert.equal(i.kind, "help");
});

test("parse cashout with beneficiary", () => {
  const i = parseIntent("cashout 50 cUSD to Gabriel");
  assert.equal(i.kind, "cashout");
  if (i.kind === "cashout") {
    assert.equal(i.beneficiaryName, "Gabriel");
    assert.equal(i.token, "cUSD");
  }
});

test("parse history intent", () => {
  const i = parseIntent("show my receipts history");
  assert.equal(i.kind, "history");
});
