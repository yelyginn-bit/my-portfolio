// GET /api/download — безопасная выдача ОРИГИНАЛА (без водяного знака). Два режима авторизации:
//   A) ?token=<download_token>[&asset=<id>]  — отдельное право «скачать» (admin-issued, лимит/срок).
//   B) ?share=<share_token>&asset=<id>        — потребитель из галереи /g: валидный share-link
//                                               с can_download=true и downloadPolicy='original'.
// Оба пути идут через service role (RLS admin-only), endpoint сам всё валидирует и presign'ит.
// Это заменяет открытый /api/file-url для оригиналов: доступ контролируется и логируется.
import { getAdmin } from "./_lib/db.js";
import { r2Config, presign } from "./_lib/r2.js";

/** Выдать presigned-ссылку на оригинал и сделать 302. */
async function deliver(res, cfg, storageKey) {
  if (!cfg) return res.status(501).json({ ok: false, error: "R2 не настроен" });
  const url = cfg.publicBase
    ? `${cfg.publicBase.replace(/\/+$/, "")}/${storageKey}`
    : await presign(cfg, "GET", storageKey, 300);
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, url);
}

/** Найти ассет и проверить принадлежность галерее. */
async function fetchAsset(admin, assetId, galleryId) {
  const { data: asset } = await admin
    .from("assets")
    .select("id, gallery_id, storage_key, filename")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset || asset.gallery_id !== galleryId) return null;
  return asset;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });

  const { token, share, asset: assetId } = req.query || {};
  if (!token && !share) return res.status(400).json({ ok: false, error: "no token/share" });

  const admin = getAdmin();
  const cfg = r2Config();
  if (!admin) return res.status(501).json({ ok: false, error: "storage backend не настроен" });

  try {
    // ─── Режим B: share-link из галереи ──────────────────────────────────────
    if (share) {
      if (!assetId) return res.status(400).json({ ok: false, error: "укажите ?asset=<id>" });
      const { data: link } = await admin
        .from("share_links")
        .select("id, gallery_id, can_download, expires_at")
        .eq("token", share)
        .maybeSingle();
      if (!link) return res.status(404).json({ ok: false, error: "ссылка не найдена" });
      if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ ok: false, error: "срок действия истёк" });
      }
      if (!link.can_download) return res.status(403).json({ ok: false, error: "скачивание не разрешено" });
      // Оригиналы — только если политика галереи это допускает.
      const { data: gal } = await admin.from("galleries").select("download_policy").eq("id", link.gallery_id).maybeSingle();
      if (gal?.download_policy !== "original") {
        return res.status(403).json({ ok: false, error: "оригиналы недоступны для этой галереи" });
      }
      const asset = await fetchAsset(admin, assetId, link.gallery_id);
      if (!asset) return res.status(404).json({ ok: false, error: "ассет не принадлежит галерее" });
      return deliver(res, cfg, asset.storage_key);
    }

    // ─── Режим A: download_token ─────────────────────────────────────────────
    const { data: tk } = await admin
      .from("download_tokens")
      .select("id, gallery_id, asset_id, quality, expires_at, max_uses, used_count")
      .eq("token", token)
      .maybeSingle();
    if (!tk) return res.status(404).json({ ok: false, error: "токен не найден" });
    if (tk.expires_at && new Date(tk.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ ok: false, error: "срок действия истёк" });
    }
    if (tk.max_uses != null && (tk.used_count ?? 0) >= tk.max_uses) {
      return res.status(429).json({ ok: false, error: "лимит скачиваний исчерпан" });
    }
    const targetAsset = assetId || tk.asset_id;
    if (!targetAsset) {
      return res.status(400).json({ ok: false, error: "укажите ?asset=<id> (токен на галерею)" });
    }
    const asset = await fetchAsset(admin, targetAsset, tk.gallery_id);
    if (!asset) return res.status(404).json({ ok: false, error: "ассет не принадлежит галерее токена" });

    // used_count += 1 (best-effort, не блокируем выдачу).
    await admin.from("download_tokens").update({ used_count: (tk.used_count ?? 0) + 1 }).eq("id", tk.id);
    return deliver(res, cfg, asset.storage_key);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : "download failed" });
  }
}
