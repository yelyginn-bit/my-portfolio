// POST /api/upload-url  { key, contentType }
// Возвращает presigned PUT-URL для прямой загрузки файла в R2 с клиента.
import { presign, r2Config } from "./_lib/r2.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { readJsonBody } from "./_lib/util.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";
import { getAdmin } from "./_lib/db.js";

function isAdmin(req) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  const token = match?.[1]?.trim() || parseCookies(req).yel_admin_session;
  const payload = secret && token ? verifySupabaseJwt(token, secret) : null;
  return Boolean(payload && payload.app_role === "admin");
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "forbidden" });
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: "forbidden" });

  const cfg = r2Config();
  const storageAdmin = getAdmin();
  if (!cfg && !storageAdmin) return res.status(501).json({ ok: false, error: "Хранилище не настроено" });

  const { key, contentType, size } = readJsonBody(req);
  const allowedTypes = /^(?:image\/(?:jpeg|png|webp|avif)|video\/(?:mp4|webm|quicktime))$/u;
  const safeKey = typeof key === "string" && key.length <= 500 && /^galleries\/[a-f0-9-]{36}\/(?:orig|web|thumb|video)\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{2,5}$/iu.test(key) && !key.includes("..");
  if (!safeKey || !allowedTypes.test(String(contentType || "")) || !Number.isFinite(Number(size)) || Number(size) <= 0 || Number(size) > 50 * 1024 * 1024) return res.status(400).json({ ok: false, error: "Недопустимый файл" });

  try {
    if (cfg) {
      const url = await presign(cfg, "PUT", key, 600, { "Content-Type": String(contentType) });
      return res.status(200).json({ ok: true, provider: "r2", url });
    }
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "media";
    const { data, error } = await storageAdmin.storage.from(bucket).createSignedUploadUrl(key, { upsert: true });
    if (error || !data?.token) return res.status(500).json({ ok: false, error: "Не удалось подготовить загрузку" });
    return res.status(200).json({ ok: true, provider: "supabase", token: data.token, path: key });
  } catch {
    return res.status(500).json({ ok: false, error: "Не удалось подготовить загрузку" });
  }
}
