import { Router } from "express";

export const receiptsViewRouter = Router();

function gatewayBase() {
  return (process.env.RECEIPT_GATEWAY_BASE || "https://w3s.link/ipfs/").replace(/\/$/, "");
}

function isCidLike(s: string) {
  // Accept CIDv0/v1-ish strings (rough check)
  return /^[a-zA-Z0-9]+$/.test(s) && s.length >= 40;
}

receiptsViewRouter.get("/receipts/:cid.json", async (req, res) => {
  const cid = String(req.params.cid || "").trim();
  if (!cid || !isCidLike(cid)) return res.status(400).json({ error: "invalid_cid" });

  const url = `${gatewayBase()}/${cid}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return res.status(502).json({ error: "receipt_fetch_failed", status: r.status, detail: t.slice(0, 500) });
  }
  const text = await r.text();
  res.setHeader("content-type", "application/json");
  return res.send(text);
});

receiptsViewRouter.get("/receipts/:cid", async (req, res) => {
  const cid = String(req.params.cid || "").trim();
  if (!cid || !isCidLike(cid)) return res.status(400).send("invalid_cid");

  const basePath = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  const jsonUrl = basePath ? `${basePath}/v1/receipts/${cid}.json` : `/v1/receipts/${cid}.json`;
  const rawUrl = `${gatewayBase()}/${cid}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Clenja Receipt ${cid}</title>
  <style>
    :root { --bg: #0b1220; --card: #111a2e; --text: #e7eefc; --muted: #9db0d0; --accent: #7aa2ff; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: var(--bg); color: var(--text); }
    .wrap { max-width: 960px; margin: 0 auto; padding: 28px 16px; }
    .card { background: var(--card); border: 1px solid rgba(255,255,255,.06); border-radius: 14px; padding: 18px; }
    a { color: var(--accent); }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
    .muted { color: var(--muted); }
    pre { overflow: auto; background: rgba(0,0,0,.35); border-radius: 10px; padding: 12px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: rgba(122,162,255,.12); border: 1px solid rgba(122,162,255,.25); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="row" style="margin-bottom: 14px;">
      <div>
        <div class="pill">Clenja Receipt Viewer</div>
        <div style="margin-top:8px;" class="muted">CID: <code>${cid}</code></div>
      </div>
      <div class="muted">
        <div>Raw: <a href="${rawUrl}" target="_blank" rel="noreferrer">${rawUrl}</a></div>
      </div>
    </div>

    <div class="card">
      <div class="muted" style="margin-bottom: 10px;">This is a read-only, tamper-resistant receipt stored on decentralized storage.</div>
      <div id="status" class="muted">Loading…</div>
      <pre><code id="out"></code></pre>
    </div>
  </div>

  <script>
    (async () => {
      const status = document.getElementById('status');
      const out = document.getElementById('out');
      try {
        const r = await fetch(${JSON.stringify(jsonUrl)});
        const text = await r.text();
        if (!r.ok) throw new Error(text.slice(0, 500));
        let obj;
        try { obj = JSON.parse(text); } catch { obj = { raw: text }; }
        status.textContent = 'Loaded ✓';
        out.textContent = JSON.stringify(obj, null, 2);
      } catch (e) {
        status.textContent = 'Failed to load receipt.';
        out.textContent = String(e && e.message ? e.message : e);
      }
    })();
  </script>
</body>
</html>`;

  res.setHeader("content-type", "text/html; charset=utf-8");
  return res.send(html);
});
