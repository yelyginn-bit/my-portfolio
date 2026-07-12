import test from "node:test";
import assert from "node:assert/strict";
import sendForm from "../../server/api/send-form.js";

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
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
