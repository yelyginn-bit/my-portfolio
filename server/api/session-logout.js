import { clearSecureCookie, verifyCsrf } from "./_lib/security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false });
  clearSecureCookie(res, "yel_session");
  clearSecureCookie(res, "yel_admin_session");
  return res.status(200).json({ ok: true });
}
