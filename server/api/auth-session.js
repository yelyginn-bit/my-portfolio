// POST /api/auth-session  { phone, token }
// После подтверждённого OTP выдаёт клиенту Supabase-совместимый JWT (sub = clients.user_id),
// чтобы RLS применялась по auth.uid(). Gated: нужны Supabase (service_role) + SUPABASE_JWT_SECRET.
import crypto from "crypto";
import { getAdmin } from "./_lib/db.js";
import { signSupabaseJwt } from "./_lib/jwt.js";
import { normalizePhone, readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const secret = process.env.SUPABASE_JWT_SECRET;
  const admin = getAdmin();
  if (!secret || !admin) return res.status(200).json({ ok: false, reason: "not_configured" });

  const { phone, token } = readJsonBody(req);
  const p = normalizePhone(phone);

  // Проверяем, что OTP по этому токену реально подтверждён (сервером/вебхуком).
  const { data: otp } = await admin.from("auth_otp").select("phone,status").eq("token", token).maybeSingle();
  if (!otp || otp.phone !== p || otp.status !== "confirmed") {
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

  const access_token = signSupabaseJwt({ sub: userId, phone: p }, secret);
  return res.status(200).json({ ok: true, access_token });
}
