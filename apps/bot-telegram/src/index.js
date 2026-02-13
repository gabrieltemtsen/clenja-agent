import "dotenv/config";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = process.env.CLENJA_API_BASE || "http://localhost:8787";

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

async function sendMessage(chatId, text, replyToMessageId) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
  });
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.text) return;

  const userId = `tg:${msg.from?.id ?? "unknown"}`;
  const text = msg.text.trim();

  if (text === "/start") {
    await sendMessage(msg.chat.id, "CLENJA is live ✅\nTry: 'balance', 'send 5 cUSD to 0xabc1234', or 'cashout 50 cUSD'.", msg.message_id);
    return;
  }

  const endpoint = text.startsWith("confirm ") ? "/v1/chat/confirm" : "/v1/chat/message";
  const payload = text.startsWith("confirm ")
    ? (() => {
        const [_, challengeId, answer] = text.split(/\s+/);
        return { userId, challengeId, answer };
      })()
    : { userId, text };

  try {
    const r = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    const reply = data.reply || "Done.";
    const extra = data.challengeId ? `\n\nChallenge ID: ${data.challengeId}\nReply: confirm <challengeId> <answer>` : "";
    await sendMessage(msg.chat.id, `${reply}${extra}`, msg.message_id);
  } catch (e) {
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

console.log("[clenja-bot] telegram polling started");
poll();
