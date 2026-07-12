// POST /api/telegram-set-webhook с X-Webhook-Secret.
// Разовая установка после деплоя или смены домена. Секрет не помещается в URL.
import { tg, botToken } from "./_lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (!secret || req.headers?.["x-webhook-secret"] !== secret) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  if (!botToken()) return res.status(400).json({ ok: false, error: "TELEGRAM_BOT_TOKEN не задан" });

  const base = process.env.APP_URL || `https://${req.headers.host}`;
  const url = `${base.replace(/\/+$/, "")}/api/telegram-webhook`;

  const result = await tg("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  });
  return res.status(200).json({ ok: Boolean(result?.ok), webhook: url });
}
