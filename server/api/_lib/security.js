import crypto from "node:crypto";

const buckets = new Map();

export function requestIp(req) {
  return String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim().slice(0, 120);
}

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const active = (buckets.get(key) || []).filter((stamp) => now - stamp < windowMs);
  if (active.length >= limit) return false;
  active.push(now);
  buckets.set(key, active);
  if (buckets.size > 5000) {
    for (const [bucketKey, stamps] of buckets) if (!stamps.some((stamp) => now - stamp < windowMs)) buckets.delete(bucketKey);
  }
  return true;
}

export function parseCookies(req) {
  return Object.fromEntries(String(req.headers?.cookie || "").split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const at = item.indexOf("=");
    return [decodeURIComponent(at < 0 ? item : item.slice(0, at)), decodeURIComponent(at < 0 ? "" : item.slice(at + 1))];
  }));
}

export function setSecureCookie(res, name, value, maxAgeSec) {
  const cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
  const previous = res.getHeader?.("Set-Cookie");
  res.setHeader("Set-Cookie", previous ? [...(Array.isArray(previous) ? previous : [previous]), cookie] : cookie);
}

export function clearSecureCookie(res, name) {
  setSecureCookie(res, name, "", 0);
}

export function issueCsrf(res) {
  const token = crypto.randomBytes(24).toString("base64url");
  res.setHeader("Set-Cookie", `yel_csrf=${token}; Path=/; Secure; SameSite=Strict; Max-Age=3600`);
  return token;
}

export function verifyCsrf(req) {
  const cookies = parseCookies(req);
  const header = String(req.headers?.["x-csrf-token"] || "");
  if (!cookies.yel_csrf || !header) return false;
  const a = Buffer.from(cookies.yel_csrf);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function publicError(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}
