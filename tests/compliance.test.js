import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { genCode, genToken, hashPassword, verifyPassword } from "../server/api/_lib/util.js";
import { rateLimit } from "../server/api/_lib/security.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("legal sources have no merge markers or template placeholders", () => {
  const files = ["src/legal/main.tsx", "src/config/legal.ts", "legal.html"];
  for (const file of files) assert.doesNotMatch(read(file), /<<<<<<<|>>>>>>>|\[ФИО\]|lorem ipsum/iu);
});

test("analytics requires active consent and excludes private routes", () => {
  const analytics = read("src/lib/analytics.ts");
  assert.match(analytics, /consent\?\.analytics/u);
  assert.match(analytics, /account\|admin\|g/u);
  assert.doesNotMatch(analytics, /contact|phone|email|message|orderId/u);
});

test("cookie center supports reject, settings and withdrawal cleanup", () => {
  const source = read("public/cookie-consent.js");
  assert.match(source, /Только необходимые/u);
  assert.match(source, /Настроить/u);
  assert.match(source, /clearAnalytics/u);
  assert.match(source, /data-cookie-settings/u);
});

test("analytics can be enabled after an earlier rejection", () => {
  const source = read("src/lib/analytics.ts");
  assert.match(source, /addEventListener\(CONSENT_EVENT/u);
  assert.match(source, /if \(analytics\) startAnalytics\(\)/u);
  assert.match(source, /else stopAnalytics\(\)/u);
});

test("analytics accepts only approved goals and sanitized parameters", () => {
  const source = read("src/lib/analytics.ts");
  assert.match(source, /ALLOWED_EVENTS/u);
  assert.match(source, /ALLOWED_PARAMS/u);
  assert.match(source, /page_location/u);
  assert.match(source, /allow_ad_personalization_signals:\s*false/u);
  assert.match(source, /"redacted"/u);
});

test("OTP and access tokens use cryptographic generators", () => {
  const codes = new Set(Array.from({ length: 100 }, () => genCode()));
  assert.ok([...codes].every((code) => /^\d{6}$/u.test(code)));
  assert.ok(codes.size > 90);
  assert.match(genToken(), /^[A-Za-z0-9_-]{40,}$/u);
});

test("rate limiter blocks attempts above limit", () => {
  const key = `test:${Date.now()}`;
  assert.equal(rateLimit(key, { limit: 2, windowMs: 1000 }), true);
  assert.equal(rateLimit(key, { limit: 2, windowMs: 1000 }), true);
  assert.equal(rateLimit(key, { limit: 2, windowMs: 1000 }), false);
});

test("gallery passwords are salted and not stored as plaintext", () => {
  const encoded = hashPassword("gallery-secret");
  assert.notEqual(encoded, "gallery-secret");
  assert.match(encoded, /^scrypt\$/u);
  assert.equal(verifyPassword("gallery-secret", encoded), true);
  assert.equal(verifyPassword("wrong", encoded), false);
  assert.match(read("server/api/admin-share-link.js"), /hashPassword/u);
});

test("RLS migration removes anonymous CRM writes and open selections", () => {
  const sql = read("db/migrations/20260711_legal_security_compliance.sql");
  assert.match(sql, /revoke insert, update, delete on clients, orders/u);
  assert.match(sql, /drop policy if exists selections_all/u);
  assert.doesNotMatch(sql, /create policy selections_all[\s\S]*using \(true\)/iu);
  assert.match(sql, /revoke execute on function gallery_view/u);
});

test("payment create ignores client amount and uses database order total", () => {
  const source = read("server/api/payment-create.js");
  assert.match(source, /Number\(order\.total\)/u);
  assert.doesNotMatch(source, /const \{[^}]*amount[^}]*\} = readJsonBody/u);
  assert.match(source, /payment_attempts/u);
});

test("webhook verifies amount, currency and idempotency", () => {
  const source = read("server/api/payment-webhook.js");
  const migration = read("db/migrations/20260711_legal_security_compliance.sql");
  assert.match(source, /providerAmount/u);
  assert.match(source, /providerCurrency !== "RUB"/u);
  assert.match(source, /finalize_verified_payment/u);
  assert.match(migration, /for update/u);
  assert.match(migration, /exists\(select 1 from payments/u);
});

test("manual receipt flow never claims automatic tax receipt", () => {
  const legal = read("src/legal/main.tsx");
  const webhook = read("server/api/payment-webhook.js");
  const migration = read("db/migrations/20260711_legal_security_compliance.sql");
  assert.match(legal, /вручную сформирует чек/u);
  assert.match(webhook, /finalize_verified_payment/u);
  assert.match(migration, /receipt_status='pending'/u);
  assert.doesNotMatch(`${legal}\n${webhook}`, /автоматическ(?:ий|и).*чек/iu);
});

test("admin receipt API requires cookie auth and CSRF", () => {
  const source = read("server/api/admin-receipt.js");
  assert.match(source, /verifyCsrf/u);
  assert.match(source, /yel_admin_session/u);
  assert.match(source, /app_role !== "admin"/u);
});

test("OTP schema records attempts, use and session issuance", () => {
  const sql = read("db/migrations/20260711_legal_security_compliance.sql");
  assert.match(sql, /attempts integer/u);
  assert.match(sql, /used_at timestamptz/u);
  assert.match(sql, /session_issued_at timestamptz/u);
});

test("calculator blocks submission until separate consent", () => {
  const source = read("src/calculator/Calculator.tsx");
  assert.match(source, /!consentAccepted/u);
  assert.match(source, /personal-data-consent/u);
  assert.match(source, /disabled=\{submitting \|\| !consentAccepted\}/u);
});

test("auth request does not return linked-state enumeration", () => {
  const source = read("server/api/auth-request.js");
  assert.doesNotMatch(source, /linked:\s*(?:true|false)/u);
  assert.match(source, /Если вход доступен/u);
});

test("OTP session can be issued only once", () => {
  const source = read("server/api/auth-session.js");
  assert.match(source, /session_issued_at/u);
  assert.match(source, /\.is\("session_issued_at", null\)/u);
});

test("OTP verification is limited by IP, phone and token", () => {
  const source = read("server/api/auth-verify.js");
  assert.match(source, /verify:ip:/u);
  assert.match(source, /verify:phone:/u);
  assert.match(source, /verify:token:/u);
  assert.match(source, /limit: 5/u);
});

test("gallery API binds share token, gallery and asset", () => {
  const source = read("server/api/gallery-access.js");
  assert.match(source, /body\.galleryId !== link\.gallery_id/u);
  assert.match(source, /\.eq\("gallery_id", link\.gallery_id\)/u);
  assert.match(source, /Файл не относится к галерее/u);
  assert.match(source, /accessTicket/u);
  assert.match(source, /ticketAccess/u);
  assert.match(read("server/api/file-url.js"), /x-gallery-access/u);
  assert.doesNotMatch(read("src/lib/storage.ts"), /\?share=/u);
});

test("gallery comments are sanitized, bounded and rate limited", () => {
  const source = read("server/api/gallery-access.js");
  assert.match(source, /cleanText\(body\.text, 1000\)/u);
  assert.match(source, /gallery-comment/u);
});

test("payment status requires authenticated order owner", () => {
  const source = read("server/api/payment-status.js");
  assert.match(source, /yel_session/u);
  assert.match(source, /user_id !== claims\.sub/u);
});

test("private tokens and payment identifiers are sent in POST bodies", () => {
  assert.match(read("server/api/auth-status.js"), /req\.method !== "POST"/u);
  assert.match(read("server/api/payment-status.js"), /req\.method !== "POST"/u);
  assert.doesNotMatch(read("src/lib/auth.ts"), /auth-status\?token=/u);
  assert.doesNotMatch(read("src/gallery/Checkout.tsx"), /payment-status\?paymentId=/u);
});

test("account data is resolved from HttpOnly session ownership", () => {
  const source = read("server/api/account-data.js");
  assert.match(source, /yel_session/u);
  assert.match(source, /\.eq\("user_id", claims\.sub\)/u);
  assert.doesNotMatch(source, /req\.query.*phone/u);
  assert.doesNotMatch(source, /receipt_admin_comment/u);
});

test("JWT is absent from persistent browser storage", () => {
  const source = `${read("src/lib/supabaseClient.ts")}\n${read("src/lib/auth.ts")}`;
  assert.doesNotMatch(source, /localStorage\.setItem\([^\n]*(?:token|session)/iu);
  assert.match(source, /inMemoryToken/u);
});

test("face grouping is disabled in production", () => {
  const source = read("src/lib/face.ts");
  assert.match(source, /import\.meta\.env\.DEV/u);
  assert.match(source, /DisabledFaceService/u);
});

test("lead endpoint records policy and consent versions", () => {
  const source = read("server/api/send-form.js");
  assert.match(source, /p_policy_version/u);
  assert.match(source, /p_consent_version/u);
  assert.match(source, /record_lead_with_consent/u);
});

test("production health endpoint is routed without exposing secrets", () => {
  const router = read("api/[endpoint].js");
  const health = read("server/api/health.js");
  assert.match(router, /health/u);
  assert.match(health, /database/u);
  assert.match(health, /telegram/u);
  assert.doesNotMatch(health, /SERVICE_ROLE_KEY[^)]*json|BOT_TOKEN[^)]*json/u);
});

test("public prices use the reviewed 2026 market entry points", () => {
  const prices = read("src/lib/pricing.data.ts");
  for (const value of ["от 5 000 ₽", "от 15 000 ₽", "от 22 000 ₽", "от 35 000 ₽", "от 25 000 ₽", "от 6 000 ₽/час", "от 8 000 ₽/час", "от 60 000 ₽", "от 70 000 ₽"]) {
    assert.match(prices, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
});
