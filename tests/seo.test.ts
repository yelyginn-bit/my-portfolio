import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sitemapXml, siteOrigin } from "../scripts/sitemap.ts";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const publicPages = [
  "index.html", "portfolio.html", "portfolio-reels.html", "portfolio-events.html",
  "portfolio-concerts.html", "portfolio-editing.html", "pryamye-translyacii.html",
  "reels.html", "reklamnye-roliki.html", "event-video.html",
  "video-dlya-marketpleysov.html", "sajty.html", "cvetokorrekciya.html", "ceny.html", "calculator.html", "content-day.html", "photo.html",
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

test("sitemap is generated from the indexable route manifest", () => {
  const sitemap = sitemapXml();
  assert.ok(INDEXABLE_ROUTES.length > 0, "route manifest has no indexable routes to check against");
  assert.equal((sitemap.match(/<loc>/gu) || []).length, INDEXABLE_ROUTES.length, "sitemap entry count must match INDEXABLE_ROUTES");
  for (const route of INDEXABLE_ROUTES) {
    assert.match(sitemap, new RegExp(`<loc>${siteOrigin}${route.path}</loc>`, "u"), `${route.path} missing from sitemap`);
  }
});

test("private application pages are noindex", () => {
  for (const file of ["account.html", "admin.html", "gallery.html", "journal.html", "portfolio-photo.html"]) {
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

const TOKEN_SCAN_FILES = [
  "src/design-system.css", "src/v3-polish.css", "src/legal/legal.css", "src/index.css",
  "public/tokens.css", "public/site-skin.css", "public/bb-components.css",
  ...publicPages, "_kit.html", "404.html", "account.html", "admin.html", "gallery.html", "journal.html",
  "portfolio-editing.html", "portfolio-photo.html", "legal.html", "project.html",
];

test("every var(--ds-*) referenced in CSS/HTML is defined somewhere (PROMPT-30 §8.2)", () => {
  // qwen/site §6.1: --ds-accent-text было прочитано в двух местах и нигде не
  // объявлено — молча наследовало цвет родителя. Тест ловит следующий такой
  // случай сразу, а не через жалобу владельца с телефона.
  const defined = new Set<string>();
  for (const file of ["src/design-system.css", "public/tokens.css"]) {
    for (const m of read(file).matchAll(/(--ds-[\w-]+)\s*:/gu)) defined.add(m[1]);
  }
  const used = new Map<string, string>();
  for (const file of TOKEN_SCAN_FILES) {
    for (const m of read(file).matchAll(/var\((--ds-[\w-]+)/gu)) {
      if (!used.has(m[1])) used.set(m[1], file);
    }
  }
  for (const [token, file] of used) {
    assert.ok(defined.has(token), `${token}: используется в ${file}, но не объявлен ни в src/design-system.css, ни в public/tokens.css`);
  }
});

test("static pages load the shared token file before the skin", () => {
  // ceny.html убран из списка: это React-страница (как cvetokorrekciya.html,
  // тоже не в списке) и site-skin.css ей не нужен — см. коммит про подвал /ceny.
  const pages = ["reels.html", "photo.html", "event-video.html", "reklamnye-roliki.html"];
  for (const page of pages) {
    const html = read(page);
    assert.ok(html.includes('href="/tokens.css"'), `${page}: нет /tokens.css`);
    assert.ok(html.indexOf('/tokens.css') < html.indexOf('/site-skin.css'), `${page}: tokens.css должен идти до site-skin.css`);
  }
});

/* ── гейт по ВСЕМ индексируемым маршрутам (QWEN-08 §2.12) ──────────────────
 * Всё выше перечисленное проверяло исходники до сборки. Робот видит другой
 * файл: собранный и отдаваемый. H1-гейт в deploy.sh смотрит на горстку
 * страниц, а PROMPT-35 как раз так и пропустил марш-бросок регрессий —
 * «зелёный тест» означал «проверено не всё».
 *
 * Здесь — по факту сборки: для каждого маршрута из INDEXABLE_ROUTES берётся
 * тот же файл, что отдаёт production-server.js, и проверяется набор.
 * Исключения — только явным списком с причиной.
 */
const servedFile = (routePath: string): string => {
  const rel = routePath === "/" ? "" : routePath.slice(1);
  const candidates = [
    ...(rel ? [path.join(root, "dist", rel)] : []),
    path.join(root, "dist", "prerender", rel, "index.html"),
    rel ? path.join(root, "dist", rel, "index.html") : path.join(root, "dist", "index.html"),
    rel ? path.join(root, "dist", `${rel}.html`) : path.join(root, "dist", "index.html"),
  ];
  for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return "";
};

/** Маршруты, где поле сознательно отсутствует. Пустой список = проверить нельзя. */
const SEO_EXCEPTIONS: Record<string, { field: string; why: string }[]> = {};

test("every indexable route ships one H1, unique title/description, canonical and parseable JSON-LD (QWEN-08 §2.12)", () => {
  assert.ok(fs.existsSync(path.join(root, "dist", "prerender-manifest.json")),
    "нет dist/ — сначала `npm run build`: гейт проверяет собранные страницы, а не исходники");
  const titles = new Map<string, string>();
  const descs = new Map<string, string>();
  for (const route of INDEXABLE_ROUTES) {
    const file = servedFile(route.path);
    assert.ok(file, `${route.path}: серверу нечего отдавать — нет ни пре-рендера, ни плоского html`);
    const html = fs.readFileSync(file, "utf8");
    const exempt = SEO_EXCEPTIONS[route.path] ?? [];
    const skip = (field: string) => exempt.some((e) => e.field === field);

    const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/giu)];
    assert.equal(h1.length, 1, `${route.path}: H1 найдено ${h1.length}, нужно ровно 1`);
    assert.ok(h1[0][1].replace(/<[^>]+>/gu, "").trim().length > 0, `${route.path}: пустой H1`);

    const title = /<title>([\s\S]*?)<\/title>/iu.exec(html)?.[1]?.trim() ?? "";
    assert.ok(title.length > 0, `${route.path}: пустой <title>`);
    const desc = /<meta\s+name="description"\s+content="([^"]*)"/iu.exec(html)?.[1]?.trim() ?? "";
    assert.ok(desc.length > 0, `${route.path}: пустой description`);

    const dupTitle = titles.get(title);
    assert.ok(!dupTitle, `${route.path}: <title> совпадает с ${dupTitle ?? ""}`);
    titles.set(title, route.path);
    const dupDesc = descs.get(desc);
    assert.ok(!dupDesc, `${route.path}: description совпадает с ${dupDesc ?? ""}`);
    descs.set(desc, route.path);

    if (!skip("canonical")) {
      const canonical = /<link\s+rel="canonical"\s+href="([^"]+)"/iu.exec(html)?.[1] ?? "";
      assert.ok(canonical.startsWith(siteOrigin), `${route.path}: canonical отсутствует или не абсолютный: «${canonical}»`);
    }
    for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/giu)) {
      assert.doesNotThrow(() => JSON.parse(m[1]), `${route.path}: JSON-LD не парсится`);
    }
    assert.match(html, /<html\b[^>]*\blang="ru"/u, `${route.path}: нет lang="ru"`);
    assert.match(html, /<html\b[^>]*\bdata-theme="dark"/u, `${route.path}: публичная страница должна быть тёмной`);
    for (const key of ["og:title", "og:description", "og:image", "og:url", "og:type", "og:locale"]) {
      if (skip(key)) continue;
      assert.match(html, new RegExp(`(?:property|name)="${key}"\\s+content="[^"]+"`, "u"), `${route.path}: нет ${key}`);
    }
  }
  for (const [path_, list] of Object.entries(SEO_EXCEPTIONS)) {
    assert.ok(INDEXABLE_ROUTES.some((r) => r.path === path_), `исключение «${path_}» больше не нужен — маршрута нет в манифесте`);
    for (const e of list) assert.ok(e.why.length > 10, `${path_}: у исключения «${e.field}» нет причины`);
  }
});
