/**
 * SEO-тексты всех индексируемых маршрутов (PROMPT-36 §0.1–0.2, Часть 4): читаем
 * то, что реально отдаёт сервер (dist/prerender/…/index.html или плоский html),
 * а не исходник — робот видит именно файл.
 *
 *   npm run build && npx tsx --test tests/seo-copy.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";
import { seoCopyFor } from "../src/public/seoCopy.ts";

const dist = path.join(process.cwd(), "dist");

function servedHtml(route: string): string {
  const rel = route === "/" ? "" : route.slice(1);
  const file = [path.join(dist, "prerender", rel, "index.html"), path.join(dist, `${rel}.html`), path.join(dist, rel, "index.html")].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  assert.ok(file, `${route}: нет собранного html`);
  return fs.readFileSync(file, "utf8");
}
const pick = (html: string, re: RegExp) => (html.match(re)?.[1] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const pages = INDEXABLE_ROUTES.map((r) => {
  const html = servedHtml(r.path);
  return { route: r.path, title: pick(html, /<title>(.*?)<\/title>/su), description: pick(html, /<meta name="description" content="([^"]*)"/u), ogTitle: pick(html, /<meta property="og:title" content="([^"]*)"/u) };
});

// title статьи «Сколько стоит…» владелец задал дословно, без бренда
const NO_BRAND = new Set(["/blog/skolko-stoit-snyat-reklamnyy-rolik"]);

test("у каждого индексируемого маршрута есть текст в seoCopy.ts", () => {
  assert.equal(pages.length, 70);
  for (const p of pages) assert.ok(seoCopyFor(p.route), `${p.route}: нет в src/public/seoCopy.ts`);
});

test("title: 30–70 знаков, бренд | YELYGINN (у главной | Юрий Елыгин), совпадает с og:title", () => {
  for (const p of pages) {
    assert.ok(p.title.length >= 30 && p.title.length <= 70, `${p.route}: title ${p.title.length} знаков — «${p.title}»`);
    if (p.route === "/") assert.ok(p.title.endsWith("| Юрий Елыгин"), `${p.route}: бренд главной`);
    else if (!NO_BRAND.has(p.route)) assert.ok(p.title.endsWith("| YELYGINN"), `${p.route}: бренд «${p.title}»`);
    assert.equal(p.ogTitle, p.title, `${p.route}: og:title расходится с title`);
  }
});

test("description: 110–165 знаков", () => {
  for (const p of pages) assert.ok(p.description.length >= 110 && p.description.length <= 165, `${p.route}: description ${p.description.length} знаков`);
});

test("70 title и 70 description — все разные", () => {
  const dup = (key: "title" | "description") => {
    const seen = new Map<string, string>();
    return pages.filter((p) => { const k = p[key]; const hit = seen.has(k); seen.set(k, p.route); return hit; }).map((p) => `${p.route}: ${key} повторяется`);
  };
  assert.deepEqual([...dup("title"), ...dup("description")], []);
});

test("в текстах нет «ИП» и запрещённых упоминаний", () => {
  for (const p of pages) {
    const text = `${p.title} ${p.description}`;
    assert.ok(!/(^|[^А-Яа-яЁё])ИП([^А-Яа-яЁё]|$)/u.test(text), `${p.route}: «ИП»`);
    assert.ok(!/лукойл|1xbet/iu.test(text), `${p.route}: запрещённое упоминание`);
  }
});
