// POST /api/stream-upload-url  { name, contentType, size }
// Создаёт одноразовую ссылку загрузки в Cloudflare Stream (direct creator upload).
// Секреты (account id + API token) остаются на сервере. Возвращает { uploadURL, uid }.
// Env: CF_STREAM_ACCOUNT_ID, CF_STREAM_TOKEN, (опц.) CF_STREAM_MAX_DURATION.
import { readJsonBody } from "./_lib/util.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false });
  const claims = verifySupabaseJwt(parseCookies(req).yel_admin_session, process.env.SUPABASE_JWT_SECRET);
  if (claims?.app_role !== "admin") return res.status(401).json({ ok: false });

  const accountId = process.env.CF_STREAM_ACCOUNT_ID;
  const token = process.env.CF_STREAM_TOKEN;
  if (!accountId || !token) return res.status(501).json({ ok: false, error: "Cloudflare Stream не настроен" });

  const { name, contentType, size } = readJsonBody(req);
  if (!/^video\/(?:mp4|webm|quicktime)$/u.test(String(contentType || "")) || !Number.isFinite(Number(size)) || Number(size) <= 0 || Number(size) > 50 * 1024 * 1024) return res.status(400).json({ ok: false, error: "Недопустимый файл" });
  const safeName = String(name || "video").replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "video";
  const maxDurationSeconds = Number(process.env.CF_STREAM_MAX_DURATION || 3600);

  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ maxDurationSeconds, meta: { name: safeName } }),
    });
    const d = await r.json();
    if (!d.success) return res.status(502).json({ ok: false, error: "Stream API error" });
    return res.status(200).json({ ok: true, uploadURL: d.result.uploadURL, uid: d.result.uid });
  } catch {
    return res.status(500).json({ ok: false, error: "Не удалось подготовить загрузку" });
  }
}
