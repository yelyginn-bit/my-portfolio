// Общие утилиты для serverless-эндпоинтов (Node, ESM).

/** Нормализация телефона РФ к 7XXXXXXXXXX (только цифры). */
export function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10) d = "7" + d;
  return d;
}

export function isValidPhone(raw) {
  return /^7\d{10}$/.test(normalizePhone(raw));
}

/** 4-значный код. */
export function genCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Случайный токен для deep-link / опроса статуса. */
export function genToken() {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

export function readJsonBody(req) {
  // Vercel обычно парсит req.body сам; подстрахуемся, если пришла строка.
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}
