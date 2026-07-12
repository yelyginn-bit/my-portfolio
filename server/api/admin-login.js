// POST /api/admin-login  { password }
// Проверяет пароль админа НА СЕРВЕРЕ и (если задан SUPABASE_JWT_SECRET) выдаёт
// админский JWT (app_role=admin) для записи в защищённые RLS-таблицы.
// Без Supabase просто подтверждает пароль.
// Env: ADMIN_PASSWORD (серверный), SUPABASE_JWT_SECRET.
import { signSupabaseJwt } from "./_lib/jwt.js";
import { readJsonBody, safeEqual } from "./_lib/util.js";
import { rateLimit, requestIp, setSecureCookie, verifyCsrf } from "./_lib/security.js";
import { verifyTotp } from "./_lib/totp.js";
import { getAdmin } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Не удалось выполнить вход" });

  const { password, totp } = readJsonBody(req);
  const expected = process.env.ADMIN_PASSWORD;
  const ip = requestIp(req);
  if (!rateLimit(`admin-login:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })) {
    return res.status(429).json({ ok: false, error: "Не удалось выполнить вход" });
  }
  if (!expected) {
    return res.status(503).json({ ok: false, error: "Не удалось выполнить вход" });
  }
  if (!password || !safeEqual(password, expected)) {
    getAdmin()?.from("security_events").insert({ event_type: "admin_login_failed", ip, user_agent: String(req.headers?.["user-agent"] || "").slice(0, 400) }).then(() => {}).catch(() => {});
    return res.status(403).json({ ok: false, error: "Не удалось выполнить вход" });
  }
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (totpSecret && !totp) return res.status(200).json({ ok: false, requiresSecondFactor: true });
  if (totpSecret && !verifyTotp(totpSecret, totp)) return res.status(403).json({ ok: false, requiresSecondFactor: true, error: "Не удалось выполнить вход" });
  if (process.env.ADMIN_2FA_REQUIRED === "true" && !totpSecret) return res.status(503).json({ ok: false, error: "Не удалось выполнить вход" });

  const secret = process.env.SUPABASE_JWT_SECRET;
  const access_token = secret
    ? signSupabaseJwt({ sub: "00000000-0000-0000-0000-000000000000", app_role: "admin" }, secret, 60 * 60 * 2)
    : undefined;
  if (access_token) setSecureCookie(res, "yel_admin_session", access_token, 60 * 60 * 2);
  return res.status(200).json({ ok: true, access_token });
}
