// POST /api/admin-login  { password }
// Проверяет пароль админа НА СЕРВЕРЕ и (если задан SUPABASE_JWT_SECRET) выдаёт
// админский JWT (app_role=admin) для записи в защищённые RLS-таблицы.
// Без Supabase просто подтверждает пароль.
// Env: ADMIN_PASSWORD (серверный), SUPABASE_JWT_SECRET.
import { signSupabaseJwt } from "./_lib/jwt.js";
import { readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const { password } = readJsonBody(req);
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(503).json({ ok: false, error: "Админка не настроена" });
  }
  if (!password || password !== expected) return res.status(403).json({ ok: false, error: "Неверный пароль" });

  const secret = process.env.SUPABASE_JWT_SECRET;
  const access_token = secret
    ? signSupabaseJwt({ sub: "00000000-0000-0000-0000-000000000000", app_role: "admin" }, secret, 60 * 60 * 12)
    : undefined;
  return res.status(200).json({ ok: true, access_token });
}
