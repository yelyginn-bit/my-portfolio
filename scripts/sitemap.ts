import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";

export const siteOrigin = "https://yelyginn.ru";
const ROOT = process.cwd();

/**
 * Файлы, от которых зависит страница. `<lastmod>` в sitemap обязан означать
 * «когда изменилось содержимое страницы», а не «когда был деплой»: датой сборки
 * Google научился не верить, а date() из Airflow такие правки молча съедают.
 * Поэтому дата берётся из git по реальным источникам маршрута.
 */
const SOURCES: Record<string, string[]> = {
  v3: ["src/public", "src/portfolio", "src/lib", "index.html"],
  legal: ["src/legal", "legal.html"],
  calculator: ["src/calculator", "calculator.html"],
  prices: ["src/prices", "ceny.html"],
  color: ["src/color", "cvetokorrekciya.html"],
};

const sourcesFor = (routePath: string, render: string): string[] => {
  if (routePath === "/ceny") return SOURCES.prices;
  if (routePath === "/cvetokorrekciya") return SOURCES.color;
  if (render === "v3") return SOURCES.v3;
  if (render === "legal") return SOURCES.legal;
  if (render === "calculator") return SOURCES.calculator;
  const own = [routePath === "/" ? "index.html" : `${routePath.slice(1)}.html`];
  // Общий хром (site-skin.css, site-shell.js) в список НЕ входит: он меняется
  // на всех страницах сразу, и `<lastmod>` превращался бы в дату деплоя.
  return existsSync(path.join(ROOT, own[0])) ? own : ["src/public", "src/lib"];
};

/** Даты кешируются: групп источников ~два десятка, а маршрутов 70. */
const cache = new Map<string, string | null>();

const lastmodFor = (routePath: string, render: string): string | null => {
  const key = sourcesFor(routePath, render).join("|");
  if (cache.has(key)) return cache.get(key) ?? null;
  let date: string | null = null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...key.split("|")], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const iso = /^(\d{4}-\d{2}-\d{2})/u.exec(out);
    if (iso) date = iso[1];
  } catch {
    // Нет git (сборка в docker без .git) — лучше отдать sitemap без lastmod,
    // чем выдумать дату: отсутствие тега робот переносит, ложную дату — нет.
    date = null;
  }
  cache.set(key, date);
  return date;
};

export function sitemapXml() {
  const urls = INDEXABLE_ROUTES.map((route) => {
    const lastmod = lastmodFor(route.path, route.render);
    return [
      "  <url>",
      `    <loc>${siteOrigin}${route.path}</loc>`,
      ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
      "    <changefreq>monthly</changefreq>",
      `    <priority>${route.priority ?? 0.5}</priority>`,
      "  </url>",
    ].join("\n");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
