import "dotenv/config";
import pg from "pg";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = process.env.CLENJA_API_BASE || "http://localhost:8787";
const MODE = (process.env.TELEGRAM_MODE || "polling").toLowerCase();
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const DATABASE_URL = process.env.DATABASE_URL;
const pendingChallenges = new Map(); // fallback in-memory: userId -> challengeId

const db = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

if (!BOT_TOKEN) {
  console.error("[clenja-bot] TELEGRAM_BOT_TOKEN missing");
  process.exit(1);
}

async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

function idemKey(userId, text) {
  const base = `${userId}:${text}:${new Date().toISOString().slice(0, 16)}`;
  return Buffer.from(base).toString("base64url").slice(0, 48);
}

async function apiCall(endpoint, payload, idempotencyKeyValue) {
  const r = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idempotencyKeyValue ? { "idempotency-key": idempotencyKeyValue } : {}),
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await r.json();
  } catch {
    data = { reply: "Unexpected response from API." };
  }

  return { status: r.status, data, headers: r.headers };
}

async function sendMessage(chatId, text, replyToMessageId) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
  });
}

async function initDb() {
  if (!db) return;
  await db.query(`
    create table if not exists bot_context (
      user_id text primary key,
      pending_challenge_id text,
      updated_at timestamptz not null default now()
    )
  `);
}

async function setPendingChallenge(userId, challengeId) {
  if (!challengeId) return;
  if (!db) {
    pendingChallenges.set(userId, challengeId);
    return;
  }
  await db.query(
    `insert into bot_context (user_id, pending_challenge_id, updated_at)
     values ($1, $2, now())
     on conflict (user_id) do update set pending_challenge_id = excluded.pending_challenge_id, updated_at = now()`,
    [userId, challengeId],
  );
}

async function getPendingChallenge(userId) {
  if (!db) return pendingChallenges.get(userId);
  const r = await db.query("select pending_challenge_id from bot_context where user_id = $1", [userId]);
  return r.rows[0]?.pending_challenge_id;
}

async function clearPendingChallenge(userId) {
  if (!db) {
    pendingChallenges.delete(userId);
    return;
  }
  await db.query("update bot_context set pending_challenge_id = null, updated_at = now() where user_id = $1", [userId]);
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.text) return;

  const userId = `tg:${msg.from?.id ?? "unknown"}`;
  const text = msg.text.trim();

  if (text === "/start") {
    try {
      const { status, data } = await apiCall("/v1/chat/message", { userId, text: "what's my address" });
      const walletAddress = data?.walletAddress;
      if (status < 400 && walletAddress) {
        await sendMessage(
          msg.chat.id,
          `CLENJA is live ✅\nWallet ready: ${walletAddress}\n\nTry: balance | history | send 5 cUSD to 0xabc1234 | cashout 50 cUSD`,
          msg.message_id,
        );
        return;
      }
    } catch {
      // fall through to default welcome
    }

    await sendMessage(msg.chat.id, "CLENJA is live ✅\nTry: balance | history | send 5 cUSD to 0xabc1234 | cashout 50 cUSD", msg.message_id);
    return;
  }

  if (text === "/help") {
    await sendMessage(
      msg.chat.id,
      "Available:\n• balance\n• address\n• history\n• status\n• send <amount> <cUSD|CELO> to <address>\n• cashout <amount> <cUSD|CELO>\n• confirm <challengeId> <answer>",
      msg.message_id,
    );
    return;
  }

  const pendingChallengeId = await getPendingChallenge(userId);
  const looksLikeBareAnswer = !!pendingChallengeId && /^[a-zA-Z0-9]{3,8}$/.test(text);

  const endpoint = (text.startsWith("confirm ") || looksLikeBareAnswer) ? "/v1/chat/confirm" : "/v1/chat/message";
  const payload = endpoint === "/v1/chat/confirm"
    ? (() => {
        if (text.startsWith("confirm ")) {
          const parts = text.split(/\s+/);
          const challengeId = parts[1];
          const answer = parts.slice(2).join(" ");
          return { userId, challengeId, answer };
        }
        return { userId, challengeId: pendingChallengeId, answer: text };
      })()
    : { userId, text };

  try {
    const key = endpoint.includes("confirm") ? idemKey(userId, text) : undefined;
    const { status, data, headers } = await apiCall(endpoint, payload, key);
    const reply = data.reply || (status >= 400 ? "Request failed." : "Done.");

    const extra = data.challengeId
      ? `\n\nReply with just the confirmation code (e.g. 17B5).`
      : "";

    if (data.challengeId) {
      await setPendingChallenge(userId, data.challengeId);
    } else if (endpoint === "/v1/chat/confirm" && status < 400) {
      await clearPendingChallenge(userId);
    }

    if (status === 429) {
      const retry = headers.get("retry-after") || "30";
      await sendMessage(msg.chat.id, `⏳ Rate limited. Retry in ~${retry}s.`, msg.message_id);
      return;
    }

    await sendMessage(msg.chat.id, `${reply}${extra}`, msg.message_id);
  } catch {
    await sendMessage(msg.chat.id, "Service error. Please try again in a moment.", msg.message_id);
  }
}

let offset = 0;
async function poll() {
  while (true) {
    try {
      const res = await tg("getUpdates", { timeout: 25, offset });
      if (res.ok && Array.isArray(res.result)) {
        for (const upd of res.result) {
          offset = upd.update_id + 1;
          await handleUpdate(upd);
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

async function setupWebhook() {
  if (!WEBHOOK_URL) {
    console.error("[clenja-bot] TELEGRAM_WEBHOOK_URL is required when TELEGRAM_MODE=webhook");
    process.exit(1);
  }
  const r = await tg("setWebhook", { url: WEBHOOK_URL });
  console.log("[clenja-bot] webhook set:", r.ok ? "ok" : r);
}

async function boot() {
  try {
    await initDb();
    if (MODE === "webhook") {
      await setupWebhook();
    } else {
      console.log("[clenja-bot] telegram polling started");
      await poll();
    }
  } catch (e) {
    console.error("[clenja-bot] boot error", e);
    process.exit(1);
  }
}

boot();
