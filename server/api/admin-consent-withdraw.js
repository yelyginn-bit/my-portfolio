import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, verifyCsrf } from "./_lib/security.js";
import { readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false });
  const claims = verifySupabaseJwt(parseCookies(req).yel_admin_session, process.env.SUPABASE_JWT_SECRET);
  if (claims?.app_role !== "admin") return res.status(401).json({ ok: false });
  const { leadId } = readJsonBody(req); const admin = getAdmin();
  if (!admin || !leadId) return res.status(400).json({ ok: false });
  const { data: lead } = await admin.from("leads").select("consent_event_id").eq("id", leadId).maybeSingle();
  if (!lead?.consent_event_id) return res.status(404).json({ ok: false, error: "Событие согласия не найдено" });
  const now = new Date().toISOString();
  await admin.from("consent_events").update({ withdrawn_at: now }).eq("id", lead.consent_event_id).is("withdrawn_at", null);
  await admin.from("admin_actions").insert({ actor: "admin", action: "consent.withdraw", entity_type: "consent_event", entity_id: lead.consent_event_id, after: { withdrawn_at: now } });
  return res.status(200).json({ ok: true, withdrawnAt: now });
}
