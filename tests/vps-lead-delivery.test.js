import test from "node:test";
import assert from "node:assert/strict";
import { createVpsLeadApp } from "../server/lead-delivery-app.js";

async function withApp(options, run) {
  const server = createVpsLeadApp(options).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const configured = { LEAD_VPS_ENABLED: "true", LEAD_DELIVERY_CHANNEL: "legacy", LEAD_TELEGRAM_ENABLED: "true", TELEGRAM_BOT_TOKEN: "local-fixture", TELEGRAM_CHAT_ID: "local-fixture", SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "local-fixture" };

test("prepared VPS delivery is disabled unless all prerequisites exist and relay is off", async () => {
  for (const env of [{}, { ...configured, LEAD_VPS_ENABLED: "false" }, { ...configured, SUPABASE_SERVICE_ROLE_KEY: "" }, { ...configured, TELEGRAM_BOT_TOKEN: "" }, { ...configured, LEAD_RELAY_ENABLED: "true" }]) {
    let calls = 0;
    await withApp({ env, handlers: { sendForm: () => calls++ } }, async origin => {
      const response = await fetch(origin + "/api/send-form", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      assert.equal(response.status, 503); assert.equal((await response.json()).ok, false); assert.equal(calls, 0);
      assert.equal(response.headers.get("cache-control"), "no-store");
    });
  }
});

test("prepared VPS delivery retains the real CSRF and consent checks without external delivery", async () => {
  await withApp({ env: configured }, async origin => {
    const csrf = await fetch(origin + "/api/csrf"); const token = (await csrf.json()).csrfToken;
    assert.ok(csrf.headers.get("set-cookie").includes("SameSite=Strict"));
    const withoutCsrf = await fetch(origin + "/api/send-form", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(withoutCsrf.status, 403);
    const withoutConsent = await fetch(origin + "/api/send-form", { method: "POST", headers: { "Content-Type": "application/json", "Cookie": `yel_csrf=${token}`, "X-CSRF-Token": token }, body: "{}" });
    assert.equal(withoutConsent.status, 400);
    const crossOrigin = await fetch(origin + "/api/send-form", { method: "POST", headers: { "Origin": "https://fixture.invalid" } });
    assert.equal(crossOrigin.status, 403);
  });
});

test("prepared VPS adapter delegates the validated body and preserves failure responses", async () => {
  await withApp({ env: configured, handlers: { sendForm: (req, res) => {
    assert.equal(req.body.message, "local fixture");
    assert.notEqual(req.headers["x-forwarded-for"], "spoofed");
    return res.status(502).json({ ok: false, error: "fixture notification unavailable" });
  } } }, async origin => {
    const response = await fetch(origin + "/api/send-form", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": "spoofed", "Origin": "https://yelyginn.ru" }, body: JSON.stringify({ message: "local fixture" }) });
    assert.equal(response.status, 502); assert.equal((await response.json()).ok, false);
    const invalidJson = await fetch(origin + "/api/send-form", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(invalidJson.status, 400); assert.equal((await invalidJson.json()).ok, false);
  });
});
