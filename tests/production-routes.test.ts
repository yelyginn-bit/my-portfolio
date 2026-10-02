import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_MANIFEST } from "../src/public/routeManifest.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// PROMPT-30: /_kit built fine and passed every other test, but returned 404
// in production — server/production-server.js keeps its own hand-written
// pageMap (clean URL -> dist/*.html), a THIRD place a route must be
// registered besides ROUTE_MANIFEST and vite.config.ts's rollupOptions.input.
// This test is the guard so the next route added to ROUTE_MANIFEST doesn't
// silently 404 in prod the same way.
test("every non-prerendered route in ROUTE_MANIFEST resolves somewhere in production-server.js", () => {
  const distDir = path.join(root, "dist");
  const manifestFile = path.join(distDir, "prerender-manifest.json");
  assert.ok(fs.existsSync(manifestFile), "dist/prerender-manifest.json не найден — сначала npm run build");
  const prerendered = new Set(JSON.parse(fs.readFileSync(manifestFile, "utf8")).routes as string[]);

  const serverSrc = fs.readFileSync(path.join(root, "server/production-server.js"), "utf8");
  const pageMapKeys = new Set([...serverSrc.matchAll(/\["(\/[^"]*)",\s*"[^"]+"\]/gu)].map((m) => m[1]));
  const prefixCovered = (p: string) => p.startsWith("/portfolio/") || p.startsWith("/blog/") || p.startsWith("/g/") || p.startsWith("/journal/");

  for (const route of ROUTE_MANIFEST) {
    if (route.render === "redirect" || route.render === "private" || route.render === "v3" || route.render === "calculator") continue;
    const resolvable = prerendered.has(route.path) || pageMapKeys.has(route.path) || prefixCovered(route.path);
    assert.ok(resolvable, `${route.path}: не найден ни в dist/prerender-manifest.json, ни в server/production-server.js pageMap, ни под известным префиксом — вернёт 404 в проде`);
  }
});

test("production HTTP routes redirect photo aliases and return 404 for unknown portfolio slugs", async () => {
  const portProbe = createServer();
  await new Promise<void>((resolve, reject) => {
    portProbe.once("error", reject);
    portProbe.listen(0, "127.0.0.1", resolve);
  });
  const address = portProbe.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()));

  const child = spawn(process.execPath, ["server/production-server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(`${origin}/photo`);
        if (response.status === 200) { ready = true; break; }
      } catch { /* server is still starting */ }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(ready, "production server did not become ready");

    const photoSlash = await fetch(`${origin}/photo/?utm_source=test`, { redirect: "manual" });
    assert.equal(photoSlash.status, 301);
    assert.equal(photoSlash.headers.get("location"), "/photo?utm_source=test");

    const photoHtml = await fetch(`${origin}/photo.html?utm_source=test`, { redirect: "manual" });
    assert.equal(photoHtml.status, 301);
    assert.equal(photoHtml.headers.get("location"), "/photo?utm_source=test");

    const validProject = await fetch(`${origin}/portfolio/hoff-product-cards`);
    assert.equal(validProject.status, 200);

    const unknownProject = await fetch(`${origin}/portfolio/preload`);
    assert.equal(unknownProject.status, 404);
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  }
});
