// POST /api/payment-create  { orderId, amount, description, returnUrl, method }
// method: "card" (по умолч., редирект на форму) | "sbp" (СБП — возвращаем QR).
// При СБП плательщик сканирует QR любым банковским приложением и платит через
// Систему быстрых платежей (банк выбирается в приложении плательщика).
// Без ЮKassa имитация оплаты доступна только в локальном dev-режиме.
// Env: YOOKASSA_SHOP_ID, YOOKASSA_SECRET (в ЛК ЮKassa должен быть включён метод СБП).
import { readJsonBody } from "./_lib/util.js";

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

  const { orderId, amount, description, returnUrl, method } = readJsonBody(req);

  if (!shopId || !secret) {
    if (isProduction) {
      return res.status(503).json({ ok: false, error: "Оплата временно недоступна" });
    }
    return res.status(200).json({ ok: true, mock: true, method: method || "card" });
  }
  if (!orderId || !amount) return res.status(400).json({ ok: false, error: "orderId/amount required" });

  const isSbp = method === "sbp";
  const payload = {
    amount: { value: Number(amount).toFixed(2), currency: "RUB" },
    capture: true,
    description: description || `Заказ ${orderId}`,
    metadata: { orderId },
    ...(isSbp
      ? { payment_method_data: { type: "sbp" }, confirmation: { type: "qr" } }
      : { confirmation: { type: "redirect", return_url: returnUrl || "https://yelyginn.ru/account" } }),
  };

  try {
    const auth = Buffer.from(`${shopId}:${secret}`).toString("base64");
    const r = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "Idempotence-Key": `${orderId}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.id) return res.status(502).json({ ok: false, error: d.description || "ЮKassa error" });
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
