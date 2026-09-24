import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sitemapXml } from "../scripts/sitemap.ts";
import { ROUTE_MANIFEST } from "../src/public/routeManifest.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// PROMPT-30 §3.4/§5.3: /_kit — служебная витрина компонентов, не публичный
// маршрут. Три независимых гарантии, любая может тихо сломаться при правках.
test("/_kit is noindex and absent from the sitemap and the public navigation", () => {
  const html = read("_kit.html");
  assert.match(html, /name="robots" content="noindex,nofollow"/u, "_kit.html: должен быть noindex,nofollow");

  const route = ROUTE_MANIFEST.find((entry) => entry.path === "/_kit");
  assert.ok(route, "/_kit отсутствует в ROUTE_MANIFEST");
  assert.equal(route!.indexable, false, "/_kit: indexable должен быть false");

  const sitemap = sitemapXml();
  assert.doesNotMatch(sitemap, /\/_kit</u, "/_kit не должен попадать в sitemap.xml");

  const navigation = read("src/lib/navigation.data.ts");
  assert.doesNotMatch(navigation, /\/_kit/u, "/_kit не должен встречаться в navigation.data.ts (шапка/подвал/мобильное меню)");
});
