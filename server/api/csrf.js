import { issueCsrf } from "./_lib/security.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  return res.status(200).json({ ok: true, csrfToken: issueCsrf(res) });
}
