// Prepared only: this app is deliberately absent from production-server.js,
// the API router, PM2 and nginx. Enabling it requires a separate release.
import express from "express";
import { isIP } from "node:net";
import sendForm from "./api/send-form.js";
import csrf from "./api/csrf.js";
import { createSmtpLeadHandler } from "./lead-smtp-handler.js";
import { smtpConfigured } from "./lead-smtp-transport.js";
import { isAbsolute } from "node:path";

export function createVpsLeadApp({ env = process.env, handlers, smtp = {} } = {}) {
  const channel = env.LEAD_DELIVERY_CHANNEL || "smtp-yandex";
  const selected = handlers || { csrf, sendForm: channel === "smtp-yandex" ? createSmtpLeadHandler({ env, ...smtp }) : sendForm };
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  // Missing configuration must never silently bypass the consent journal or
  // forward back to Vercel. Presence is not proof of database/delivery health.
  app.use((req, res, next) => {
    const configured = env.LEAD_VPS_ENABLED === "true"
      && (channel === "smtp-yandex"
        ? smtpConfigured(env) && isAbsolute(env.LEAD_JOURNAL_DIR || "") && env.LEAD_TELEGRAM_ENABLED !== "true"
        : channel === "legacy" && env.LEAD_TELEGRAM_ENABLED === "true" && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
      && (env.SUPABASE_URL || env.VITE_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY
      && env.LEAD_RELAY_ENABLED !== "true";
    if (!configured) return res.status(503).json({ ok: false, error: "Сервис заявок не включён" });
    if (req.headers.origin && req.headers.origin !== "https://yelyginn.ru") {
      return res.status(403).json({ ok: false, error: "Недопустимый источник запроса" });
    }
    next();
  });
  app.use(express.json({ limit: "32kb", strict: true }));
  // The existing handler retains CSRF, consent versions, validation, limits,
  // atomic record_lead_with_consent and the Telegram response check.
  app.all("/api/csrf", (req, res, next) => Promise.resolve(selected.csrf(req, res)).catch(next));
  app.all("/api/send-form", (req, res, next) => {
    req.headers["x-forwarded-for"] = isIP(req.ip) ? req.ip : req.socket.remoteAddress;
    return Promise.resolve(selected.sendForm(req, res)).catch(next);
  });
  app.use((_req, res) => res.status(404).json({ ok: false }));
  app.use((error, _req, res, _next) => res.status(error.status === 413 ? 413 : error.status === 400 ? 400 : 500).json({ ok: false, error: "Не удалось обработать заявку" }));
  return app;
}
