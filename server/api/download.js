// GET /api/download — выдача оригинала по отдельному admin-issued DownloadToken.
// Обычный просмотр галереи использует короткоживущий X-Gallery-Access ticket.
// Это заменяет открытый /api/file-url для оригиналов: доступ контролируется и логируется.
import { hasUnexpiredTimestamp } from "./_lib/util.js";
import { getAdmin } from "./_lib/db.js";
import { r2Config, presign } from "./_lib/r2.js";
import { rateLimit, requestIp } from "./_lib/security.js";

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
  if (!rateLimit(`download:${requestIp(req)}`, { limit: 120, windowMs: 10 * 60 * 1000 })) return res.status(429).json({ ok: false, error: "Слишком много запросов" });

  const { token, asset: assetId } = req.query || {};
  if (!token || String(token).length > 240) return res.status(400).json({ ok: false, error: "Некорректная ссылка" });

  const admin = getAdmin();
  const cfg = r2Config();
  if (!admin) return res.status(501).json({ ok: false, error: "storage backend не настроен" });

  try {
    // ─── DownloadToken ───────────────────────────────────────────────────────
    const { data: tk } = await admin
      .from("download_tokens")
      .select("id, gallery_id, asset_id, quality, expires_at, max_uses, used_count")
      .eq("token", token)
      .maybeSingle();
    if (!tk) return res.status(404).json({ ok: false, error: "токен не найден" });
    if (tk.expires_at !== null && !hasUnexpiredTimestamp(tk.expires_at)) {
      return res.status(410).json({ ok: false, error: "срок действия истёк" });
    }
    if (tk.max_uses != null && (tk.used_count ?? 0) >= tk.max_uses) {
      return res.status(429).json({ ok: false, error: "лимит скачиваний исчерпан" });
    }
    const targetAsset = assetId || tk.asset_id;
    if (!targetAsset) {
      return res.status(400).json({ ok: false, error: "укажите ?asset=<id> (токен на галерею)" });
    }
    if (tk.asset_id && targetAsset !== tk.asset_id) return res.status(403).json({ ok: false });
    const asset = await fetchAsset(admin, targetAsset, tk.gallery_id);
    if (!asset) return res.status(404).json({ ok: false, error: "ассет не принадлежит галерее токена" });

    if (!cfg) return res.status(501).json({ ok: false, error: "R2 не настроен" });
    // Claim a use atomically: parallel downloads must not bypass max_uses.
    let candidate = tk;
    for (let retry = 0; retry < 5 && candidate; retry += 1) {
      if (candidate.expires_at !== null && !hasUnexpiredTimestamp(candidate.expires_at)) return res.status(410).json({ ok: false, error: "срок действия истёк" });
      if (!Number.isSafeInteger(candidate.used_count) || candidate.used_count < 0 ||
          (candidate.max_uses !== null && (!Number.isSafeInteger(candidate.max_uses) || candidate.used_count >= candidate.max_uses))) {
        return res.status(429).json({ ok: false, error: "лимит скачиваний исчерпан" });
      }
      let claim = admin.from("download_tokens").update({ used_count: candidate.used_count + 1 }).eq("id", candidate.id).eq("token", token).eq("gallery_id", tk.gallery_id).eq("used_count", candidate.used_count);
      claim = tk.asset_id === null ? claim.is("asset_id", null) : claim.eq("asset_id", tk.asset_id);
      claim = candidate.expires_at === null ? claim.is("expires_at", null) : claim.eq("expires_at", candidate.expires_at).gt("expires_at", new Date().toISOString());
      claim = candidate.max_uses === null ? claim.is("max_uses", null) : claim.eq("max_uses", candidate.max_uses);
      const { data: claimed, error } = await claim.select("id").maybeSingle();
      if (error) return res.status(503).json({ ok: false, error: "Не удалось проверить доступ" });
      if (claimed) return deliver(res, cfg, asset.storage_key);
      const { data: fresh, error: readError } = await admin.from("download_tokens").select("id,expires_at,max_uses,used_count").eq("id", candidate.id).eq("token", token).eq("gallery_id", tk.gallery_id).maybeSingle();
      if (readError) return res.status(503).json({ ok: false, error: "Не удалось проверить доступ" });
      candidate = fresh;
    }
    return res.status(429).json({ ok: false, error: "лимит скачиваний исчерпан" });
  } catch {
    return res.status(500).json({ ok: false, error: "Не удалось подготовить файл" });
  }
}
