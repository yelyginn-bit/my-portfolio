// Общие утилиты для serverless-эндпоинтов (Node, ESM).
import crypto from "node:crypto";

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

/** 6-значный одноразовый код из криптографически стойкого ГСЧ. */
export function genCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/** Случайный токен для deep-link / опроса статуса. */
export function genToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function hashPassword(value) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(value), salt, 32);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(value, encoded) {
  const [algorithm, saltValue, hashValue] = String(encoded || "").split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return safeEqual(String(encoded || ""), String(value || ""));
  try {
    const expected = Buffer.from(hashValue, "base64url");
    const actual = crypto.scryptSync(String(value || ""), Buffer.from(saltValue, "base64url"), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
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
