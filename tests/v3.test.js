import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V3 canonical source contains 89 unique Kinescope assets in the audited orientation split", () => {
  const source = read("src/portfolio/v3PortfolioData.ts");
  const rows = [...source.matchAll(/\["([A-Za-z0-9]{20,})", "(landscape|portrait)"\]/gu)].map((match) => ({ id: match[1], orientation: match[2] }));
  assert.equal(rows.length, 89);
  assert.equal(new Set(rows.map(({ id }) => id)).size, 89);
  assert.equal(rows.filter(({ orientation }) => orientation === "landscape").length, 75);
  assert.equal(rows.filter(({ orientation }) => orientation === "portrait").length, 14);
  assert.ok(rows.some(({ id }) => id === "hCJmSvmN6S7P8uAnexguQ5"), "source-confirmed website showreel is missing");
});

test("every V3 asset source order is covered exactly once by a project range", () => {
  const source = read("src/portfolio/v3PortfolioData.ts");
  const ranges = [...source.matchAll(/range: \[(\d+), (\d+)\]/gu)].map((match) => [Number(match[1]), Number(match[2])]);
  const covered = ranges.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, index) => start + index));
  assert.deepEqual(covered, Array.from({ length: 89 }, (_, index) => index + 1));
});

test("V3 public UI omits generic invented contribution fallbacks", () => {
  const source = `${read("src/public/V3App.tsx")}\n${read("src/portfolio/v3PortfolioData.ts")}`;
  for (const forbidden of ["Монтаж и финальная подготовка", "Работа с ритмом, цветом и звуком", "Готовый мастер-файл для публикации"]) {
    assert.doesNotMatch(source, new RegExp(forbidden, "u"));
  }
});

test("V3 hides internal and photo routes from navigation and sitemap", () => {
  const shell = `${read("src/public/V3App.tsx")}\n${read("public/site-shell.js")}`;
  assert.doesNotMatch(shell, /href="\/(?:admin|account|gallery|journal|photo|portfolio\/photo)"/u);
  const sitemap = read("public/sitemap.xml");
  assert.doesNotMatch(sitemap, /\/(?:admin|account|gallery|journal|photo|portfolio\/photo)</u);
  assert.match(sitemap, /\/pryamye-translyacii</u);
});

test("every canonical V3 project has a sitemap URL and legacy redirects do not", () => {
  const source = read("src/portfolio/v3PortfolioData.ts");
  const slugs = [...source.matchAll(/slug: "([a-z0-9-]+)"/gu)].map((match) => match[1]);
  const sitemap = read("public/sitemap.xml");
  assert.equal(slugs.length, 32);
  for (const slug of slugs) assert.match(sitemap, new RegExp(`<loc>https://yelyginn\\.ru/portfolio/${slug}</loc>`, "u"));
  assert.doesNotMatch(sitemap, /\/portfolio\/(?:editing|metro-gorkovskaya|sber-architecture-course)<\/loc>/u);
});

test("V3 hardening covers previously unprotected tables and removes spoofable review inserts", () => {
  const migration = read("db/migrations/20260814_v3_rls_hardening.sql");
  for (const table of ["login_history", "services", "discount_tiers", "downloads"]) {
    assert.match(migration, new RegExp(`alter table ${table} enable row level security`, "u"));
  }
  assert.match(migration, /drop policy if exists reviews_insert/u);
  assert.match(migration, /revoke insert, update, delete/u);
  assert.match(migration, /alter function is_admin\(\) set search_path = public/u);
});
