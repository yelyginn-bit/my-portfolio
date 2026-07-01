// GET /api/payment-status?paymentId=...&orderId=...
// Опрос статуса платежа (для СБП — пока плательщик сканирует QR и платит).
// При succeeded помечает заказ оплаченным (на случай, если вебхук задержался).
import { getAdmin } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET;
  const paymentId = req.query?.paymentId;
  const orderId = req.query?.orderId;
  if (!shopId || !secret) return res.status(200).json({ ok: true, status: "unknown" });
  if (!paymentId) return res.status(400).json({ ok: false, error: "paymentId required" });

  try {
    const auth = Buffer.from(`${shopId}:${secret}`).toString("base64");
    const r = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const d = await r.json();
    const status = d.status; // pending | waiting_for_capture | succeeded | canceled

    if (status === "succeeded" && orderId) {
      const admin = getAdmin();
      if (admin) {
        const { data: existing } = await admin
          .from("payments").select("id").eq("provider_payment_id", paymentId).maybeSingle();
        if (!existing) {
          const { data: order } = await admin.from("orders").select("total").eq("id", orderId).maybeSingle();
          await admin.from("payments").insert({
            order_id: orderId, provider: "yookassa", provider_payment_id: paymentId,
            amount: order?.total ?? 0, currency: "RUB", status: "succeeded", paid_at: new Date().toISOString(),
          });
          await admin.from("orders").update({ status: "confirmed" }).eq("id", orderId);
        }
      }
    }
    return res.status(200).json({ ok: true, status });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "status check failed" });
  }
}
