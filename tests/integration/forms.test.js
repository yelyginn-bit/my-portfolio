import test from "node:test";
import assert from "node:assert/strict";
import sendForm from "../../server/api/send-form.js";
import health from "../../server/api/health.js";

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function withEnv(values, run) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("form is rejected without explicit current consent", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "unit-test";
  process.env.TELEGRAM_CHAT_ID = "1";
  const req = { method: "POST", body: { name: "Иван", contact: "@username", message: "Нужна съёмка", formId: "homepage-contact" }, headers: { cookie: "yel_csrf=same", "x-csrf-token": "same" }, socket: {} };
  const res = response();
  await sendForm(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /согласие/iu);
});

test("form rejects inactive document version", async () => {
  const req = { method: "POST", body: { name: "Иван", contact: "@username", message: "Нужна съёмка", consentAccepted: true, consentVersion: "0", policyVersion: "0", formId: "homepage-contact" }, headers: { cookie: "yel_csrf=same", "x-csrf-token": "same" }, socket: {} };
  const res = response();
  await sendForm(req, res);
  assert.equal(res.statusCode, 400);
});

test("form readiness reports unavailable consent journaling even when Telegram is configured", async () => {
  await withEnv({
    TELEGRAM_BOT_TOKEN: "unit-test",
    TELEGRAM_CHAT_ID: "1",
    SUPABASE_URL: undefined,
    VITE_SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
  }, async () => {
    const res = response();
    await sendForm({ method: "GET" }, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, {
      ok: false,
      configured: true,
      telegramConfigured: true,
      relayConfigured: false,
      consentJournalDatabaseReady: false,
    });
  });
});

test("validly consented form is never delivered without a consent journal", async () => {
  await withEnv({
    TELEGRAM_BOT_TOKEN: "unit-test",
    TELEGRAM_CHAT_ID: "1",
    SUPABASE_URL: undefined,
    VITE_SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
  }, async () => {
    const originalFetch = globalThis.fetch;
    let delivered = false;
    globalThis.fetch = async () => {
      delivered = true;
      return { ok: true, json: async () => ({ ok: true }) };
    };
    try {
      const req = {
        method: "POST",
        body: {
          name: "Иван",
          contact: "@username",
          message: "Нужна съёмка",
          consentAccepted: true,
          consentVersion: "1.0",
          policyVersion: "2.0",
          formId: "homepage-contact",
        },
        headers: { cookie: "yel_csrf=same", "x-csrf-token": "same" },
        socket: { remoteAddress: "127.0.0.1" },
      };
      const res = response();
      await sendForm(req, res);
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.ok, false);
      assert.equal(delivered, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("health distinguishes live site, public-form readiness and deferred admin/storage", async () => {
  await withEnv({
    TELEGRAM_BOT_TOKEN: undefined,
    TELEGRAM_CHAT_ID: undefined,
    ADMIN_PASSWORD: undefined,
    SUPABASE_JWT_SECRET: undefined,
    SUPABASE_URL: undefined,
    VITE_SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    R2_ACCOUNT_ID: undefined,
    R2_ACCESS_KEY_ID: undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET: undefined,
  }, async () => {
    const res = response();
    await health({ method: "GET" }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.status, "degraded");
    assert.equal(res.body.checks.siteAvailable, true);
    assert.equal(res.body.checks.publicForm.ready, false);
    assert.equal(res.body.checks.publicForm.consentJournal, false);
    assert.equal(res.body.checks.configuration.database, "not_configured");
    assert.equal(res.body.checks.dependencies.database, "not_configured");
    assert.equal(res.body.checks.configuration.telegram, "not_configured");
    assert.equal(res.body.checks.optional.adminAuth, false);
    assert.equal(res.body.checks.optional.storage, false);
  });
});
