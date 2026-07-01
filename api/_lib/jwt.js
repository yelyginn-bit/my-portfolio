// Подпись JWT (HS256) секретом проекта Supabase — для RLS без Supabase Auth.
// Клиент шлёт такой токен в PostgREST; auth.uid()=sub, auth.jwt()->>'app_role' и т.д.
import crypto from "crypto";

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * payload: { sub, app_role?, phone? } — role/aud/iat/exp проставляются здесь.
 * Возвращает access_token, валидный для Supabase/PostgREST.
 */
export function signSupabaseJwt(payload, secret, expSec = 60 * 60 * 24 * 7) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    aud: "authenticated",
    role: "authenticated", // ВАЖНО: маппится на роль Postgres — всегда authenticated
    iat: now,
    exp: now + expSec,
    ...payload,
  };
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = b64url(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

/**
 * Проверка HS256-токена тем же секретом. Возвращает payload при валидной подписи
 * и непросроченном exp, иначе null. Используется серверными эндпоинтами для
 * авторизации (например, admin-доступ к file-url по claim app_role).
 */
export function verifySupabaseJwt(token, secret) {
  if (!token || !secret) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null;
  return payload;
}
