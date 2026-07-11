// POST /api/notify — доставка уведомления админу в Telegram (TELEGRAM_CHAT_ID).
// Используется клиентским src/lib/notify.ts для событий lead.new / gallery.shared и т.п.
// Платежи уведомляются прямо из api/payment-webhook.js (там есть проверенный статус).
import { tg, hasBot } from "./_lib/telegram.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";

const escapeHtml = (t) =>
  String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ICON = {
  "lead.new": "📩",
  "gallery.shared": "🔗",
  "payment.succeeded": "💳",
  "comment.new": "💬",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false });
  const claims = verifySupabaseJwt(parseCookies(req).yel_admin_session, process.env.SUPABASE_JWT_SECRET);
  if (claims?.app_role !== "admin") return res.status(401).json({ ok: false });

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!hasBot() || !chatId) {
    // Бот/чат не настроены — не ошибка вызова, просто доставки нет.
    return res.status(200).json({ ok: false, reason: "telegram not configured" });
  }

  try {
    const { type, text } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, reason: "no text" });
    const icon = ICON[type] || "🔔";
    const body = `${icon} <b>${escapeHtml(type || "событие")}</b>\n\n${escapeHtml(String(text).slice(0, 1500))}`;
    const d = await tg("sendMessage", {
      chat_id: chatId,
      text: body,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return res.status(200).json({ ok: !!d.ok });
  } catch (e) {
    return res.status(200).json({ ok: false, error: "delivery failed" });
  }
}
