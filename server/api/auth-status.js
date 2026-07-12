// POST /api/auth-status { token }. Токен не помещается в URL и access logs.
// Опрос статуса входа (для способа «кнопка в боте» и первичной привязки):
// фронт периодически дёргает и при 'confirmed' завершает вход.
import { getAdmin } from "./_lib/db.js";
import { readJsonBody } from "./_lib/util.js";
import { rateLimit, requestIp, verifyCsrf } from "./_lib/security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, status: "unknown" });
  const { token } = readJsonBody(req);
  if (!token) return res.status(400).json({ ok: false, error: "no token" });
  if (!rateLimit(`auth-status:${requestIp(req)}:${String(token).slice(0, 24)}`, { limit: 60, windowMs: 5 * 60 * 1000 })) return res.status(429).json({ ok: false, status: "unknown" });

  const admin = getAdmin();
  if (!admin) return res.status(200).json({ ok: true, status: "unknown" });

  const { data: row } = await admin
    .from("auth_otp")
    .select("status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!row) return res.status(200).json({ ok: true, status: "unknown" });
  if (new Date(row.expires_at).getTime() < Date.now())
    return res.status(200).json({ ok: true, status: "expired" });

  return res.status(200).json({ ok: true, status: row.status });
}
