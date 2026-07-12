import test from "node:test";
import assert from "node:assert/strict";
import adminLogin from "../../server/api/admin-login.js";
import authRequest from "../../server/api/auth-request.js";
import galleryAccess from "../../server/api/gallery-access.js";
import uploadUrl from "../../server/api/upload-url.js";

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    getHeader(name) { return this.headers[name]; },
  };
}

const baseRequest = (method, body = {}) => ({
  method,
  body,
  headers: { cookie: "yel_csrf=integration", "x-csrf-token": "integration", "user-agent": "node-test" },
  socket: { remoteAddress: "127.0.0.1" },
});

test("admin API rejects an invalid password without configuration disclosure", async () => {
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "integration-secret";
  const res = response();
  await adminLogin(baseRequest("POST", { password: "wrong" }), res);
  if (previous === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previous;
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "Не удалось выполнить вход");
});

test("OTP endpoint returns the same neutral response for an invalid phone", async () => {
  const res = response();
  await authRequest(baseRequest("POST", { phone: "unknown" }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /Если вход доступен/u);
  assert.equal("linked" in res.body, false);
});

test("gallery and upload APIs reject requests without authenticated access", async () => {
  const gallery = response();
  await galleryAccess({ ...baseRequest("POST", { action: "open", token: "unknown" }), headers: {} }, gallery);
  assert.equal(gallery.statusCode, 403);

  const upload = response();
  await uploadUrl(baseRequest("POST", { key: "galleries/00000000-0000-0000-0000-000000000000/orig/file.jpg", contentType: "image/jpeg", size: 100 }), upload);
  assert.equal(upload.statusCode, 403);
});
