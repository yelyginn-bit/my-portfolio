// Read-only bridge for public Yandex Disk folders. No OAuth token is required:
// the server only lists public resources and requests temporary download URLs.
const API = "https://cloud-api.yandex.net/v1/disk/public/resources";
import { rateLimit, requestIp } from "./_lib/security.js";

function validPublicKey(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && ["disk.yandex.ru", "yadi.sk"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function yandex(path, params) {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, String(value));
  });
  return fetch(url, { headers: { Accept: "application/json" } });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!rateLimit(`yandex-disk:${requestIp(req)}`, { limit: 60, windowMs: 10 * 60 * 1000 })) return res.status(429).json({ ok: false, error: "Слишком много запросов" });

  const publicKey = req.query?.publicKey;
  const resourcePath = req.query?.path || "";
  if (!validPublicKey(publicKey)) return res.status(400).json({ ok: false, error: "Некорректная публичная ссылка" });

  try {
    if (req.query?.action === "url") {
      const response = await yandex("/download", { public_key: publicKey, path: resourcePath });
      const data = await response.json();
      if (!response.ok || !data.href) return res.status(502).json({ ok: false, error: "Файл недоступен" });
      return res.status(200).json({ ok: true, url: data.href });
    }

    const response = await yandex("", {
      public_key: publicKey,
      path: resourcePath,
      limit: 1000,
      fields: "name,path,type,size,mime_type,media_type,preview,_embedded.items.name,_embedded.items.path,_embedded.items.type,_embedded.items.size,_embedded.items.mime_type,_embedded.items.media_type,_embedded.items.preview,_embedded.total",
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ ok: false, error: data.message || "Папка недоступна" });

    const items = (data._embedded?.items || []).map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size || 0,
      mimeType: item.mime_type || "",
      mediaType: item.media_type || "",
    }));
    return res.status(200).json({ ok: true, name: data.name, total: data._embedded?.total || 0, items });
  } catch {
    return res.status(500).json({ ok: false, error: "Ошибка подключения к Яндекс Диску" });
  }
}
