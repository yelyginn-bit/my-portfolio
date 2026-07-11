import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";
import { readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу" });
  const claims = verifySupabaseJwt(parseCookies(req).yel_admin_session, process.env.SUPABASE_JWT_SECRET);
  if (claims?.app_role !== "admin") return res.status(401).json({ ok: false, error: "Требуется вход" });
  const { orderId, receiptNumber, receiptUrl, deliveryMethod, adminComment } = readJsonBody(req);
  const admin = getAdmin();
  if (!admin || !orderId) return res.status(400).json({ ok: false, error: "Некорректный запрос" });
  const now = new Date().toISOString();
  const { data, error } = await admin.from("orders").update({ receipt_status: "issued", receipt_issued_at: now, receipt_sent_at: now, receipt_number: String(receiptNumber || "").slice(0, 160) || null, receipt_url: /^https:\/\//u.test(String(receiptUrl || "")) ? String(receiptUrl).slice(0, 500) : null, receipt_delivery_method: ["Telegram", "email", "другое"].includes(deliveryMethod) ? deliveryMethod : "другое", receipt_admin_comment: String(adminComment || "").trim().slice(0, 1000) || null }).eq("id", orderId).eq("receipt_status", "pending").select("id").maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: "Не удалось сохранить статус" });
  if (!data) return res.status(409).json({ ok: false, error: "Статус чека уже изменён" });
  return res.status(200).json({ ok: true, receiptStatus: "issued", receiptIssuedAt: now });
}
