// GET /api/auth-status?token=...
// Опрос статуса входа (для способа «кнопка в боте» и первичной привязки):
// фронт периодически дёргает и при 'confirmed' завершает вход.
import { getAdmin } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const token = req.query?.token;
  if (!token) return res.status(400).json({ ok: false, error: "no token" });

  const admin = getAdmin();
  if (!admin) return res.status(200).json({ ok: true, status: "unknown" });

  const { data: row } = await admin
    .from("auth_otp")
    .select("status, phone, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!row) return res.status(200).json({ ok: true, status: "unknown" });
  if (new Date(row.expires_at).getTime() < Date.now())
    return res.status(200).json({ ok: true, status: "expired" });

  let name = null;
  if (row.status === "confirmed") {
    const { data: client } = await admin.from("clients").select("name").eq("phone", row.phone).maybeSingle();
    name = client?.name ?? null;
  }
  return res.status(200).json({ ok: true, status: row.status, phone: row.phone, name });
}
