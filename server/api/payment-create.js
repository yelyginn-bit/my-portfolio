// POST /api/payment-create  { orderId, method }
// method: "card" (по умолч., редирект на форму) | "sbp" (СБП — возвращаем QR).
// При СБП плательщик сканирует QR любым банковским приложением и платит через
// Систему быстрых платежей (банк выбирается в приложении плательщика).
// Без ЮKassa имитация оплаты доступна только в локальном dev-режиме.
// Env: YOOKASSA_SHOP_ID, YOOKASSA_SECRET (в ЛК ЮKassa должен быть включён метод СБП).
import { readJsonBody } from "./_lib/util.js";
import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";
import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET;
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      configured: Boolean(shopId && secret),
      available: Boolean(shopId && secret) || !isProduction,
    });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { orderId, method } = readJsonBody(req);
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу и повторите" });
  const admin = getAdmin();
  const session = verifySupabaseJwt(parseCookies(req).yel_session, process.env.SUPABASE_JWT_SECRET);
  if (!admin || !session?.sub) return res.status(401).json({ ok: false, error: "Требуется вход" });
  if (!orderId || !["card", "sbp"].includes(method || "card")) return res.status(400).json({ ok: false, error: "Некорректный запрос" });

  const { data: order } = await admin.from("orders").select("id,total,currency,status,client_id,clients!inner(user_id)").eq("id", orderId).maybeSingle();
  if (!order || order.clients?.user_id !== session.sub || !["new", "confirmed"].includes(order.status) || Number(order.total) <= 0) {
    return res.status(404).json({ ok: false, error: "Заказ недоступен для оплаты" });
  }

  if (!shopId || !secret) {
    if (isProduction) {
      return res.status(503).json({ ok: false, error: "Оплата временно недоступна" });
    }
    return res.status(200).json({ ok: true, mock: true, method: method || "card" });
  }
  const isSbp = method === "sbp";
  const amount = Number(order.total);
  const description = `Заказ ${order.id}`;
  const idempotenceKey = crypto.createHash("sha256").update(`${order.id}:${amount}:${method || "card"}`).digest("hex");
  const { data: existing } = await admin.from("payment_attempts").select("provider_payment_id,status").eq("idempotence_key", idempotenceKey).maybeSingle();
  if (existing?.provider_payment_id && existing.status !== "failed") return res.status(409).json({ ok: false, error: "Платёж уже создан. Обновите статус заказа." });
  await admin.from("payment_attempts").upsert({ order_id: order.id, provider: "yookassa", idempotence_key: idempotenceKey, amount, currency: "RUB", method: method || "card", status: "creating", updated_at: new Date().toISOString() }, { onConflict: "idempotence_key" });
  const payload = {
    amount: { value: Number(amount).toFixed(2), currency: "RUB" },
    capture: true,
    description,
    metadata: { orderId },
    ...(isSbp
      ? { payment_method_data: { type: "sbp" }, confirmation: { type: "qr" } }
      : { confirmation: { type: "redirect", return_url: "https://yelyginn.ru/account" } }),
  };

  try {
    const auth = Buffer.from(`${shopId}:${secret}`).toString("base64");
    const r = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.id) {
      await admin.from("payment_attempts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("idempotence_key", idempotenceKey);
      return res.status(502).json({ ok: false, error: "Платёжный сервис не принял запрос" });
    }
    await admin.from("payment_attempts").update({ provider_payment_id: d.id, status: "pending", updated_at: new Date().toISOString() }).eq("idempotence_key", idempotenceKey);
    return res.status(200).json({
      ok: true,
      paymentId: d.id,
      method: isSbp ? "sbp" : "card",
      // СБП: confirmation_data — строка для QR; иначе — URL формы оплаты.
      qr: isSbp ? d.confirmation?.confirmation_data : undefined,
      confirmationUrl: isSbp ? undefined : d.confirmation?.confirmation_url,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "payment create failed" });
  }
}
