import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiAskBlock } from "../src/components/site/AiAskBlock";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SITE } from "../src/config/site";
import { SOCIALS } from "../src/config/socials";
import { OWNER_DESCRIPTION } from "../src/lib/aiDiscovery";
import { PUBLIC_PRICES } from "../src/lib/pricing.data";
import { projects } from "../src/portfolio/v3PortfolioData";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest";
import { seoCopyFor } from "../src/public/seoCopy";
import { siteOrigin } from "./sitemap";

const personId = `${siteOrigin}/#person`;
const businessId = `${siteOrigin}/#business`;
const websiteId = `${siteOrigin}/#website`;
const city = { "@type": "City", name: SITE.location };
const ref = (id: string) => ({ "@id": id });

export function discoveryGraph(route: string) {
  const url = `${siteOrigin}${route}`;
  const copy = seoCopyFor(route);
  const graph: Record<string, unknown>[] = [
    { "@type": "WebSite", "@id": websiteId, url: siteOrigin, name: SITE.brand, inLanguage: "ru" },
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: copy?.title, description: copy?.description, inLanguage: "ru", isPartOf: ref(websiteId), about: ref(personId) },
  ];
  if (["/", "/about", "/contact", "/ceny", "/photo"].includes(route)) {
    graph.push(
      { "@type": "Person", "@id": personId, name: SITE.owner, alternateName: SITE.brand, jobTitle: "Фотограф, видеооператор, режиссёр монтажа и колорист", url: `${siteOrigin}/about`, description: OWNER_DESCRIPTION, homeLocation: city, email: SITE.email, sameAs: SOCIALS.filter((s) => !s.href.startsWith("mailto:")).map((s) => s.href) },
      { "@type": "LocalBusiness", "@id": businessId, name: `${SITE.owner} — ${SITE.brand}`, url: siteOrigin, description: OWNER_DESCRIPTION, email: SITE.email, address: { "@type": "PostalAddress", addressLocality: SITE.location, addressCountry: "RU" }, areaServed: city },
    );
  }
  const prices = route === "/ceny" ? PUBLIC_PRICES.filter((p) => p.showOnCatalog !== false) : PUBLIC_PRICES.filter((p) => p.href === route && route !== "/calculator");
  if (prices.length) {
    graph.push({ "@type": "OfferCatalog", "@id": `${url}#offers`, name: route === "/ceny" ? "Услуги и ориентиры стоимости" : copy?.title, itemListElement: prices.map((p) => ({ "@type": "Offer", "@id": `${siteOrigin}/#offer-${p.id}`, url: `${siteOrigin}${p.href}`, seller: ref(businessId), description: `${p.price}. ${p.limitations}`, itemOffered: { "@type": "Service", name: p.title, description: p.description, provider: ref(personId), areaServed: city } })) });
    if (route === "/ceny") graph.find((n) => n["@id"] === businessId)!.hasOfferCatalog = ref(`${url}#offers`);
  }
  if (route === "/portfolio") {
    const visible = projects;
    graph.push({ "@type": "ItemList", "@id": `${url}#works`, name: "Работы Юрия Елыгина", itemListElement: visible.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.title, url: `${siteOrigin}/portfolio/${p.slug}` })) });
  }
  const project = projects.find((p) => route === `/portfolio/${p.slug}`);
  if (project) {
    const workId = `${url}#work`;
    graph.push({ "@type": "CreativeWork", "@id": workId, name: project.title, description: project.description, url, contributor: ref(personId), creditText: `${SITE.owner}: ${project.responsibilities.join(", ")}` });
    graph.find((n) => n["@type"] === "WebPage")!.mainEntity = ref(workId);
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

const dimensions = new Map<string, Promise<{ width?: number; height?: number }>>();
async function imageDimensions(src: string, dist: string) {
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  const file = path.resolve(dist, `.${decodeURIComponent(src.split(/[?#]/u)[0])}`);
  if (!file.startsWith(`${path.resolve(dist)}${path.sep}`)) return null;
  if (!dimensions.has(file)) dimensions.set(file, sharp(file).metadata().then((m) => ({ width: m.width, height: m.height })).catch(() => ({})));
  return dimensions.get(file)!;
}

export async function enrichPublicHtml(html: string, route: string, dist: string) {
  let result = html;
  if (result.includes('class="v3-footer"') && !result.includes("data-ai-ask")) result = result.replace('<div class="v3-footer__meta">', `${renderToStaticMarkup(createElement(AiAskBlock))}<div class="v3-footer__meta">`);
  const tags = [...result.matchAll(/<img\b[^>]*>/giu)];
  for (const match of tags) {
    const tag = match[0];
    const src = /\bsrc="([^"]+)"/iu.exec(tag)?.[1];
    if (!src || (/\bwidth=/iu.test(tag) && /\bheight=/iu.test(tag))) continue;
    const size = await imageDimensions(src, dist);
    if (!size?.width || !size.height) continue;
    const width = Number(/\bwidth="(\d+)"/iu.exec(tag)?.[1]) || size.width;
    const height = Number(/\bheight="(\d+)"/iu.exec(tag)?.[1]) || Math.round(width * size.height / size.width);
    const attrs = `${/\bwidth=/iu.test(tag) ? "" : ` width="${width}"`}${/\bheight=/iu.test(tag) ? "" : ` height="${height}"`}`;
    result = result.replace(tag, tag.replace(/\s*\/?>(?=$)/u, `${attrs}>`));
  }
  // Developer comments are not page content and must not be counted as images.
  const schema = JSON.stringify(discoveryGraph(route)).replaceAll("<", "\\u003c");
  result = result.replace("</head>", `<script type="application/ld+json" data-ai-discovery>${schema}</script>\n</head>`);
  if (result.includes("data-ai-ask") && !result.includes('src="/ai-ask.js"')) result = result.replace("</body>", '<script src="/ai-ask.js" defer></script>\n</body>');
  return result;
}

export async function enrichPublicOutput(dist: string) {
  for (const route of INDEXABLE_ROUTES) {
    const files = route.path === "/" ? [path.join(dist, "index.html"), path.join(dist, "prerender/index.html")] : [path.join(dist, `${route.path.slice(1)}.html`), path.join(dist, "prerender", route.path.slice(1), "index.html")];
    for (const file of files) {
      const html = await readFile(file, "utf8").catch(() => null);
      if (html !== null) await writeFile(file, await enrichPublicHtml(html, route.path, dist));
    }
  }
}
