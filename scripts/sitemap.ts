import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";

export const siteOrigin = "https://yelyginn.ru";

export function sitemapXml() {
  const urls = INDEXABLE_ROUTES.map((route) => [
    "  <url>",
    `    <loc>${siteOrigin}${route.path}</loc>`,
    "    <changefreq>monthly</changefreq>",
    `    <priority>${route.priority ?? 0.5}</priority>`,
    "  </url>",
  ].join("\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
