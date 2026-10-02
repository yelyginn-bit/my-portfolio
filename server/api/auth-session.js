// POST /api/auth-session  { phone, token }
// После подтверждённого OTP выдаёт клиенту Supabase-совместимый JWT (sub = clients.user_id),
// чтобы RLS применялась по auth.uid(). Gated: нужны Supabase (service_role) + SUPABASE_JWT_SECRET.
import crypto from "crypto";
import { getAdmin } from "./_lib/db.js";
import { signSupabaseJwt } from "./_lib/jwt.js";
import { hasUnexpiredTimestamp, isValidPhone, normalizePhone, readJsonBody } from "./_lib/util.js";
import { setSecureCookie, verifyCsrf } from "./_lib/security.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false });

  const secret = process.env.SUPABASE_JWT_SECRET;
  const admin = getAdmin();
  if (!secret || !admin) return res.status(200).json({ ok: false, reason: "not_configured" });

  const { phone, token } = readJsonBody(req);
  const p = normalizePhone(phone);

  if (!isValidPhone(p) || typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return res.status(403).json({ ok: false, error: "not confirmed" });
  }

  // Проверяем, что OTP по этому токену реально подтверждён (сервером/вебхуком).
  const { data: otp } = await admin.from("auth_otp").select("phone,status,used_at,session_issued_at,expires_at").eq("token", token).maybeSingle();
  if (!otp || otp.phone !== p || otp.status !== "confirmed" || !otp.used_at || otp.session_issued_at || !hasUnexpiredTimestamp(otp.expires_at)) {
    return res.status(403).json({ ok: false, error: "not confirmed" });
  }

  // Гарантируем клиента и стабильный user_id (= sub в JWT).
  let { data: client } = await admin.from("clients").select("id,user_id").eq("phone", p).maybeSingle();
  if (!client) {
    const ins = await admin.from("clients").insert({ phone: p }).select("id,user_id").single();
    client = ins.data;
  }
  if (!client) return res.status(503).json({ ok: false, error: "not confirmed" });
  if (!client.user_id) {
    const assigned = await admin.from("clients").update({ user_id: crypto.randomUUID() })
      .eq("id", client.id).is("user_id", null).select("id,user_id").maybeSingle();
    if (assigned.error) return res.status(503).json({ ok: false, error: "not confirmed" });
    client = assigned.data || (await admin.from("clients").select("id,user_id").eq("id", client.id).maybeSingle()).data;
  }
  if (!client?.user_id) return res.status(503).json({ ok: false, error: "not confirmed" });
  const userId = client.user_id;

  const issued = await admin.from("auth_otp")
    .update({ session_issued_at: new Date().toISOString(), status: "used" })
    .eq("token", token).eq("phone", p).eq("status", "confirmed")
    .not("used_at", "is", null).is("session_issued_at", null)
    .gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
  if (!issued.data || issued.error) return res.status(403).json({ ok: false, error: "not confirmed" });
  const access_token = signSupabaseJwt({ sub: userId }, secret, 60 * 60 * 8);
  setSecureCookie(res, "yel_session", access_token, 60 * 60 * 8);
  return res.status(200).json({ ok: true, access_token });
}
