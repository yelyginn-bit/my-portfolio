// POST /api/upload-url  { key, contentType }
// Возвращает presigned PUT-URL для прямой загрузки файла в R2 с клиента.
import { presign, r2Config } from "./_lib/r2.js";
import { readJsonBody } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const cfg = r2Config();
  if (!cfg) return res.status(501).json({ ok: false, error: "R2 не настроен (см. .env.example)" });

  const { key } = readJsonBody(req);
  if (!key || typeof key !== "string") return res.status(400).json({ ok: false, error: "no key" });

  try {
    const url = await presign(cfg, "PUT", key, 600);
    return res.status(200).json({ ok: true, url });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "presign failed" });
  }
}
