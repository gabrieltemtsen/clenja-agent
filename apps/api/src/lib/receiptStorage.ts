type UploadResult = {
  cid: string;
  url: string;
  provider: "web3.storage";
};

function assertOk(res: Response, bodyText: string) {
  if (!res.ok) {
    const msg = bodyText?.slice(0, 500) || res.statusText;
    throw new Error(`receipt_upload_failed: ${res.status} ${msg}`);
  }
}

/**
 * Uploads a JSON receipt to Filecoin-backed storage (via web3.storage).
 *
 * Set env:
 * - WEB3STORAGE_TOKEN
 * - RECEIPT_GATEWAY_BASE (optional) e.g. https://w3s.link/ipfs/
 */
export async function uploadReceiptJson(payload: unknown, name = "receipt.json"): Promise<UploadResult> {
  const token = process.env.WEB3STORAGE_TOKEN;
  if (!token) throw new Error("WEB3STORAGE_TOKEN_missing");

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });

  // web3.storage accepts raw bytes in the request body.
  // We pass a name hint for nicer UIs/logs.
  const res = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-NAME": name,
    },
    body: blob,
  });

  const text = await res.text();
  assertOk(res, text);

  // web3.storage returns JSON: { cid: "..." }
  let cid = "";
  try {
    const parsed = JSON.parse(text);
    cid = String(parsed.cid || "");
  } catch {
    cid = "";
  }
  if (!cid) throw new Error(`receipt_upload_bad_response: ${text.slice(0, 500)}`);

  const gw = process.env.RECEIPT_GATEWAY_BASE || "https://w3s.link/ipfs/";
  const url = `${gw.replace(/\/$/, "")}/${cid}`;

  return { cid, url, provider: "web3.storage" };
}

export async function maybeUploadReceiptJson(payload: unknown, name?: string): Promise<UploadResult | null> {
  if (!process.env.WEB3STORAGE_TOKEN) return null;
  return uploadReceiptJson(payload, name);
}
