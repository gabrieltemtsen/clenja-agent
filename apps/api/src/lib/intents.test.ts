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

test("parse greeting intent", () => {
  const i = parseIntent("How are you");
  assert.equal(i.kind, "greeting");
});

test("parse save recipient intent", () => {
  const i = parseIntent("save recipient Gabriel 0xbE95bb47789E5f4Af467306C97DED0877BF817B5");
  assert.equal(i.kind, "save_recipient");
});

test("parse send to recipient intent", () => {
  const i = parseIntent("send 5 cUSD to Gabriel");
  assert.equal(i.kind, "send_to_recipient");
});

test("parse list recipients intent", () => {
  const i = parseIntent("list recipients");
  assert.equal(i.kind, "list_recipients");
});

test("parse update recipient intent", () => {
  const i = parseIntent("update recipient Gabriel 0xbE95bb47789E5f4Af467306C97DED0877BF817B5");
  assert.equal(i.kind, "update_recipient");
});

test("parse delete recipient intent", () => {
  const i = parseIntent("delete recipient Gabriel");
  assert.equal(i.kind, "delete_recipient");
});

test("parse confirm yes intent", () => {
  const i = parseIntent("YES");
  assert.equal(i.kind, "confirm_yes");
});

test("parse show limits intent", () => {
  const i = parseIntent("show limits");
  assert.equal(i.kind, "show_limits");
});

test("parse set daily limit intent", () => {
  const i = parseIntent("set daily limit 50");
  assert.equal(i.kind, "set_daily_limit");
});

test("parse set per tx limit intent", () => {
  const i = parseIntent("set per-tx limit 20");
  assert.equal(i.kind, "set_per_tx_limit");
});

test("parse pause and resume intents", () => {
  assert.equal(parseIntent("pause sending").kind, "pause_sending");
  assert.equal(parseIntent("resume sending").kind, "resume_sending");
});
