// POST /api/auth-verify  { phone, code, token }
// Проверяет код, помечает запрос подтверждённым, создаёт/находит клиента.
import { getAdmin } from "./_lib/db.js";
import { normalizePhone, readJsonBody, safeEqual, sha256 } from "./_lib/util.js";
import { rateLimit, requestIp, verifyCsrf } from "./_lib/security.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу" });

  const { phone, code, token } = readJsonBody(req);
  const p = normalizePhone(phone);
  const genericError = "Не удалось подтвердить вход. Запросите новый код.";
  const ip = requestIp(req);
  const limitsOk = rateLimit(`verify:ip:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 })
    && rateLimit(`verify:phone:${p}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    && rateLimit(`verify:token:${String(token || "").slice(0, 64)}`, { limit: 5, windowMs: 5 * 60 * 1000 });
  if (!limitsOk) {
    return res.status(429).json({ ok: false, error: genericError });
  }

  const admin = getAdmin();
  if (!admin) return res.status(200).json({ ok: false, mode: "local" });

  const { data: row } = await admin
    .from("auth_otp")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!row || row.phone !== p) return res.status(400).json({ ok: false, error: genericError });
  if (new Date(row.expires_at).getTime() < Date.now())
    return res.status(400).json({ ok: false, error: genericError });
  if (row.used_at || Number(row.attempts || 0) >= 5) return res.status(400).json({ ok: false, error: genericError });
  if (row.status !== "confirmed") {
    if (!row.code_hash || !safeEqual(sha256(String(code).trim()), row.code_hash)) {
      await admin.from("auth_otp").update({ attempts: Number(row.attempts || 0) + 1 }).eq("id", row.id);
      await admin.from("security_events").insert({ event_type: "otp_verify_failed", subject_hash: sha256(p), ip, user_agent: String(req.headers?.["user-agent"] || "").slice(0, 400), details: { token_hash: sha256(String(token || "")) } });
      return res.status(400).json({ ok: false, error: genericError });
    }
    await admin.from("auth_otp").update({ status: "confirmed", used_at: new Date().toISOString() }).eq("id", row.id);
  } else {
    await admin.from("auth_otp").update({ used_at: new Date().toISOString() }).eq("id", row.id);
  }

  // Создать/найти клиента.
  const { data: client } = await admin
    .from("clients")
    .upsert({ phone: p }, { onConflict: "phone" })
    .select()
    .single();

  return res.status(200).json({ ok: true, client: { name: client?.name ?? null } });
}
