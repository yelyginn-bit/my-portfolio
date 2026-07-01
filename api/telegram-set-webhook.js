// GET /api/telegram-set-webhook?secret=<TELEGRAM_WEBHOOK_SECRET>
// Разовая установка вебхука бота на этот деплой. Открыть в браузере один раз
// после деплоя (и после смены домена). Защищено секретом.
import { tg, botToken } from "./_lib/telegram.js";

export default async function handler(req, res) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (!secret || req.query?.secret !== secret) {
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
  return res.status(200).json({ ok: true, webhook: url, telegram: result });
}
