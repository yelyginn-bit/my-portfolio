// POST /api/auth-verify  { phone, code, token }
// Проверяет код, помечает запрос подтверждённым, создаёт/находит клиента.
import { getAdmin } from "./_lib/db.js";
import { hasUnexpiredTimestamp, isValidPhone, normalizePhone, readJsonBody, safeEqual, sha256 } from "./_lib/util.js";
import { rateLimit, requestIp, verifyCsrf } from "./_lib/security.js";

// Compare-and-swap сохраняет каждую неудачную попытку и при параллельных запросах.
async function recordFailedAttempt(admin, initial) {
  let row = initial;
  for (let retry = 0; retry < 5; retry += 1) {
    if (!row || row.status !== "pending" || row.used_at || !hasUnexpiredTimestamp(row.expires_at)) return;
    const attempts = Number(row.attempts);
    if (!Number.isInteger(attempts) || attempts < 0 || attempts >= 5) return;
    const updated = await admin.from("auth_otp")
      .update({ attempts: attempts + 1 }).eq("id", row.id).eq("status", "pending")
      .is("used_at", null).eq("attempts", attempts).gt("expires_at", new Date().toISOString())
      .select("id").maybeSingle();
    if (updated.data || updated.error) return;
    const current = await admin.from("auth_otp").select("id,status,used_at,attempts,expires_at").eq("id", row.id).maybeSingle();
    if (current.error) return;
    row = current.data;
  }
}

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

  if (!isValidPhone(p) || typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)
    || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    return res.status(400).json({ ok: false, error: genericError });
  }

  const admin = getAdmin();
  if (!admin) return res.status(200).json({ ok: false, mode: "local" });

  const { data: row } = await admin
    .from("auth_otp")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!row || row.phone !== p || row.status !== "pending" || row.used_at
    || !hasUnexpiredTimestamp(row.expires_at) || !Number.isInteger(row.attempts)
    || row.attempts < 0 || row.attempts >= 5) {
    return res.status(400).json({ ok: false, error: genericError });
  }
  if (!row.code_hash || !safeEqual(sha256(code.trim()), row.code_hash)) {
    await recordFailedAttempt(admin, row);
    await admin.from("security_events").insert({ event_type: "otp_verify_failed", subject_hash: sha256(p), ip, user_agent: String(req.headers?.["user-agent"] || "").slice(0, 400), details: { token_hash: sha256(token) } });
    return res.status(400).json({ ok: false, error: genericError });
  }

  // Проверка и одноразовое погашение должны быть одной операцией БД.
  const confirmed = await admin.from("auth_otp")
    .update({ status: "confirmed", used_at: new Date().toISOString() })
    .eq("id", row.id).eq("phone", p).eq("status", "pending").is("used_at", null)
    .lt("attempts", 5).gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
  if (!confirmed.data || confirmed.error) return res.status(400).json({ ok: false, error: genericError });

  // Создать/найти клиента.
  const { data: client } = await admin
    .from("clients")
    .upsert({ phone: p }, { onConflict: "phone" })
    .select()
    .single();

  return res.status(200).json({ ok: true, client: { name: client?.name ?? null } });
}
