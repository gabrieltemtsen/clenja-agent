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

test("parse address intent", () => {
  const i = parseIntent("what's my address");
  assert.equal(i.kind, "address");
});

test("parse conversational transfer intent", () => {
  const i = parseIntent("Transfer 12 celo to this address: 0xbE95bb47789E5f4Af467306C97DED0877BF817B5");
  assert.equal(i.kind, "send");
  if (i.kind === "send") {
    assert.equal(i.amount, "12");
    assert.equal(i.token, "CELO");
    assert.equal(i.to.toLowerCase(), "0xbe95bb47789e5f4af467306c97ded0877bf817b5");
  }
});

test("parse sendability check intent", () => {
  const i = parseIntent("Do I have enough celo to send to another person?");
  assert.equal(i.kind, "sendability_check");
});
