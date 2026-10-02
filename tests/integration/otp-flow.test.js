import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import verify from "../../server/api/auth-verify.js";
import status from "../../server/api/auth-status.js";
import session from "../../server/api/auth-session.js";
import webhook from "../../server/api/telegram-webhook.js";
import { hasUnexpiredTimestamp, sha256 } from "../../server/api/_lib/util.js";

// Exercise the real handlers and Supabase query builder against a local transport.
// Unknown hosts/methods fail rather than sending a request to an external service.
let store;
let calls;
let ordinal = 0;
const clone = (value) => JSON.parse(JSON.stringify(value));
const savedEnv = Object.fromEntries(["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_JWT_SECRET", "TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_BOT_TOKEN"].map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
process.env.SUPABASE_URL = "https://otp-fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-only-no-real-key";
process.env.SUPABASE_JWT_SECRET = "fixture-only-no-real-signing-secret";
process.env.TELEGRAM_WEBHOOK_SECRET = "fixture-webhook";
process.env.TELEGRAM_BOT_TOKEN = "fixture-only";

function matches(row, params) {
  for (const [field, filter] of params) {
    if (["select", "order", "limit", "on_conflict"].includes(field)) continue;
    const actual = row[field] ?? null;
    if (filter === "is.null") { if (actual !== null) return false; continue; }
    if (filter === "not.is.null") { if (actual === null) return false; continue; }
    const at = filter.indexOf(".");
    const op = filter.slice(0, at);
    const expected = filter.slice(at + 1);
    if (op === "eq" && String(actual) !== expected) return false;
    else if (op === "lt" && !(Number(actual) < Number(expected))) return false;
    else if (op === "gt" && !(field.endsWith("_at") ? Date.parse(actual) > Date.parse(expected) : Number(actual) > Number(expected))) return false;
    else if (!["eq", "lt", "gt"].includes(op)) throw new Error(`Unsupported fixture filter ${field}: ${filter}`);
  }
  return true;
}

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : null;
  calls.push({ host: url.host, path: url.pathname, method, body });
  if (url.host === "api.telegram.org" && method === "POST" && /^\/botfixture-only\/(?:sendMessage|answerCallbackQuery)$/.test(url.pathname)) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }
  assert.equal(url.host, "otp-fixture.invalid", "No real network calls are permitted");
  const table = url.pathname.replace("/rest/v1/", "");
  assert.ok(Object.hasOwn(store, table), `Unexpected table ${table}`);
  let result;
  if (method === "GET") result = store[table].filter((row) => matches(row, url.searchParams)).map(clone);
  else if (method === "PATCH") {
    result = store[table].filter((row) => matches(row, url.searchParams)).map((row) => {
      Object.assign(row, body);
      return clone(row);
    });
  } else if (method === "POST") {
    const conflict = url.searchParams.get("on_conflict");
    result = (Array.isArray(body) ? body : [body]).map((entry) => {
      let row = conflict && store[table].find((item) => item[conflict] === entry[conflict]);
      if (row) Object.assign(row, entry);
      else { row = { id: crypto.randomUUID(), ...entry }; store[table].push(row); }
      return clone(row);
    });
  } else throw new Error(`Unexpected fixture method ${method}`);
  const limit = Number(url.searchParams.get("limit"));
  if (limit) result = result.slice(0, limit);
  const accept = new Headers(options.headers).get("Accept") || "";
  return new Response(JSON.stringify(accept.includes("vnd.pgrst.object+json") ? (result[0] ?? null) : result), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
};

test.after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function seed(overrides = {}) {
  ordinal += 1;
  const phone = `799900${String(ordinal).padStart(5, "0")}`;
  const token = crypto.randomBytes(32).toString("base64url");
  const row = { id: crypto.randomUUID(), phone, token, status: "pending", attempts: 0,
    code_hash: sha256("123456"), expires_at: new Date(Date.now() + 300_000).toISOString(),
    used_at: null, session_issued_at: null, ...overrides };
  store = { auth_otp: [row], clients: [{ id: crypto.randomUUID(), phone, user_id: null }], security_events: [], telegram_links: [] };
  calls = [];
  return row;
}

function request(row, body = {}) {
  return { method: "POST", body: { phone: row.phone, token: row.token, code: "123456", ...body },
    headers: { cookie: "yel_csrf=fixture", "x-csrf-token": "fixture", "user-agent": "otp-test" },
    socket: { remoteAddress: `127.0.0.${ordinal}` } };
}
function response() {
  return { statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; }, getHeader(name) { return this.headers[name]; } };
}
async function run(handler, req) { const res = response(); await handler(req, res); return res; }

test("OTP expiry fails closed for malformed, missing and exact-boundary timestamps", async () => {
  const now = Date.now();
  assert.equal(hasUnexpiredTimestamp(new Date(now).toISOString(), now), false);
  assert.equal(hasUnexpiredTimestamp(new Date(now + 1).toISOString(), now), true);
  for (const expiry of [null, "invalid", new Date(now - 1).toISOString()]) {
    const row = seed({ expires_at: expiry });
    const result = await run(verify, request(row));
    assert.equal(result.statusCode, 400);
    assert.equal(row.status, "pending");
    row.status = "confirmed"; row.used_at = new Date().toISOString();
    assert.equal((await run(session, request(row))).statusCode, 403);
    assert.equal(row.session_issued_at, null);
  }
});

test("OTP shape, CSRF, used state and confirmed-without-code cannot authenticate", async () => {
  for (const overrides of [{ status: "confirmed" }, { used_at: new Date().toISOString() }, { attempts: 5 }, { attempts: -1 }]) {
    const row = seed(overrides);
    assert.equal((await run(verify, request(row))).statusCode, 400);
  }
  for (const body of [{ phone: "123" }, { token: "short" }, { code: "12345" }, { code: 123456 }]) {
    const row = seed();
    assert.equal((await run(verify, request(row, body))).statusCode, 400);
    assert.equal(calls.length, 0);
  }
  const row = seed();
  assert.equal((await run(verify, { ...request(row), headers: {} })).statusCode, 403);
  assert.equal(calls.length, 0);
});

test("Five concurrent wrong codes count five database attempts without lost increments", async () => {
  const row = seed();
  const results = await Promise.all(Array.from({ length: 5 }, () => run(verify, request(row, { code: "654321" }))));
  assert.ok(results.every((result) => result.statusCode === 400));
  assert.equal(row.attempts, 5);
  assert.equal(store.security_events.length, 5);
  const sixth = await run(verify, request(row));
  assert.equal(sixth.statusCode, 429);
  assert.equal(row.status, "pending");
});

test("Two simultaneous valid OTP confirmations have exactly one successful consumer", async () => {
  const row = seed();
  const results = await Promise.all([run(verify, request(row)), run(verify, request(row))]);
  assert.equal(results.filter((res) => res.body.ok).length, 1);
  assert.equal(results.filter((res) => res.statusCode === 400).length, 1);
  assert.equal(row.status, "confirmed");
  assert.ok(row.used_at);
  assert.equal((await run(verify, request(row))).body.ok, false);
});

test("Session issued once under concurrency keeps one stable JWT subject and secure cookie", async () => {
  const row = seed({ status: "confirmed", used_at: new Date().toISOString() });
  const results = await Promise.all([run(session, request(row)), run(session, request(row))]);
  const issued = results.filter((res) => res.body.ok);
  assert.equal(issued.length, 1);
  assert.equal(results.filter((res) => res.statusCode === 403).length, 1);
  const payload = JSON.parse(Buffer.from(issued[0].body.access_token.split(".")[1], "base64url"));
  assert.equal(payload.sub, store.clients[0].user_id);
  assert.equal(payload.exp - payload.iat, 8 * 60 * 60);
  assert.match(issued[0].headers["Set-Cookie"], /HttpOnly; Secure; SameSite=Lax/);
  assert.equal(row.status, "used");
  assert.equal((await run(session, request(row))).statusCode, 403);
});

test("Telegram contact requires a matching sender, private chat and valid own phone", async () => {
  for (const change of [
    { contact: { phone_number: "79990000000" } },
    { contact: { phone_number: "79990000000", user_id: 43 } },
    { contact: { phone_number: "bad", user_id: 42 } },
    { chat: { id: 42, type: "group" } },
    { chat: { id: 41, type: "private" } },
    { from: {} },
  ]) {
    seed();
    const message = { chat: { id: 42, type: "private" }, from: { id: 42 }, contact: { user_id: 42, phone_number: "79990000000" }, ...change };
    const res = await run(webhook, { method: "POST", headers: { "x-telegram-bot-api-secret-token": "fixture-webhook" }, body: { message } });
    assert.equal(res.statusCode, 200);
    assert.equal(store.telegram_links.length, 0);
    assert.ok(calls.every((call) => call.host === "api.telegram.org"));
  }
  const row = seed({ chat_id: 42 });
  const message = { chat: { id: 42, type: "private" }, from: { id: 42 }, contact: { user_id: 42, phone_number: row.phone } };
  await run(webhook, { method: "POST", headers: { "x-telegram-bot-api-secret-token": "fixture-webhook" }, body: { message } });
  assert.equal(store.telegram_links.length, 1);
  assert.equal(store.telegram_links[0].phone, row.phone);
  assert.equal(row.status, "confirmed");
  assert.ok(row.used_at);
  assert.equal((await run(session, request(row))).body.ok, true);
});

test("Telegram webhook without its secret cannot access a table or send a message", async () => {
  seed();
  assert.equal((await run(webhook, { method: "POST", headers: {}, body: { message: { contact: {} } } })).statusCode, 401);
  assert.equal(calls.length, 0);
});

test("Status polling rejects malformed tokens and reports invalid expiry as expired", async () => {
  const row = seed({ status: "confirmed", expires_at: "invalid" });
  assert.equal((await run(status, request(row))).body.status, "expired");
  const priorCalls = calls.length;
  assert.equal((await run(status, request(row, { token: "short" }))).statusCode, 400);
  assert.equal(calls.length, priorCalls);
});

test("Telegram button can confirm only its bound private chat, once", async () => {
  for (const variant of ["unbound", "other-user", "group", "expired"]) {
    const row = seed({ chat_id: variant === "unbound" ? null : 42, ...(variant === "expired" ? { expires_at: new Date(0).toISOString() } : {}) });
    const cq = { id: "fixture", data: `confirm_${row.token}`, from: { id: variant === "other-user" ? 43 : 42 }, message: { chat: { id: 42, type: variant === "group" ? "group" : "private" } } };
    await run(webhook, { method: "POST", headers: { "x-telegram-bot-api-secret-token": "fixture-webhook" }, body: { callback_query: cq } });
    assert.equal(row.status, "pending");
  }
  const row = seed({ chat_id: 42 });
  const req = { method: "POST", headers: { "x-telegram-bot-api-secret-token": "fixture-webhook" }, body: { callback_query: { id: "fixture", data: `confirm_${row.token}`, from: { id: 42 }, message: { chat: { id: 42, type: "private" } } } } };
  await run(webhook, req);
  assert.equal(row.status, "confirmed");
  const used = row.used_at;
  await run(webhook, req);
  assert.equal(row.used_at, used);
});
