// POST /api/auth-session  { phone, token }
// После подтверждённого OTP выдаёт клиенту Supabase-совместимый JWT (sub = clients.user_id),
// чтобы RLS применялась по auth.uid(). Gated: нужны Supabase (service_role) + SUPABASE_JWT_SECRET.
import crypto from "crypto";
import { getAdmin } from "./_lib/db.js";
import { signSupabaseJwt } from "./_lib/jwt.js";
import { normalizePhone, readJsonBody } from "./_lib/util.js";
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

  // Проверяем, что OTP по этому токену реально подтверждён (сервером/вебхуком).
  const { data: otp } = await admin.from("auth_otp").select("phone,status,used_at,session_issued_at,expires_at").eq("token", token).maybeSingle();
  if (!otp || otp.phone !== p || otp.status !== "confirmed" || !otp.used_at || otp.session_issued_at || new Date(otp.expires_at).getTime() < Date.now()) {
    return res.status(403).json({ ok: false, error: "not confirmed" });
  }

  // Гарантируем клиента и стабильный user_id (= sub в JWT).
  let { data: client } = await admin.from("clients").select("id,user_id").eq("phone", p).maybeSingle();
  if (!client) {
    const ins = await admin.from("clients").insert({ phone: p }).select("id,user_id").single();
    client = ins.data;
  }
  let userId = client.user_id;
  if (!userId) {
    userId = crypto.randomUUID();
    await admin.from("clients").update({ user_id: userId }).eq("id", client.id);
  }

  const issued = await admin.from("auth_otp").update({ session_issued_at: new Date().toISOString(), status: "used" }).eq("token", token).is("session_issued_at", null).select("id").maybeSingle();
  if (!issued.data) return res.status(403).json({ ok: false, error: "not confirmed" });
  const access_token = signSupabaseJwt({ sub: userId }, secret, 60 * 60 * 8);
  setSecureCookie(res, "yel_session", access_token, 60 * 60 * 8);
  return res.status(200).json({ ok: true, access_token });
}
