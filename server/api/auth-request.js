// POST /api/auth-request  { phone }
// Инициирует вход. Решает по наличию привязки телефон↔Telegram:
//  • привязка есть → бот шлёт код (+ кнопку подтверждения)  → mode:'tg', linked:true
//  • привязки нет  → ссылка на бота для первичной привязки   → mode:'tg', linked:false, deepLink
//  • Supabase есть, бота нет → код на экране только в локальной разработке
//  • Supabase нет → mode:'local' (фронт использует локальный dev-OTP)
import { getAdmin } from "./_lib/db.js";
import { botUsername, hasBot, sendLoginCode } from "./_lib/telegram.js";
import { genCode, genToken, isValidPhone, normalizePhone, readJsonBody } from "./_lib/util.js";

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

  const { phone } = readJsonBody(req);
  if (!isValidPhone(phone)) return res.status(400).json({ ok: false, error: "Некорректный номер" });
  const p = normalizePhone(phone);

  if (!admin) {
    if (isProduction) {
      return res.status(503).json({
        ok: false,
        error: "Личный кабинет временно недоступен",
      });
    }
    // Сервер без БД — фронт сам сделает локальный dev-код.
    return res.status(200).json({ ok: true, mode: "local" });
  }

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
      phone: p, code, token, method: "code", status: "pending", chat_id: link.chat_id, expires_at: expires,
    });
    try {
      await sendLoginCode(link.chat_id, code, token);
    } catch (e) {
      return res.status(502).json({ ok: false, error: "Не удалось отправить код в Telegram" });
    }
    return res.status(200).json({ ok: true, mode: "tg", linked: true, token });
  }

  if (hasBot()) {
    // Привязки нет — отправим на бота для первичной привязки (share contact).
    await admin.from("auth_otp").insert({
      phone: p, token, method: "link", status: "pending", expires_at: expires,
    });
    const deepLink = botUsername()
      ? `https://t.me/${botUsername()}?start=link_${token}`
      : null;
    return res.status(200).json({ ok: true, mode: "tg", linked: false, token, deepLink });
  }

  if (isProduction) {
    return res.status(503).json({
      ok: false,
      error: "Вход временно недоступен: Telegram-бот не настроен",
    });
  }

  // Supabase есть, бота нет — локальный dev-код с серверной проверкой.
  await admin.from("auth_otp").insert({
    phone: p, code, token, method: "code", status: "pending", expires_at: expires,
  });
  return res.status(200).json({ ok: true, mode: "dev_server", token, devCode: code });
}
