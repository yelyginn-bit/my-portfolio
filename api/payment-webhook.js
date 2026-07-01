// POST /api/payment-webhook — уведомление ЮKassa о платеже.
// Для безопасности перепроверяем статус платежа через API ЮKassa, затем
// помечаем заказ оплаченным (payments + orders.status='confirmed') через service role.
import { getAdmin } from "./_lib/db.js";
import { tg, hasBot } from "./_lib/telegram.js";

// Уведомить админа об оплате + записать в журнал notifications (best-effort).
async function notifyPayment(admin, orderId, amount, paymentId) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  let status = "pending";
  if (hasBot() && chatId) {
    try {
      const d = await tg("sendMessage", {
        chat_id: chatId,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        text: `💳 <b>payment.succeeded</b>\n\nЗаказ <code>${orderId}</code> оплачен: ${amount} ₽`,
      });
      status = d.ok ? "sent" : "failed";
    } catch { status = "failed"; }
  }
  if (admin) {
    try {
      await admin.from("notifications").insert({
        type: "payment.succeeded", channel: "telegram",
        entity_type: "order", entity_id: orderId,
        payload: { amount, paymentId }, status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      });
    } catch { /* журнал недоступен — оплата уже проведена */ }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET;
  const admin = getAdmin();
  const body = req.body || {};

  try {
    const event = body.event;
    const obj = body.object || {};
    if (event !== "payment.succeeded" || !obj.id) return res.status(200).json({ ok: true });

    // Перепроверка статуса напрямую у ЮKassa (не доверяем телу запроса).
    let confirmed = obj.status === "succeeded";
    let orderId = obj.metadata?.orderId;
    if (shopId && secret) {
      const auth = Buffer.from(`${shopId}:${secret}`).toString("base64");
      const r = await fetch(`https://api.yookassa.ru/v3/payments/${obj.id}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const d = await r.json();
      confirmed = d.status === "succeeded";
      orderId = d.metadata?.orderId || orderId;
    }

    if (confirmed && orderId && admin) {
      const { data: order } = await admin.from("orders").select("total").eq("id", orderId).maybeSingle();
      await admin.from("payments").insert({
        order_id: orderId,
        provider: "yookassa",
        provider_payment_id: obj.id,
        amount: order?.total ?? 0,
        currency: "RUB",
        status: "succeeded",
        paid_at: new Date().toISOString(),
      });
      await admin.from("orders").update({ status: "confirmed" }).eq("id", orderId);
      await notifyPayment(admin, orderId, order?.total ?? 0, obj.id);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true }); // не зацикливать ретраи
  }
}
