// POST /api/auth-request { phone }
// Ответ намеренно одинаков для известных и неизвестных номеров. В production
// детали привязки и доставки Telegram наружу не возвращаются.
import { getAdmin } from "./_lib/db.js";
import { botUsername, hasBot, sendLoginCode } from "./_lib/telegram.js";
import { genCode, genToken, isValidPhone, normalizePhone, readJsonBody, sha256 } from "./_lib/util.js";
import { rateLimit, requestIp, verifyCsrf } from "./_lib/security.js";

const TTL_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).json({ ok: true });
  const admin = getAdmin();
  const configured = Boolean(admin && hasBot());
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      configured,
      available: configured || !isProduction,
    });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!verifyCsrf(req)) return res.status(403).json({ ok: false, error: "Обновите страницу" });

  const { phone } = readJsonBody(req);
  const generic = { ok: true, mode: "tg", message: "Если вход доступен, инструкция отправлена в Telegram." };
  if (!isValidPhone(phone)) return res.status(200).json(generic);
  const p = normalizePhone(phone);
  const allowedIp = rateLimit(`otp:ip:${requestIp(req)}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  const allowedPhone = rateLimit(`otp:phone:${p}`, { limit: 3, windowMs: 15 * 60 * 1000 });
  if (!allowedIp || !allowedPhone) return res.status(200).json(generic);

  if (!admin) {
    if (isProduction) {
      return res.status(200).json(generic);
    }
    // Сервер без БД — фронт сам сделает локальный dev-код.
    return res.status(200).json({ ok: true, mode: "local" });
  }

  admin.rpc("cleanup_expired_auth_otp").then(() => {}).catch(() => {});
  const { data: recent } = await admin.from("auth_otp").select("created_at").eq("phone", p).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) return res.status(200).json(generic);

  const token = genToken();
  const code = genCode();
  const expires = new Date(Date.now() + TTL_MS).toISOString();

  // Есть ли привязка к Telegram?
  const { data: link } = await admin
    .from("telegram_links")
    .select("chat_id")
    .eq("phone", p)
    .maybeSingle();

  if (link && hasBot()) {
    await admin.from("auth_otp").insert({
      phone: p, code_hash: sha256(code), token, method: "code", status: "pending", chat_id: link.chat_id, expires_at: expires, request_ip: requestIp(req),
    });
    const deepLink = botUsername() ? `https://t.me/${botUsername()}?start=link_${token}` : null;
    try {
      await sendLoginCode(link.chat_id, code, token);
    } catch {
      // Не отличаем недоступную доставку для существующего номера от обычного
      // ответа: иначе endpoint превращается в средство перебора клиентской базы.
    }
    return res.status(200).json({ ...generic, token, deepLink });
  }

  if (hasBot()) {
    // Привязки нет — отправим на бота для первичной привязки (share contact).
    await admin.from("auth_otp").insert({
      phone: p, token, method: "link", status: "pending", expires_at: expires, request_ip: requestIp(req),
    });
    const deepLink = botUsername()
      ? `https://t.me/${botUsername()}?start=link_${token}`
      : null;
    return res.status(200).json({ ...generic, token, deepLink });
  }

  if (isProduction) {
    return res.status(200).json(generic);
  }

  // Supabase есть, бота нет — локальный dev-код с серверной проверкой.
  await admin.from("auth_otp").insert({
    phone: p, code_hash: sha256(code), token, method: "code", status: "pending", expires_at: expires, request_ip: requestIp(req),
  });
  return res.status(200).json({ ok: true, mode: "dev_server", token, devCode: code });
}
