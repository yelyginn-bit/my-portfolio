// GET    /api/file-url?key=...                 → presigned (или публичный) URL для ПРОСМОТРА.
// DELETE /api/file-url?key=...                 → удаление объекта из R2.
//
// ДОСТУП КОНТРОЛИРУЕТСЯ (раньше эндпоинт presign'ил любой ключ без проверки —
// любой посетитель мог получить ссылку на чужой оригинал, угадав/подсмотрев key).
// В R2-режиме отдельных превью нет: вьювер показывает сам оригинал (orig/…),
// поэтому ограничить доступ только префиксом thumbs/ нельзя — выбран контроль по
// субъекту, как в /api/download:
//   • Админ: заголовок Authorization: Bearer <jwt c app_role=admin>  → любой ключ.
//   • Гость галереи: X-Gallery-Access — короткоживущий ticket после успешной
//     проверки share-link и, если задан, пароля.
// Скачивание ОРИГИНАЛОВ по-прежнему идёт через /api/download (can_download +
// download_policy / download_tokens). Этот эндпоинт только отдаёт URL для показа.
import { presign, r2Config } from "./_lib/r2.js";
import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";

/** Bearer-токен из заголовка Authorization, либо null. */
function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(h));
  return m ? m[1].trim() : null;
}

/** Валиден ли админский JWT (подпись + app_role=admin). */
function isAdmin(req) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return false;
  const payload = verifySupabaseJwt(bearer(req) || parseCookies(req).yel_admin_session, secret);
  return Boolean(payload && payload.app_role === "admin");
}

/** Проверяет короткоживущий ticket и принадлежность ключа его галерее. */
async function ticketGrantsKey(admin, ticket, key) {
  if (!admin || !ticket) return false;
  const claims = verifySupabaseJwt(ticket, process.env.SUPABASE_JWT_SECRET);
  if (!claims?.gallery_access || !claims.gallery_id || !claims.share_id) return false;
  const { data: link } = await admin.from("share_links").select("id,gallery_id,expires_at").eq("id", claims.share_id).eq("gallery_id", claims.gallery_id).maybeSingle();
  if (!link) return false;
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return false;
  const { data: asset } = await admin
    .from("assets")
    .select("id")
    .eq("gallery_id", link.gallery_id)
    .eq("storage_key", key)
    .maybeSingle();
  return Boolean(asset);
}

export default async function handler(req, res) {
  const cfg = r2Config();
  const storageAdmin = getAdmin();
  const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "media";
  if (!cfg && !storageAdmin) {
    return res.status(501).json({ ok: false, error: "Облачное хранилище не настроено" });
  }

  const key = req.query?.key;
  if (!key) return res.status(400).json({ ok: false, error: "no key" });
  if (typeof key !== "string" || key.length > 500 || key.includes("..") || key.startsWith("/")) return res.status(400).json({ ok: false, error: "invalid key" });

  const admin = isAdmin(req);

  try {
    if (req.method === "DELETE") {
      if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "forbidden" });
      // Удаление — только админ.
      if (!admin) return res.status(403).json({ ok: false, error: "forbidden" });
      if (cfg) {
        const url = await presign(cfg, "DELETE", key, 120);
        await fetch(url, { method: "DELETE" });
      } else {
        const { error } = await storageAdmin.storage.from(supabaseBucket).remove([key]);
        if (error) throw error;
      }
      return res.status(200).json({ ok: true });
    }

    // GET: нужен либо админ, либо валидный share-link, покрывающий этот ключ.
    if (!admin) {
      const ticket = req.headers?.["x-gallery-access"];
      if (!ticket) return res.status(401).json({ ok: false, error: "auth required" });
      const ok = await ticketGrantsKey(storageAdmin, ticket, key);
      if (!ok) return res.status(403).json({ ok: false, error: "forbidden" });
    }

    // R2: публичный домен (если задан) либо подписанная ссылка.
    if (cfg?.publicBase) {
      return res.status(200).json({ ok: true, url: `${cfg.publicBase.replace(/\/+$/, "")}/${key}` });
    }
    if (cfg) {
      const url = await presign(cfg, "GET", key, 3600);
      return res.status(200).json({ ok: true, url });
    }

    const { data, error } = await storageAdmin.storage
      .from(supabaseBucket)
      .createSignedUrl(key, 3600);
    if (error || !data?.signedUrl) throw error || new Error("signed url missing");
    return res.status(200).json({ ok: true, url: data.signedUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "presign failed" });
  }
}
