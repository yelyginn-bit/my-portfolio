import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { INDEXABLE_ROUTES, ROUTE_MANIFEST } from "../src/public/routeManifest.ts";
import { PUBLIC_PRICES, PUBLIC_PRICE_BY_ID } from "../src/lib/pricing.data.ts";
import { FOOTER_GROUPS, PRIMARY_NAV } from "../src/lib/navigation.data.ts";
import { renderSajtyPriceReferences } from "../scripts/priceGuard.ts";
import { sitemapXml } from "../scripts/sitemap.ts";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "sajty.html"), "utf8");
const served = fs.readFileSync(path.join(root, "dist/prerender/sajty/index.html"), "utf8");
const packageIds = ["sajty-start", "sajty-pro", "sajty-premium", "sajty-support"];
const playerEntry = served.match(/<script[^>]+src="([^"]*sajty-[^"]+\.js)"/u)?.[1];

test("/sajty is the single new indexable dark static route", () => {
  const route = ROUTE_MANIFEST.filter((item) => item.path === "/sajty");
  assert.equal(route.length, 1);
  assert.deepEqual(route[0], { path: "/sajty", render: "static", indexable: true, priority: 0.85, theme: "dark" });
  assert.equal(INDEXABLE_ROUTES.filter((item) => item.path === "/sajty").length, 1);
  assert.match(sitemapXml(), /https:\/\/yelyginn\.ru\/sajty/u);
  const prerender = JSON.parse(fs.readFileSync(path.join(root, "dist/prerender-manifest.json"), "utf8"));
  assert.ok(prerender.routes.includes("/sajty"));
});

test("page prices are build-time references to pricing.data.ts, not source literals", () => {
  assert.equal((source.match(/data-price-reference=/gu) ?? []).length, 4);
  assert.doesNotMatch(source, /(?:15 000|35 000|80 000|2 000)\s*₽/u);
  const rendered = renderSajtyPriceReferences(source);
  for (const id of packageIds) {
    const item = PUBLIC_PRICE_BY_ID[id];
    assert.ok(item);
    assert.equal(item.category, "Сайты");
    assert.equal(item.showOnCatalog, false);
    assert.ok(rendered.includes(item.price), `${id} price reference did not resolve`);
  }
  assert.doesNotMatch(rendered, /data-price-reference=/u);
  assert.equal((served.match(/data-price-reference=/gu) ?? []).length, 0);
  for (const id of packageIds) assert.ok(served.includes(PUBLIC_PRICE_BY_ID[id].price), `${id} price missing from prerender`);
});

test("site packages stay out of /ceny and calculator and the link exists only in the footer", () => {
  const titles = packageIds.map((id) => PUBLIC_PRICE_BY_ID[id].title);
  const ceny = fs.readFileSync(path.join(root, "dist/prerender/ceny/index.html"), "utf8");
  const calculator = fs.readFileSync(path.join(root, "dist/prerender/calculator/index.html"), "utf8");
  for (const title of titles) { assert.ok(!ceny.includes(title)); assert.ok(!calculator.includes(title)); }
  assert.equal(PUBLIC_PRICES.filter((item) => item.category === "Сайты" && item.showOnCatalog !== false).length, 0);
  assert.ok(FOOTER_GROUPS.some((group) => group.links.some((item) => item.href === "/sajty" && item.label === "Сайты под ключ")));
  assert.ok(!PRIMARY_NAV.some((entry) => entry.kind === "link" ? entry.href === "/sajty" : entry.items.some((item) => item.href === "/sajty")));
  const header = served.match(/<header[\s\S]*?<\/header>/u)?.[0] ?? "";
  const footer = served.match(/<footer[\s\S]*?<\/footer>/u)?.[0] ?? "";
  assert.ok(!header.includes('href="/sajty"'));
  assert.ok(footer.includes('href="/sajty"'));
});

test("sajty prerender has eight content blocks, one H1, FAQPage and the lazy Kinescope video", () => {
  assert.equal((served.match(/<h1\b/gu) ?? []).length, 1);
  assert.equal((served.match(/data-price-reference=/gu) ?? []).length, 0);
  assert.equal((served.match(/class="sajty-section"/gu) ?? []).length, 7);
  assert.match(served, /<h1[^>]*>САЙТЫ ПОД КЛЮЧ<\/h1>/u);
  assert.match(served, /"@type":"FAQPage"/u);
  assert.match(served, /data-orientation="16:9"/u);
  assert.match(served, /kinescope-embed-placeholder/u);
  assert.ok(playerEntry, "sajty player hydration entry is missing");
  assert.match(fs.readFileSync(path.join(root, "dist", playerEntry!.replace(/^\//u, "")), "utf8"), /rTz2wthYwLPnnMbHzM2SjS/u);
  assert.match(served, /Видео \/ Сеть «Метро»/u);
  assert.doesNotMatch(served, /сайт(?:ы|а)?\s+(?:для|на сайте)\s+сети «Метро»/iu);
  assert.doesNotMatch(served, /data-sajty-cases/u);
});
