import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";
import { genToken, hashPassword, readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу" });
  const claims = verifySupabaseJwt(parseCookies(req).yel_admin_session, process.env.SUPABASE_JWT_SECRET);
  const admin = getAdmin();
  if (claims?.app_role !== "admin" || !admin) return res.status(401).json({ ok: false, error: "Требуется вход" });

  const { galleryId, password, canDownload, expiresAt } = readJsonBody(req);
  if (!galleryId || (password && String(password).length > 128)) return res.status(400).json({ ok: false, error: "Некорректный запрос" });
  const { data: gallery } = await admin.from("galleries").select("id").eq("id", galleryId).maybeSingle();
  if (!gallery) return res.status(404).json({ ok: false, error: "Галерея не найдена" });

  const token = genToken();
  const passwordHash = password ? hashPassword(String(password)) : null;
  const safeExpiresAt = expiresAt && Number.isFinite(new Date(expiresAt).getTime()) ? new Date(expiresAt).toISOString() : null;
  const { data, error } = await admin.from("share_links").insert({
    gallery_id: gallery.id,
    token,
    password_hash: passwordHash,
    can_download: Boolean(canDownload),
    expires_at: safeExpiresAt,
  }).select("id,gallery_id,token,can_download,expires_at,created_at").single();
  if (error || !data) return res.status(500).json({ ok: false, error: "Не удалось создать ссылку" });
  return res.status(200).json({ ok: true, link: { id: data.id, galleryId: data.gallery_id, token: data.token, canDownload: data.can_download, expiresAt: data.expires_at || undefined, createdAt: data.created_at } });
}
