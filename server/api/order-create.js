import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";
import { readJsonBody } from "./_lib/util.js";

const PRODUCTS = new Map([
  ["retouch", { title: "Ретушь фото", price: 500 }],
  ["print_a4", { title: "Печать A4", price: 400 }],
  ["extra_photo", { title: "Доп. обработанные фото", price: 600 }],
  ["extra_editing", { title: "Доп. монтаж видео", price: 5000 }],
  ["photobook", { title: "Фотокнига", price: 6000 }],
  ["certificate", { title: "Подарочный сертификат", price: 5000 }],
]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу" });
  const claims = verifySupabaseJwt(parseCookies(req).yel_session, process.env.SUPABASE_JWT_SECRET);
  const admin = getAdmin();
  if (!claims?.sub || !admin) return res.status(401).json({ ok: false, error: "Войдите в личный кабинет" });
  const { galleryId, items } = readJsonBody(req);
  if (!galleryId || !Array.isArray(items) || items.length < 1 || items.length > 20) return res.status(400).json({ ok: false, error: "Некорректный заказ" });
  const normalized = [];
  for (const item of items) {
    const product = PRODUCTS.get(String(item.productId));
    const qty = Number(item.qty);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 100) return res.status(400).json({ ok: false, error: "Некорректный состав заказа" });
    normalized.push({ productId: String(item.productId), title: product.title, qty, unitPrice: product.price, total: product.price * qty });
  }
  const { data: client } = await admin.from("clients").select("id").eq("user_id", claims.sub).maybeSingle();
  if (!client) return res.status(401).json({ ok: false, error: "Войдите в личный кабинет" });
  const { data: gallery } = await admin.from("galleries").select("id,client_id").eq("id", galleryId).maybeSingle();
  if (!gallery || gallery.client_id !== client.id) return res.status(403).json({ ok: false, error: "Галерея недоступна" });
  const total = normalized.reduce((sum, item) => sum + item.total, 0);
  const { data: order, error } = await admin.from("orders").insert({ client_id: client.id, gallery_id: gallery.id, status: "new", subtotal: total, total, currency: "RUB", source: "shop" }).select("id").single();
  if (error || !order) return res.status(500).json({ ok: false, error: "Не удалось создать заказ" });
  const rows = normalized.map((item) => ({ order_id: order.id, kind: "other", title: item.title, qty: item.qty, unit_price: item.unitPrice, total: item.total }));
  const inserted = await admin.from("order_items").insert(rows);
  if (inserted.error) {
    await admin.from("orders").delete().eq("id", order.id);
    return res.status(500).json({ ok: false, error: "Не удалось создать заказ" });
  }
  return res.status(200).json({ ok: true, orderId: order.id });
}
