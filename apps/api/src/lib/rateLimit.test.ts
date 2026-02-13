import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "./rateLimit.js";

test("rate limit allows initial requests", () => {
  const r = checkRateLimit("t:1");
  assert.equal(r.ok, true);
});

test("rate limit blocks after threshold", () => {
  let blocked = false;
  for (let i = 0; i < 25; i++) {
    const r = checkRateLimit("t:2");
    if (!r.ok) {
      blocked = true;
      break;
    }
  }
  assert.equal(blocked, true);
});
