// POST /api/auth-verify  { phone, code, token }
// Проверяет код, помечает запрос подтверждённым, создаёт/находит клиента.
import { getAdmin } from "./_lib/db.js";
import { normalizePhone, readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { phone, code, token } = readJsonBody(req);
  const p = normalizePhone(phone);

  const admin = getAdmin();
  if (!admin) return res.status(200).json({ ok: false, mode: "local" });

  const { data: row } = await admin
    .from("auth_otp")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!row || row.phone !== p) return res.status(400).json({ ok: false, error: "Запросите код заново" });
  if (new Date(row.expires_at).getTime() < Date.now())
    return res.status(400).json({ ok: false, error: "Код истёк — запросите новый" });
  if (row.status !== "confirmed") {
    if (!row.code || String(code).trim() !== row.code)
      return res.status(400).json({ ok: false, error: "Неверный код" });
    await admin.from("auth_otp").update({ status: "confirmed" }).eq("id", row.id);
  }

  // Создать/найти клиента.
  const { data: client } = await admin
    .from("clients")
    .upsert({ phone: p }, { onConflict: "phone" })
    .select()
    .single();

  return res.status(200).json({ ok: true, client: { phone: p, name: client?.name ?? null } });
}
