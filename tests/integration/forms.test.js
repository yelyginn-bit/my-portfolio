import test from "node:test";
import assert from "node:assert/strict";
import { createSendFormHandler } from "../../server/api/send-form.js";
import { createHealthHandler } from "../../server/api/health.js";
import { inspectConsentJournal, consentJournalContract } from "../../server/api/_lib/consent-journal.js";

const LEAD_ID = "123e4567-e89b-12d3-a456-426614174000";
const READY_JOURNAL = { database: "ready", rpc: "ready", ready: true, tables: { leads: true, consent_events: true } };
const VALID_BODY = {
  name: "Тестовый клиент",
  contact: "test@example.com",
  message: "Нужна видеосъёмка мероприятия",
  service: "Съёмка мероприятия",
  consentAccepted: true,
  consentVersion: "1.0",
  policyVersion: "2.0",
  formId: "homepage-contact",
  pageUrl: "/",
};

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
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

function makeAdmin({ data = LEAD_ID, error = null, throws = false } = {}) {
  const calls = { rpc: [], updates: [] };
  return {
    calls,
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      if (throws) throw new Error("simulated network failure");
      return { data, error };
    },
    from(table) {
      return {
        update(values) {
          return { eq: async (column, value) => { calls.updates.push({ table, values, column, value }); } };
        },
      };
    },
  };
}

function postRequest(body = VALID_BODY, headers = {}) {
  return {
    method: "POST",
    body,
    headers: { cookie: "yel_csrf=same", "x-csrf-token": "same", "user-agent": "test-agent", ...headers },
    socket: { remoteAddress: "127.0.0.1" },
  };
}

function jsonResponse(payload, { ok = true } = {}) {
  return { ok, async json() { return payload; } };
}

function openApiSpec({ rpc = true, args = consentJournalContract.arguments } = {}) {
  const paths = {
    "/leads": { get: {} },
    "/consent_events": { get: {} },
  };
  if (rpc) {
    paths[`/rpc/${consentJournalContract.rpc}`] = {
      post: {
        parameters: [{
          in: "body",
          schema: { type: "object", required: args, properties: Object.fromEntries(args.map((name) => [name, { type: "string" }])) },
        }],
      },
    };
  }
  return { swagger: "2.0", paths };
}

test("OpenAPI readiness is read-only and confirms exposed RPC signature and journal tables", async () => {
  let fetchCount = 0;
  let request;
  const result = await inspectConsentJournal({
    env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-only" },
    fetchImpl: async (url, options) => {
      fetchCount += 1;
      request = { url: String(url), options };
      return jsonResponse(openApiSpec());
    },
  });
  assert.deepEqual(result, { database: "ready", rpc: "ready", ready: true, tables: { leads: true, consent_events: true } });
  assert.equal(fetchCount, 1);
  assert.equal(request.options.method, "GET");
  assert.match(request.url, /\/rest\/v1\/$/u);
  assert.equal(request.options.headers.Accept, "application/openapi+json");
});

test("reachable database without executable journal RPC is explicitly unavailable", async () => {
  const result = await inspectConsentJournal({
    env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-only" },
    fetchImpl: async () => jsonResponse(openApiSpec({ rpc: false })),
  });
  assert.deepEqual(result, { database: "ready", rpc: "rpc_missing", ready: false, tables: null });
});

test("journal readiness rejects a mismatched RPC signature or hidden tables", async () => {
  const wrongArgs = consentJournalContract.arguments.slice(1);
  const mismatch = await inspectConsentJournal({
    env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-only" },
    fetchImpl: async () => jsonResponse(openApiSpec({ args: wrongArgs })),
  });
  assert.equal(mismatch.rpc, "rpc_signature_mismatch");
  assert.equal(mismatch.ready, false);

  const hiddenTable = openApiSpec();
  delete hiddenTable.paths["/consent_events"];
  const tables = await inspectConsentJournal({
    env: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-only" },
    fetchImpl: async () => jsonResponse(hiddenTable),
  });
  assert.equal(tables.rpc, "journal_tables_unverified");
  assert.equal(tables.ready, false);
});

test("missing Supabase configuration cannot report a ready consent journal", async () => {
  const result = await inspectConsentJournal({ env: {}, fetchImpl: async () => assert.fail("must not fetch") });
  assert.deepEqual(result, { database: "not_configured", rpc: "not_configured", ready: false, tables: null });
});

test("form rejects missing or stale consent before journaling or delivery", async () => {
  const admin = makeAdmin();
  const handler = createSendFormHandler({
    getAdminFn: () => admin,
    inspectConsentJournalFn: async () => READY_JOURNAL,
    fetchImpl: async () => assert.fail("must not deliver"),
    rateLimitFn: () => true,
  });
  const noConsent = response();
  await handler(postRequest({ ...VALID_BODY, consentAccepted: false }), noConsent);
  assert.equal(noConsent.statusCode, 400);
  const stale = response();
  await handler(postRequest({ ...VALID_BODY, policyVersion: "old" }), stale);
  assert.equal(stale.statusCode, 400);
  assert.equal(admin.calls.rpc.length, 0);
});

test("valid form fails closed when public journal readiness is unavailable", async () => {
  await withEnv({ TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_CHAT_ID: "1", LEAD_RELAY_ENABLED: "false" }, async () => {
    let delivered = false;
    const handler = createSendFormHandler({
      getAdminFn: () => makeAdmin(),
      inspectConsentJournalFn: async () => ({ database: "ready", rpc: "rpc_missing", ready: false }),
      fetchImpl: async () => { delivered = true; return jsonResponse({ ok: true }); },
      rateLimitFn: () => true,
    });
    const res = response();
    await handler(postRequest(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(delivered, false);
  });
});

test("database rejection or empty RPC UUID never triggers delivery", async (t) => {
  for (const rpcResult of [{ data: null, error: null }, { data: null, error: { message: "denied" } }, { throws: true }]) {
    await t.test(rpcResult.throws ? "RPC network error" : rpcResult.error ? "RPC error" : "RPC empty result", async () => {
      await withEnv({ TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_CHAT_ID: "1", LEAD_RELAY_ENABLED: "false" }, async () => {
        const admin = makeAdmin(rpcResult);
        let delivered = false;
        const handler = createSendFormHandler({
          getAdminFn: () => admin,
          inspectConsentJournalFn: async () => READY_JOURNAL,
          fetchImpl: async () => { delivered = true; return jsonResponse({ ok: true }); },
          rateLimitFn: () => true,
        });
        const res = response();
        await handler(postRequest(), res);
        assert.equal(res.statusCode, 503);
        assert.equal(admin.calls.rpc.length, 1);
        assert.equal(delivered, false);
      });
    });
  }
});

test("valid form delivers after one journal entry even when optional admin and storage are absent", async () => {
  await withEnv({
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_CHAT_ID: "1",
    LEAD_RELAY_ENABLED: "false",
    ADMIN_PASSWORD: undefined,
    SUPABASE_JWT_SECRET: undefined,
    R2_ACCOUNT_ID: undefined,
    R2_ACCESS_KEY_ID: undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET: undefined,
  }, async () => {
    const admin = makeAdmin();
    let deliveryCalls = 0;
    const sendForm = createSendFormHandler({
      getAdminFn: () => admin,
      inspectConsentJournalFn: async () => READY_JOURNAL,
      fetchImpl: async () => { deliveryCalls += 1; return jsonResponse({ ok: true }); },
      rateLimitFn: () => true,
    });
    const res = response();
    await sendForm(postRequest(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(admin.calls.rpc.length, 1);
    assert.equal(deliveryCalls, 1);

    const health = createHealthHandler({ inspectConsentJournalFn: async () => READY_JOURNAL });
    const healthRes = response();
    await health({ method: "GET" }, healthRes);
    assert.equal(healthRes.statusCode, 200);
    assert.equal(healthRes.body.checks.publicForm.ready, true);
    assert.equal(healthRes.body.checks.optional.adminAuth, false);
    assert.equal(healthRes.body.checks.optional.storage, false);
    assert.equal(healthRes.body.checks.thisRuntimeResponding, true);
    assert.equal(healthRes.body.checks.upstreamMeasured, false);
    assert.equal(Object.hasOwn(healthRes.body.checks, "siteAvailable"), false);
  });
});

test("public ingress journals once and trusted relay receiver only delivers", async () => {
  await withEnv({
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_CHAT_ID: "1",
    LEAD_RELAY_ENABLED: "true",
    LEAD_RELAY_URL: "https://relay.example.test/api/send-form",
    LEAD_RELAY_SECRET: "test-relay-secret",
  }, async () => {
    const admin = makeAdmin();
    const ingress = createSendFormHandler({
      getAdminFn: () => admin,
      inspectConsentJournalFn: async () => READY_JOURNAL,
      fetchImpl: async (url, options) => {
        assert.equal(url, process.env.LEAD_RELAY_URL);
        assert.equal(options.headers["X-Yelyginn-Relay-Secret"], process.env.LEAD_RELAY_SECRET);
        return jsonResponse({ ok: true });
      },
      verifyCsrfFn: () => true,
      rateLimitFn: () => true,
    });
    const ingressRes = response();
    await ingress(postRequest(), ingressRes);
    assert.equal(ingressRes.statusCode, 200);
    assert.equal(admin.calls.rpc.length, 1);

    const receiver = createSendFormHandler({
      getAdminFn: () => assert.fail("trusted relay must not journal or update the database"),
      inspectConsentJournalFn: async () => assert.fail("trusted relay must not probe or journal"),
      fetchImpl: async (url) => {
        assert.match(url, /api\.telegram\.org/u);
        return jsonResponse({ ok: true });
      },
      rateLimitFn: () => true,
    });
    const receiverRes = response();
    await receiver(postRequest(VALID_BODY, { "x-yelyginn-relay-secret": "test-relay-secret" }), receiverRes);
    assert.equal(receiverRes.statusCode, 200);
    assert.equal(admin.calls.rpc.length, 1);
  });
});

test("HTTP 200 with relay ok=false is a failed delivery", async () => {
  await withEnv({
    TELEGRAM_BOT_TOKEN: undefined,
    TELEGRAM_CHAT_ID: undefined,
    LEAD_RELAY_ENABLED: "true",
    LEAD_RELAY_URL: "https://relay.example.test/api/send-form",
    LEAD_RELAY_SECRET: "test-relay-secret",
  }, async () => {
    const admin = makeAdmin();
    const handler = createSendFormHandler({
      getAdminFn: () => admin,
      inspectConsentJournalFn: async () => READY_JOURNAL,
      fetchImpl: async () => jsonResponse({ ok: false }),
      rateLimitFn: () => true,
    });
    const res = response();
    await handler(postRequest(), res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.ok, false);
    assert.deepEqual(admin.calls.updates.at(-1)?.values, { delivery_status: "failed" });
  });
});

test("health scopes readiness to its own runtime and reports missing journal without implying site outage", async () => {
  await withEnv({
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_CHAT_ID: "1",
    ADMIN_PASSWORD: undefined,
    SUPABASE_JWT_SECRET: undefined,
    SUPABASE_URL: undefined,
    VITE_SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    R2_ACCOUNT_ID: undefined,
    R2_ACCESS_KEY_ID: undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET: undefined,
    VERCEL: "1",
    YELYGINN_RUNTIME: undefined,
  }, async () => {
    const health = createHealthHandler({ inspectConsentJournalFn: async () => ({ database: "not_configured", rpc: "not_configured", ready: false }) });
    const res = response();
    await health({ method: "GET" }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.status, "degraded");
    assert.equal(res.body.checks.runtime, "vercel");
    assert.equal(res.body.checks.thisRuntimeResponding, true);
    assert.equal(res.body.checks.upstreamMeasured, false);
    assert.equal(res.body.checks.publicForm.ready, false);
    assert.equal(res.body.checks.publicForm.consentJournal, false);
    assert.equal(res.body.checks.configuration.database, "not_configured");
    assert.equal(res.body.checks.dependencies.database, "not_configured");
    assert.equal(res.body.checks.optional.adminAuth, false);
    assert.equal(res.body.checks.optional.storage, false);
    assert.equal(Object.hasOwn(res.body.checks, "siteAvailable"), false);
  });
});
