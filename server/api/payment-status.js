// POST /api/payment-status { paymentId, orderId }. Идентификаторы не пишутся в URL.
// Опрос статуса платежа (для СБП — пока плательщик сканирует QR и платит).
// При succeeded помечает заказ оплаченным (на случай, если вебхук задержался).
import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { readJsonBody } from "./_lib/util.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу" });
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET;
  const { paymentId, orderId } = readJsonBody(req);
  const admin = getAdmin();
  const claims = verifySupabaseJwt(parseCookies(req).yel_session, process.env.SUPABASE_JWT_SECRET);
  if (!claims?.sub || !admin) return res.status(401).json({ ok: false, error: "Требуется вход" });
  if (!shopId || !secret) return res.status(200).json({ ok: true, status: "unknown" });
  if (!paymentId || !orderId) return res.status(400).json({ ok: false, error: "Некорректный запрос" });
  const { data: attempt } = await admin.from("payment_attempts").select("*,orders!inner(client_id,total,clients!inner(user_id))").eq("provider_payment_id", paymentId).eq("order_id", orderId).maybeSingle();
  if (!attempt || attempt.orders?.clients?.user_id !== claims.sub) return res.status(404).json({ ok: false, error: "Платёж не найден" });

  try {
    const auth = Buffer.from(`${shopId}:${secret}`).toString("base64");
    const r = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const d = await r.json();
    const status = d.status; // pending | waiting_for_capture | succeeded | canceled

    if (status === "succeeded" && Number(d.amount?.value) === Number(attempt.amount) && d.amount?.currency === "RUB") {
      await admin.rpc("finalize_verified_payment", { p_provider: "yookassa", p_provider_payment_id: paymentId, p_order_id: orderId, p_amount: Number(attempt.amount), p_currency: "RUB" });
    }
    return res.status(200).json({ ok: true, status });
  } catch {
    return res.status(500).json({ ok: false, error: "Не удалось проверить платёж" });
  }
}
