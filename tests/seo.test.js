import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const publicPages = [
  "index.html", "portfolio.html", "portfolio-reels.html", "portfolio-events.html",
  "portfolio-concerts.html", "portfolio-photo.html", "portfolio-editing.html",
  "content-day.html", "reels.html", "reklamnye-roliki.html", "event-video.html",
  "video-dlya-marketpleysov.html", "photo.html", "cvetokorrekciya.html", "ceny.html", "calculator.html",
  "cases.html", "journal.html", "blog/index.html",
  "blog/kak-snimat-reels-dlya-biznesa.html",
  "blog/skolko-stoit-snyat-reklamnyy-rolik.html",
  "blog/video-dlya-kartochek-wildberries.html",
  "blog/videosemka-meropriyatiy-nn.html",
];

test("indexable public pages have one title, description and canonical", () => {
  for (const file of publicPages) {
    const html = read(file);
    assert.equal((html.match(/<title>/gu) || []).length, 1, `${file}: title`);
    assert.equal((html.match(/name="description"/gu) || []).length, 1, `${file}: description`);
    assert.equal((html.match(/rel="canonical"/gu) || []).length, 1, `${file}: canonical`);
    assert.match(html, /name="robots" content="index,follow"/u, `${file}: robots`);
  }
});

test("all embedded JSON-LD blocks are valid JSON", () => {
  for (const file of publicPages) {
    const html = read(file);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu)) {
      assert.doesNotThrow(() => JSON.parse(match[1]), `${file}: invalid JSON-LD`);
    }
  }
});

test("sitemap contains every primary public route and excludes private routes", () => {
  const sitemap = read("public/sitemap.xml");
  for (const route of ["/portfolio", "/reels", "/event-video", "/cvetokorrekciya", "/photo", "/ceny", "/calculator", "/privacy-policy"]) {
    assert.match(sitemap, new RegExp(`<loc>https://yelyginn\\.ru${route.replaceAll("/", "\\/")}<\\/loc>`, "u"));
  }
  assert.doesNotMatch(sitemap, /\/(?:admin|account|g\/)</u);
});

test("private application pages are noindex", () => {
  for (const file of ["account.html", "admin.html", "gallery.html"]) {
    assert.match(read(file), /name="robots" content="noindex,nofollow"/u, file);
  }
});

test("design tokens stay in sync between bundle and static pages", () => {
  // public/tokens.css сгенерирован из src/design-system.css. Если они разъедутся,
  // статические страницы и React-страницы получат разные палитры — ровно та
  // болезнь, из-за которой сайт выглядел несогласованным.
  const rootOf = (css) => css.match(/:root \{[\s\S]*?\n\}/u)?.[0];
  const bundle = rootOf(read("src/design-system.css"));
  const statics = rootOf(read("public/tokens.css"));
  assert.ok(bundle, "не найден :root в src/design-system.css");
  assert.equal(statics, bundle, "public/tokens.css устарел: пересобрать из src/design-system.css");
});

test("static pages load the shared token file before the skin", () => {
  const pages = ["reels.html", "photo.html", "ceny.html", "event-video.html", "reklamnye-roliki.html"];
  for (const page of pages) {
    const html = read(page);
    assert.ok(html.includes('href="/tokens.css"'), `${page}: нет /tokens.css`);
    assert.ok(html.indexOf('/tokens.css') < html.indexOf('/site-skin.css'), `${page}: tokens.css должен идти до site-skin.css`);
  }
});
