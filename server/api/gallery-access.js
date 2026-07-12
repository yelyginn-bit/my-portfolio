import { getAdmin } from "./_lib/db.js";
import { rateLimit, requestIp, verifyCsrf } from "./_lib/security.js";
import { readJsonBody, sha256, verifyPassword } from "./_lib/util.js";
import { signSupabaseJwt, verifySupabaseJwt } from "./_lib/jwt.js";

const kinds = new Set(["like", "retouch", "print"]);
const cleanText = (value, limit) => String(value || "").replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, limit);

async function access(admin, token, password) {
  if (!token || typeof token !== "string" || token.length > 200) return null;
  const { data: link } = await admin.from("share_links").select("id,gallery_id,password_hash,can_download,expires_at").eq("token", token).maybeSingle();
  if (!link || (link.expires_at && new Date(link.expires_at).getTime() < Date.now())) return null;
  if (link.password_hash && !verifyPassword(password || "", link.password_hash)) return { password: true };
  return link;
}

async function ticketAccess(admin, ticket) {
  const claims = verifySupabaseJwt(ticket, process.env.SUPABASE_JWT_SECRET);
  if (!claims?.gallery_access || !claims.share_id || !claims.gallery_id) return null;
  const { data: link } = await admin.from("share_links").select("id,gallery_id,can_download,expires_at").eq("id", claims.share_id).eq("gallery_id", claims.gallery_id).maybeSingle();
  if (!link || (link.expires_at && new Date(link.expires_at).getTime() < Date.now())) return null;
  return link;
}

const assetDto = (a) => ({ id: a.id, galleryId: a.gallery_id, albumId: a.album_id || undefined, type: a.type, storageKey: a.storage_key, webKey: a.web_key || undefined, thumbKey: a.thumb_key || undefined, filename: a.filename || undefined, mime: a.mime || undefined, width: a.width || undefined, height: a.height || undefined, durationSec: a.duration_sec || undefined, sizeBytes: a.size_bytes || undefined, videoProvider: a.video_provider || undefined, videoUid: a.video_uid || undefined, aiTags: a.ai_tags || [], faceGroup: a.face_group || undefined, sortOrder: a.sort_order || 0, createdAt: a.created_at });
const galleryDto = (g) => ({ id: g.id, clientPhone: undefined, title: g.title, description: g.description || undefined, shootDate: g.shoot_date || undefined, coverAssetId: g.cover_asset_id || undefined, visibility: g.visibility, downloadPolicy: g.download_policy, published: g.published, watermarkEnabled: g.watermark_enabled, watermarkText: g.watermark_text || undefined, createdAt: g.created_at });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу" });
  const admin = getAdmin();
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!admin || !jwtSecret) return res.status(503).json({ ok: false, error: "Галерея временно недоступна" });
  const body = readJsonBody(req);
  const link = body.action === "open" ? await access(admin, body.token, body.password) : await ticketAccess(admin, body.accessTicket);
  if (!link) return res.status(404).json({ ok: false, reason: "notfound" });
  if (link.password) return res.status(403).json({ ok: false, reason: "password" });
  if (body.galleryId && body.galleryId !== link.gallery_id) return res.status(403).json({ ok: false });
  const viewerKey = `share:${sha256(link.id).slice(0, 32)}`;

  if (body.action === "open") {
    const [{ data: gallery }, { data: assets }, { data: albums }, { data: selections }, { data: comments }] = await Promise.all([
      admin.from("galleries").select("*").eq("id", link.gallery_id).eq("published", true).maybeSingle(),
      admin.from("assets").select("*").eq("gallery_id", link.gallery_id).order("sort_order"),
      admin.from("albums").select("*").eq("gallery_id", link.gallery_id).order("sort_order"),
      admin.from("selections").select("*").eq("gallery_id", link.gallery_id).eq("viewer_key", viewerKey),
      admin.from("photo_comments").select("id,gallery_id,asset_id,viewer_key,author_name,text,created_at").eq("gallery_id", link.gallery_id).order("created_at"),
    ]);
    if (!gallery) return res.status(404).json({ ok: false, reason: "notfound" });
    const accessTicket = signSupabaseJwt({ sub: "00000000-0000-0000-0000-000000000000", gallery_access: true, gallery_id: link.gallery_id, share_id: link.id }, jwtSecret, 60 * 60);
    return res.status(200).json({ ok: true, gallery: galleryDto(gallery), assets: (assets || []).map(assetDto), albums: (albums || []).map((a) => ({ id: a.id, galleryId: a.gallery_id, title: a.title, coverAssetId: a.cover_asset_id || undefined, sortOrder: a.sort_order || 0, createdAt: a.created_at })), selections: selections || [], comments: comments || [], canDownload: Boolean(link.can_download), accessTicket });
  }

  const { data: asset } = await admin.from("assets").select("id").eq("id", body.assetId).eq("gallery_id", link.gallery_id).maybeSingle();
  if (!asset) return res.status(400).json({ ok: false, error: "Файл не относится к галерее" });

  if (body.action === "toggle") {
    if (!kinds.has(body.kind)) return res.status(400).json({ ok: false });
    const { data: existing } = await admin.from("selections").select("id").eq("gallery_id", link.gallery_id).eq("asset_id", asset.id).eq("viewer_key", viewerKey).eq("kind", body.kind).maybeSingle();
    if (existing) { await admin.from("selections").delete().eq("id", existing.id); return res.status(200).json({ ok: true, on: false }); }
    await admin.from("selections").insert({ gallery_id: link.gallery_id, asset_id: asset.id, viewer_key: viewerKey, kind: body.kind });
    return res.status(200).json({ ok: true, on: true });
  }

  if (body.action === "comment") {
    if (!rateLimit(`gallery-comment:${requestIp(req)}:${link.gallery_id}`, { limit: 10, windowMs: 10 * 60 * 1000 })) return res.status(429).json({ ok: false, error: "Слишком много комментариев" });
    const text = cleanText(body.text, 1000);
    const authorName = cleanText(body.authorName || "Гость", 80);
    if (text.length < 1) return res.status(400).json({ ok: false });
    const { data, error } = await admin.from("photo_comments").insert({ gallery_id: link.gallery_id, asset_id: asset.id, viewer_key: viewerKey, author_name: authorName, text }).select("id,gallery_id,asset_id,viewer_key,author_name,text,created_at").single();
    if (error) return res.status(500).json({ ok: false, error: "Не удалось сохранить комментарий" });
    return res.status(200).json({ ok: true, comment: data });
  }

  if (body.action === "delete-comment") {
    const { data } = await admin.from("photo_comments").select("id").eq("id", body.commentId).eq("gallery_id", link.gallery_id).eq("asset_id", asset.id).eq("viewer_key", viewerKey).maybeSingle();
    if (!data) return res.status(404).json({ ok: false });
    await admin.from("photo_comments").delete().eq("id", data.id);
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ ok: false });
}
