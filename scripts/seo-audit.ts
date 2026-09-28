/**
 * scripts/seo-audit.ts — аудит индексируемых страниц по пре-рендеренному HTML.
 *
 * Зачем не в браузере: робот видит тот файл, который отдаёт сервер, а не
 * гидратированный DOM. Скрипт резолвит маршрут тем же порядком кандидатов, что
 * и server/production-server.js (сначала dist/prerender/<route>/index.html,
 * потом плоский dist/<route>.html), и разбирает именно его.
 *
 * Что проверяется (QWEN-08 §2): ровно один H1, длина и уникальность title и
 * description, абсолютный canonical, набор og:*, типы JSON-LD и то, что он
 * парсится, наличие маршрута в sitemap, alt/width/height/loading у <img>,
 * число входящих внутренних ссылок, «ИП» в тексте.
 *
 *   npm run build
 *   npx tsx scripts/seo-audit.ts                # сводка в консоль
 *   npx tsx scripts/seo-audit.ts --write        # + docs/audit/seo-audit.md
 */
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { INDEXABLE_ROUTES, ROUTE_MANIFEST } from "../src/public/routeManifest.ts";
import { siteOrigin } from "./sitemap.ts";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const REPORT = "docs/audit/seo-audit.md";

interface Row {
  route: string; render: string; file: string | null; inSitemap: boolean; lastmod: string | null;
  lang: string | null; dataTheme: string | null; robots: string | null;
  title: string; desc: string; canonical: string | null;
  og: Record<string, string | null>; h1: string[]; h2: string[];
  jsonld: string[][]; jsonldBroken: boolean;
  imgs: number; imgNoAlt: number; imgEmptyAlt: number; imgNoDims: number; imgNoLoading: number;
  inbound: number; ip: string | null; bytes: number;
}

/** Тот же порядок выбора файла, что у production-server.js и startLocalServer. */
async function servedFile(routePath: string): Promise<string | null> {
  const rel = routePath === "/" ? "" : routePath.slice(1);
  const candidates = [
    ...(rel ? [path.join(DIST, rel)] : []),
    path.join(DIST, "prerender", rel, "index.html"),
    rel ? path.join(DIST, rel, "index.html") : path.join(DIST, "index.html"),
    rel ? path.join(DIST, `${rel}.html`) : path.join(DIST, "index.html"),
  ];
  for (const c of candidates) {
    if (path.relative(DIST, c).startsWith("..")) continue;
    try { if ((await stat(c)).isFile()) return c; } catch { /* следующий кандидат */ }
  }
  return null;
}

const attrOf = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`, "iu").exec(tag)?.[1] ?? "";
const metaOf = (html: string, key: string) => {
  const sel = /^(description|theme-color|robots|viewport)$/u.test(key) ? "name" : "property";
  const tag = new RegExp(`<meta\\s+[^>]*${sel}="${key}"[^>]*>`, "iu").exec(html)?.[0];
  if (tag) return attrOf(tag, "content");
  const alt = new RegExp(`<meta\\s+[^>]*${sel === "name" ? "property" : "name"}="${key}"[^>]*>`, "iu").exec(html)?.[0];
  return alt ? attrOf(alt, "content") : null;
};
const decode = (s: string) => s
  .replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&lt;/gu, "<").replace(/&gt;/gu, ">")
  .replace(/&#(\d+);/gu, (_, d) => String.fromCharCode(Number(d)));
const textOf = (html: string) => decode(html.replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim();
const heading = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "giu"))]
  .map((m) => textOf(m[1]).slice(0, 90));

const sitemapRaw = await readFile(path.join(DIST, "sitemap.xml"), "utf8").catch(() => "");
const sitemapUrls = [...sitemapRaw.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => m[1]);
const lastmods = new Map([...sitemapRaw.matchAll(/<url>(?:(?!<\/url>)[\s\S])*?<loc>([^<]+)<\/loc>(?:(?!<\/url>)[\s\S])*?<lastmod>([^<]+)<\/lastmod>/gu)].map((m) => [m[1], m[2]]));
const robots = await readFile(path.join(DIST, "robots.txt"), "utf8").catch(() => "");

const rows: Row[] = [];
const linkTargets = new Map<string, Set<string>>();

for (const route of INDEXABLE_ROUTES) {
  const file = await servedFile(route.path);
  const url = `${siteOrigin}${route.path}`;
  const bare = url.replace(/\/+$/u, "") || url;
  const row: Row = {
    route: route.path, render: route.render, file: file ? path.relative(DIST, file) : null,
    inSitemap: sitemapUrls.includes(url) || sitemapUrls.includes(bare),
    lastmod: lastmods.get(url) ?? lastmods.get(bare) ?? null,
    lang: null, dataTheme: null, robots: null,
    title: "", desc: "", canonical: null, og: {}, h1: [], h2: [],
    jsonld: [], jsonldBroken: false, imgs: 0, imgNoAlt: 0, imgEmptyAlt: 0, imgNoDims: 0, imgNoLoading: 0,
    inbound: 0, ip: null, bytes: 0,
  };
  if (!file) { rows.push(row); continue; }
  const html = await readFile(file, "utf8");
  row.bytes = html.length;
  row.lang = /<html\b[^>]*\blang="([^"]*)"/iu.exec(html)?.[1] ?? null;
  row.dataTheme = /<html\b[^>]*\bdata-theme="([^"]*)"/iu.exec(html)?.[1] ?? null;
  row.robots = metaOf(html, "robots");
  row.title = decode(/<title>([\s\S]*?)<\/title>/iu.exec(html)?.[1] ?? "");
  row.desc = decode(metaOf(html, "description") ?? "");
  row.canonical = attrOf(/<link\s+rel="canonical"[^>]*>/iu.exec(html)?.[0] ?? "", "href") || null;
  row.og = Object.fromEntries(["og:title", "og:description", "og:type", "og:url", "og:image", "og:locale", "twitter:card"]
    .map((k) => [k, metaOf(html, k)]));
  row.h1 = heading(html, "h1");
  row.h2 = heading(html, "h2");
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/giu)) {
    try {
      const parsed = JSON.parse(m[1]);
      const items: any[] = Array.isArray(parsed) ? parsed : [parsed];
      row.jsonld.push(items.flatMap((x) => (x?.["@graph"] ? x["@graph"].map((g: any) => String(g["@type"])) : [String(x?.["@type"] ?? "?")])));
    } catch { row.jsonldBroken = true; row.jsonld.push(["НЕ ПАРСИТСЯ"]); }
  }
  const imgs = [...html.matchAll(/<img\b[^>]*>/giu)].map((m) => m[0]);
  row.imgs = imgs.length;
  row.imgNoAlt = imgs.filter((t) => !/\balt=/iu.test(t)).length;
  row.imgEmptyAlt = imgs.filter((t) => /\balt=""/u.test(t)).length;
  row.imgNoDims = imgs.filter((t) => !/\bwidth=/iu.test(t) || !/\bheight=/iu.test(t)).length;
  row.imgNoLoading = imgs.filter((t) => !/\bloading=/iu.test(t)).length;
  const plain = textOf(html);
  const ipHit = /(?:^|[^А-Яа-яЁё])(ИП)\s+[А-ЯЁ]/u.exec(plain);
  if (ipHit) row.ip = plain.slice(Math.max(0, ipHit.index - 40), ipHit.index + 60);

  const targets = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"#?]*)/giu)) {
    let t = decode(m[1]);
    if (/^https?:/u.test(t)) { if (!t.startsWith(siteOrigin)) continue; t = t.slice(siteOrigin.length); }
    if (!t.startsWith("/")) continue;
    targets.add(t.replace(/\/+$/u, "") || "/");
  }
  linkTargets.set(route.path, targets);
  rows.push(row);
}

const inbound = new Map<string, number>();
for (const targets of linkTargets.values()) for (const t of targets) inbound.set(t, (inbound.get(t) ?? 0) + 1);
for (const row of rows) row.inbound = inbound.get(row.route) ?? 0;
const known = new Set((ROUTE_MANIFEST as readonly { path: string }[]).map((r) => r.path));
const orphanTargets = [...new Set([...linkTargets.values()].flatMap((s) => [...s]))].filter((t) => !known.has(t));

const problems = (r: Row) => {
  const p: string[] = [];
  if (!r.file) p.push("нет файла");
  if (r.h1.length !== 1) p.push(`H1: ${r.h1.length}`);
  if (r.title.length < 30 || r.title.length > 65) p.push(`title ${r.title.length}`);
  if (r.desc.length < 110 || r.desc.length > 165) p.push(`desc ${r.desc.length}`);
  if (!r.canonical) p.push("нет canonical");
  else if (!r.canonical.startsWith(siteOrigin)) p.push("canonical не абсолютный");
  for (const k of ["og:title", "og:description", "og:type", "og:url", "og:image", "og:locale"]) if (!r.og[k]) p.push(k);
  if (!r.jsonld.length) p.push("нет JSON-LD");
  if (r.jsonldBroken) p.push("JSON-LD не парсится");
  if (!r.inSitemap) p.push("нет в sitemap");
  if (r.lang !== "ru") p.push(`lang=${r.lang}`);
  if (r.dataTheme !== "dark") p.push(`theme=${r.dataTheme}`);
  if (r.imgNoAlt) p.push(`img без alt: ${r.imgNoAlt}`);
  if (r.imgNoDims) p.push(`img без размеров: ${r.imgNoDims}`);
  if (r.inbound < 2) p.push(`входящих ссылок: ${r.inbound}`);
  if (r.ip) p.push("встречается «ИП»");
  return p;
};

const clean = rows.filter((r) => problems(r).length === 0).length;
console.log(`страниц: ${rows.length} · без замечаний: ${clean} · sitemap URL: ${sitemapUrls.length} · lastmod: ${rows.filter((r) => r.lastmod).length}`);
console.log(`H1 ровно один: ${rows.filter((r) => r.h1.length === 1).length} · title вне 30–65: ${rows.filter((r) => r.title.length < 30 || r.title.length > 65).length} · description вне 110–165: ${rows.filter((r) => r.desc.length < 110 || r.desc.length > 165).length}`);
console.log(`без canonical: ${rows.filter((r) => !r.canonical).length} · без JSON-LD: ${rows.filter((r) => !r.jsonld.length).length} · битые цели ссылок: ${orphanTargets.join(", ") || "нет"}`);

if (process.argv.includes("--write")) {
  const lines: string[] = [];
  lines.push("# SEO-аудит индексируемых страниц", "");
  lines.push("Сгенерировано `npx tsx scripts/seo-audit.ts --write`. Источник — файлы, которые",
    "отдаёт сервер (`dist/prerender/<route>/index.html`, иначе плоский `dist/<route>.html`),",
    "то есть ровно то, что видит робот. Внесённые вручную правки в этот файл перезапишутся.", "");
  lines.push(`Страниц в манифесте: **${rows.length}** · без замечаний: **${clean}** · URL в sitemap: **${sitemapUrls.length}** · с \`<lastmod>\`: **${rows.filter((r) => r.lastmod).length}**`, "");
  lines.push("| маршрут | H1 | title (дл.) | description (дл.) | canonical | og | JSON-LD | sitemap | в пре-рендеренном файле | H2 | замечания |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const ogMissing = ["og:title", "og:description", "og:type", "og:url", "og:image", "og:locale"].filter((k) => !r.og[k]);
    lines.push(`| \`${r.route}\` | ${r.h1.length} · ${JSON.stringify(r.h1[0] ?? "").slice(0, 46)} | ${r.title.length} | ${r.desc.length} | ${r.canonical ? "есть" : "**нет**"} | ${ogMissing.length ? "**нет " + ogMissing.join(", ") + "**" : "полное"} | ${r.jsonld.map((g) => g.join("+")).join(" / ") || "—"} | ${r.inSitemap ? "да" : "**нет**"} | ${r.file ?? "**нет файла**"} | ${r.h2.length} | ${problems(r).join(", ") || "—"} |`);
  }
  lines.push("", "## Кто на кого ссылается", "");
  lines.push(`Внешних (не из манифеста) целей в <a href>: ${orphanTargets.length ? "**" + orphanTargets.join(", ") + "**" : "нет"}.`, "");
  const weak = rows.filter((r) => r.inbound < 2);
  lines.push(weak.length ? `Страниц с меньше чем 2 входящими ссылками: ${weak.map((r) => `\`${r.route}\` (${r.inbound})`).join(", ")}` : "На каждую страницу ведёт ≥ 2 внутренних ссылок.", "");
  await mkdir(path.dirname(path.join(ROOT, REPORT)), { recursive: true });
  await writeFile(path.join(ROOT, REPORT), `${lines.join("\n")}\n`);
  console.log(`→ ${REPORT}`);
}
