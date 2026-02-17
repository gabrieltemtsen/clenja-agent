import "dotenv/config";
import pg from "pg";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = process.env.CLENJA_API_BASE || "http://localhost:8787";
const MODE = (process.env.TELEGRAM_MODE || "polling").toLowerCase();
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const DATABASE_URL = process.env.DATABASE_URL;
const pendingChallenges = new Map(); // fallback in-memory: userId -> challengeId
const tradeUiState = new Map(); // fallback in-memory: userId -> { amount: string, slippage: number }
const pendingUiInput = new Map(); // fallback in-memory: userId -> "amount" | "slippage"

const db = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

const COMMAND_KEYBOARD = {
  keyboard: [
    [{ text: "💰 Balance" }, { text: "🏦 Address" }],
    [{ text: "👥 Recipients" }, { text: "📒 History" }],
    [{ text: "💸 Send" }, { text: "🔄 Swap" }],
    [{ text: "🏧 Cashout" }, { text: "⚙️ Limits" }],
    [{ text: "❓ Help" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

function tradeKeyboardFor(userId) {
  const s = tradeUiState.get(userId) || { amount: "1", slippage: 1 };
  return {
    inline_keyboard: [
      [{ text: "← Back", callback_data: "trade_back" }, { text: "↻ Refresh", callback_data: "trade_refresh" }],
      [{ text: "✅ Swap", callback_data: "trade_mode_swap" }, { text: "Limit", callback_data: "trade_mode_limit" }, { text: "DCA", callback_data: "trade_mode_dca" }],
      [{ text: `${s.amount === "0.5" ? "✅ " : ""}0.5 CELO`, callback_data: "trade_amt_0.5" }, { text: `${s.amount === "1" ? "✅ " : ""}1 CELO`, callback_data: "trade_amt_1" }, { text: `${s.amount === "3" ? "✅ " : ""}3 CELO`, callback_data: "trade_amt_3" }],
      [{ text: `${s.amount === "5" ? "✅ " : ""}5 CELO`, callback_data: "trade_amt_5" }, { text: `${s.amount === "10" ? "✅ " : ""}10 CELO`, callback_data: "trade_amt_10" }, { text: "X CELO ✏️", callback_data: "trade_amt_custom" }],
      [{ text: `${s.slippage === 1 ? "✅ " : ""}1% Slippage`, callback_data: "trade_slip_1" }, { text: `${s.slippage === 3 ? "✅ " : ""}3% Slippage`, callback_data: "trade_slip_3" }, { text: "X Slip ✏️", callback_data: "trade_slip_custom" }],
      [{ text: `🔄 Swap ${s.amount} CELO → cUSD`, callback_data: "trade_execute" }],
    ],
  };
}

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

async function sendMessage(chatId, text, replyToMessageId, withKeyboard = false) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
    ...(withKeyboard ? { reply_markup: COMMAND_KEYBOARD } : {}),
  });
}

function normalizeUiCommand(text) {
  const t = text.trim().toLowerCase();
  const plain = t.replace(/[^\p{L}\p{N}\s]/gu, "").trim();

  // Only normalize exact quick-action button taps. Never rewrite free-form user text.
  if (plain === "balance") return "what's my balance";
  if (plain === "address") return "what's my address";
  if (plain === "history") return "history";
  if (plain === "recipients") return "list recipients";
  if (plain === "cashout") return "cashout 50 cUSD";
  if (plain === "help") return "/help";
  if (plain === "send") return "send 1 CELO to 0x...";
  if (plain === "swap") return "/trade";
  if (plain === "limits") return "show limits";

  return text;
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
  const cq = update.callback_query;
  if (cq) {
    const userId = `tg:${cq.from?.id ?? "unknown"}`;
    const data = String(cq.data || "");
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;
    const current = tradeUiState.get(userId) || { amount: "1", slippage: 1 };

    if (data.startsWith("trade_")) {
      await tg("answerCallbackQuery", { callback_query_id: cq.id });

      if (data === "trade_back") {
        if (chatId && messageId) await tg("editMessageText", { chat_id: chatId, message_id: messageId, text: "Back to chat commands. Say what you want naturally, or tap buttons below." });
        return;
      }
      if (data === "trade_refresh") {
        if (chatId && messageId) await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: tradeKeyboardFor(userId) });
        return;
      }
      if (data === "trade_mode_limit" || data === "trade_mode_dca") {
        if (chatId && messageId) await tg("editMessageText", { chat_id: chatId, message_id: messageId, text: "Limit/DCA mode coming next. Swap mode is live now.", reply_markup: tradeKeyboardFor(userId) });
        return;
      }
      if (data.startsWith("trade_amt_")) {
        const v = data.replace("trade_amt_", "");
        if (v === "custom") {
          pendingUiInput.set(userId, "amount");
          if (chatId) await sendMessage(chatId, "Send custom swap amount in CELO (e.g. 2.5).", messageId, true);
          return;
        }
        current.amount = v;
        tradeUiState.set(userId, current);
        if (chatId && messageId) await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: tradeKeyboardFor(userId) });
        return;
      }
      if (data.startsWith("trade_slip_")) {
        const v = data.replace("trade_slip_", "");
        if (v === "custom") {
          pendingUiInput.set(userId, "slippage");
          if (chatId) await sendMessage(chatId, "Send custom slippage percent (e.g. 2).", messageId, true);
          return;
        }
        current.slippage = Number(v);
        tradeUiState.set(userId, current);
        if (chatId && messageId) await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: tradeKeyboardFor(userId) });
        return;
      }
      if (data === "trade_execute") {
        if (!chatId) return;
        try {
          const command = `swap ${current.amount} CELO to cUSD`;
          const { status, data: apiData } = await apiCall("/v1/chat/message", { userId, text: command }, idemKey(userId, command));
          const reply = apiData.reply || (status >= 400 ? "Request failed." : "Done.");
          const extra = apiData.challengeId ? `\n\nReply with just the confirmation code (e.g. 17B5).` : "";
          if (apiData.challengeId) await setPendingChallenge(userId, apiData.challengeId);
          await sendMessage(chatId, `${reply}${extra}`, messageId, true);
        } catch {
          await sendMessage(chatId, "Service error. Please try again in a moment.", messageId, true);
        }
        return;
      }
    }
  }

  const msg = update.message;
  if (!msg?.text) return;

  const userId = `tg:${msg.from?.id ?? "unknown"}`;
  const rawText = msg.text.trim();
  const text = normalizeUiCommand(rawText);

  if (rawText === "/start") {
    try {
      const { status, data } = await apiCall("/v1/chat/message", { userId, text: "what's my address" });
      const walletAddress = data?.walletAddress;
      if (status < 400 && walletAddress) {
        await sendMessage(
          msg.chat.id,
          `CLENJA is live ✅\nWallet ready: ${walletAddress}\n\nTry: balance | history | send 5 cUSD to 0xabc1234 | cashout 50 cUSD`,
          msg.message_id,
          true,
        );
        return;
      }
    } catch {
      // fall through to default welcome
    }

    await sendMessage(msg.chat.id, "CLENJA is live ✅\nTry: balance | history | send 5 cUSD to 0xabc1234 | cashout 50 cUSD", msg.message_id, true);
    return;
  }

  if (rawText === "/help" || text === "/help") {
    await sendMessage(
      msg.chat.id,
      "Available:\n• balance\n• address\n• history\n• recipients (save/list/update/delete)\n• send <amount> <cUSD|CELO> to <address|name>\n• swap <amount> <CELO|cUSD> to <CELO|cUSD>\n• /trade (inline swap keyboard)\n• cashout <amount> <cUSD|CELO>\n• reply with confirmation code when prompted",
      msg.message_id,
      true,
    );
    return;
  }

  if (rawText === "/trade" || text === "/trade") {
    if (!tradeUiState.has(userId)) tradeUiState.set(userId, { amount: "1", slippage: 1 });
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: "Swap panel (conversational mode still works too).",
      reply_parameters: { message_id: msg.message_id },
      reply_markup: tradeKeyboardFor(userId),
    });
    return;
  }

  const pendingInput = pendingUiInput.get(userId);
  if (pendingInput === "amount") {
    const amount = Number(rawText);
    if (!Number.isFinite(amount) || amount <= 0) {
      await sendMessage(msg.chat.id, "Invalid amount. Send a number like 2.5", msg.message_id, true);
      return;
    }
    const s = tradeUiState.get(userId) || { amount: "1", slippage: 1 };
    s.amount = String(amount);
    tradeUiState.set(userId, s);
    pendingUiInput.delete(userId);
    await sendMessage(msg.chat.id, `Set swap amount to ${s.amount} CELO. Use /trade to execute.`, msg.message_id, true);
    return;
  }

  if (pendingInput === "slippage") {
    const slippage = Number(rawText);
    if (!Number.isFinite(slippage) || slippage <= 0 || slippage > 50) {
      await sendMessage(msg.chat.id, "Invalid slippage. Send a percent like 2", msg.message_id, true);
      return;
    }
    const s = tradeUiState.get(userId) || { amount: "1", slippage: 1 };
    s.slippage = slippage;
    tradeUiState.set(userId, s);
    pendingUiInput.delete(userId);
    await sendMessage(msg.chat.id, `Set slippage to ${s.slippage}%. Use /trade to execute.`, msg.message_id, true);
    return;
  }

  const pendingChallengeId = await getPendingChallenge(userId);
  const looksLikeBareAnswer = !!pendingChallengeId && /^[a-zA-Z0-9]{3,8}$/.test(text);

  const endpoint = (rawText.toLowerCase().startsWith("confirm ") || looksLikeBareAnswer) ? "/v1/chat/confirm" : "/v1/chat/message";
  const payload = endpoint === "/v1/chat/confirm"
    ? (() => {
        if (rawText.toLowerCase().startsWith("confirm ")) {
          const parts = rawText.split(/\s+/);
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
      await sendMessage(msg.chat.id, `⏳ Rate limited. Retry in ~${retry}s.`, msg.message_id, true);
      return;
    }

    await sendMessage(msg.chat.id, `${reply}${extra}`, msg.message_id, true);
  } catch {
    await sendMessage(msg.chat.id, "Service error. Please try again in a moment.", msg.message_id, true);
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

async function setBotCommands() {
  await tg("setMyCommands", {
    commands: [
      { command: "start", description: "Start and create wallet" },
      { command: "help", description: "Show available actions" },
      { command: "trade", description: "Open swap control keyboard" },
    ],
  });
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
    await setBotCommands();
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
