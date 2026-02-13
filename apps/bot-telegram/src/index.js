// Telegram bot scaffold for agentic natural-language orchestration.
// TODO: replace with Telegram webhook + OpenClaw session bridge.

function parseIntent(text) {
  const t = text.trim();
  const send = t.match(/send\s+(\d+(?:\.\d+)?)\s+(cusd|celo)\s+to\s+([^\s]+)/i);
  const cashout = t.match(/cashout\s+(\d+(?:\.\d+)?)\s+(cusd|celo)/i);

  if (/balance|what'?s my balance|my balance/i.test(t)) return { kind: 'balance' };
  if (send) return { kind: 'send', amount: send[1], token: send[2].toUpperCase(), to: send[3] };
  if (cashout) return { kind: 'cashout', amount: cashout[1], token: cashout[2].toUpperCase() };
  return { kind: 'unknown', raw: t };
}

const samples = [
  "what's my balance",
  "send 12.5 cUSD to 0xabc",
  "cashout 50 celo to my bank account"
];

for (const s of samples) {
  console.log('input:', s);
  console.log('intent:', parseIntent(s));
}

console.log('[clenja-bot] scaffold ready');
