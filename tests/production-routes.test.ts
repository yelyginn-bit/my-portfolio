import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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
