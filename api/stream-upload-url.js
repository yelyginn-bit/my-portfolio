// POST /api/stream-upload-url  { name }
// Создаёт одноразовую ссылку загрузки в Cloudflare Stream (direct creator upload).
// Секреты (account id + API token) остаются на сервере. Возвращает { uploadURL, uid }.
// Env: CF_STREAM_ACCOUNT_ID, CF_STREAM_TOKEN, (опц.) CF_STREAM_MAX_DURATION.
import { readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const accountId = process.env.CF_STREAM_ACCOUNT_ID;
  const token = process.env.CF_STREAM_TOKEN;
  if (!accountId || !token) return res.status(501).json({ ok: false, error: "Cloudflare Stream не настроен" });

  const { name } = readJsonBody(req);
  const maxDurationSeconds = Number(process.env.CF_STREAM_MAX_DURATION || 3600);

  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ maxDurationSeconds, meta: { name: name || "video" } }),
    });
    const d = await r.json();
    if (!d.success) return res.status(502).json({ ok: false, error: d.errors?.[0]?.message || "Stream API error" });
    return res.status(200).json({ ok: true, uploadURL: d.result.uploadURL, uid: d.result.uid });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "stream request failed" });
  }
}
