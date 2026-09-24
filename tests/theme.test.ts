import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_MANIFEST } from "../src/public/routeManifest.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// PROMPT-29 §5.3: ROUTE_MANIFEST — единственное место в коде, откуда
// пре-рендер и статические страницы узнают, что страница тёмная. Длина
// этого списка (routes with theme === "dark") и есть прогресс фазы 5.
const darkRoutes = ROUTE_MANIFEST.filter((route) => route.theme === "dark");

test("at least one route is marked theme: \"dark\" (phase 5 has started)", () => {
  assert.ok(darkRoutes.length > 0, "no route carries theme: \"dark\" yet");
});

test("every route marked theme: \"dark\" ships data-theme=\"dark\" in its built HTML", () => {
  for (const route of darkRoutes) {
    // "static" (site-shell.js) pages build straight to dist/<slug>.html;
    // everything else goes through scripts/prerender.ts into
    // dist/prerender/<route>/index.html (see outputFileFor there).
    const file = route.render === "static"
      ? path.join(root, "dist", `${route.path.replace(/^\//u, "")}.html`)
      : path.join(root, "dist", "prerender", route.path.replace(/^\//u, ""), "index.html");
    assert.ok(fs.existsSync(file), `${route.path}: built file not found at ${path.relative(root, file)} — run npm run build first`);
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, /<html\b[^>]*\bdata-theme="dark"/u, `${route.path}: missing data-theme="dark" on <html>`);
    assert.match(html, /<meta\s+name="theme-color"\s+content="#0A0A0A"/iu, `${route.path}: missing <meta name="theme-color" content="#0A0A0A">`);
  }
});

test("no route outside ROUTE_MANIFEST's theme:\"dark\" list ships data-theme=\"dark\" (no orphaned dark pages)", () => {
  const lightStaticRoutes = ROUTE_MANIFEST.filter((route) => route.render === "static" && route.theme !== "dark");
  for (const route of lightStaticRoutes) {
    const file = path.join(root, "dist", `${route.path.replace(/^\//u, "")}.html`);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(html, /<html\b[^>]*\bdata-theme="dark"/u, `${route.path}: has data-theme="dark" but is not marked theme: "dark" in routeManifest.ts`);
  }
});
