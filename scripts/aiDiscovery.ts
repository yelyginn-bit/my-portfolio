import {SHOOTS} from "../src/public/shoots.data";
import {shootPath,photoPath} from "../src/shoots/model";
import {responsiveSrcSet} from "../src/lib/responsiveImages";
import { SERVICE_LANDINGS } from "../src/public/serviceLandings.data";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiAskBlock } from "../src/components/site/AiAskBlock";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { applyOgImage } from "./ogImages";
import { SITE } from "../src/config/site";
import { SOCIALS } from "../src/config/socials";
import { OWNER_DESCRIPTION } from "../src/lib/aiDiscovery";
import { PUBLIC_PRICES, type PublicPriceItem } from "../src/lib/pricing.data";
import { projects } from "../src/portfolio/v3PortfolioData";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest";
import { seoCopyFor } from "../src/public/seoCopy";
import { siteOrigin } from "./sitemap";

const personId = `${siteOrigin}/#person`;
const businessId = `${siteOrigin}/#business`;
const websiteId = `${siteOrigin}/#website`;
const city = { "@type": "City", name: SITE.location };
const ref = (id: string) => ({ "@id": id });

const pricesForRoute = (route: string) => route === "/ceny"
  ? PUBLIC_PRICES.filter((p) => p.showOnCatalog !== false)
  : PUBLIC_PRICES.filter((p) => p.href.split("#")[0] === route && route !== "/calculator");
const serviceFor = (p: PublicPriceItem) => ({ "@type": "Service", name: p.title, description: p.description, provider: ref(personId), areaServed: city });
const catalogItemFor = (p: PublicPriceItem) => {
  const amount = p.price.match(/\d[\d\s ]*/u)?.[0].replace(/[\s ]/gu, "");
  // An individually estimated service has no public numeric offer. Never
  // invent a zero price to satisfy the Offer gate.
  if (!amount) return { ...serviceFor(p), description: `${p.price}. ${p.limitations}` };
  return { "@type": "Offer", "@id": `${siteOrigin}/#offer-${p.id}`, name: p.title, price: amount, priceCurrency: "RUB", url: `${siteOrigin}${p.href}`, seller: ref(businessId), description: `${p.price}. ${p.limitations}`, itemOffered: serviceFor(p) };
};

export function discoveryGraph(route: string) {
  const url = `${siteOrigin}${route}`;
  const copy = seoCopyFor(route);
  const graph: Record<string, unknown>[] = [
    { "@type": "WebSite", "@id": websiteId, url: siteOrigin, name: SITE.brand, inLanguage: "ru" },
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: copy?.title, description: copy?.description, inLanguage: "ru", isPartOf: ref(websiteId), about: ref(personId) },
  ];
  if (["/", "/about", "/contact", "/ceny", "/photo", "/portretnaya-fotosessiya", "/reportazhnaya-fotosemka"].includes(route)) {
    graph.push(
      { "@type": "Person", "@id": personId, name: SITE.owner, alternateName: SITE.brand, jobTitle: "Видеограф, фотограф, видеооператор, режиссёр монтажа и колорист", url: `${siteOrigin}/about`, description: OWNER_DESCRIPTION, homeLocation: city, email: SITE.email, sameAs: SOCIALS.filter((s) => !s.href.startsWith("mailto:")).map((s) => s.href) },
      { "@type": "LocalBusiness", "@id": businessId, name: `${SITE.owner} — ${SITE.brand}`, url: siteOrigin, description: OWNER_DESCRIPTION, email: SITE.email, address: { "@type": "PostalAddress", addressLocality: SITE.location, addressCountry: "RU" }, areaServed: city },
    );
  }
  const shoot=SHOOTS.find(s=>shootPath(s)===route);
  if (shoot) graph.push({"@type":"ImageGallery","@id":`${url}#series`,name:shoot.title,description:shoot.concept.join("\n\n"),dateCreated:shoot.date,url,image:shoot.photos.map(p=>({"@type":"ImageObject",contentUrl:siteOrigin+photoPath(shoot,p,p.widths.at(-1)!),caption:p.alt,width:p.width,height:p.height}))});
  const prices = pricesForRoute(route);
  if (prices.length) {
    graph.push({ "@type": "OfferCatalog", "@id": `${url}#offers`, name: route === "/ceny" ? "Услуги и ориентиры стоимости" : copy?.title, itemListElement: prices.map(catalogItemFor) });
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
  const landing = SERVICE_LANDINGS.find((page) => page.path === route);
  if (landing) {
    graph.push({"@type": "Service", "@id": `${url}#service`, name: landing.h1, description: landing.intro, provider: ref(personId), areaServed: city, url});
    graph.push({"@type": "BreadcrumbList", name: `Навигация: ${landing.h1}`, itemListElement: [{"@type":"ListItem", position:1, name:"Главная", item:siteOrigin+"/"}, {"@type":"ListItem", position:2, name:landing.h1, item:url}]});
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Normalize the existing authored facts and supplement missing page types. */
function pageStructuredData(html: string, route: string) {
  const copy = seoCopyFor(route);
  const types = new Set<string>();
  const article = route.startsWith("/blog/");
  const service = INDEXABLE_ROUTES.some((r) => r.path === route && r.render === "static") && !article && route !== "/ceny";
  const normalize = (value: any): void => {
    if (Array.isArray(value)) { value.forEach(normalize); return; }
    if (!value || typeof value !== "object") return;
    if (article && value["@type"] === "Article") value["@type"] = "BlogPosting";
    const type = value["@type"];
    if (typeof type === "string") types.add(type);
    if (["BlogPosting", "FAQPage", "Offer"].includes(type) && !value.name) value.name = value.headline || value.description || copy?.title;
    if (type === "Service" && value.offers) {
      const offers = pricesForRoute(route).map(catalogItemFor).filter((p) => p["@type"] === "Offer");
      if (offers.length) value.offers = offers;
      else delete value.offers;
    }
    for (const child of Object.values(value)) normalize(child);
  };
  const output = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/giu, (_tag, open, raw, close) => {
    const data = JSON.parse(raw);
    normalize(data);
    return open + JSON.stringify(data).replaceAll("<", "\\u003c") + close;
  });
  const extra: Record<string, unknown>[] = [];
  const url = siteOrigin + route;
  if (service && !types.has("Service")) extra.push({ "@type": "Service", "@id": `${url}#service`, name: copy?.title, description: copy?.description, url, provider: ref(businessId), areaServed: city });
  if (article && !types.has("BlogPosting")) extra.push({ "@type": "BlogPosting", "@id": `${url}#article`, name: copy?.title, headline: copy?.title, description: copy?.description, author: { "@type": "Person", name: SITE.owner, "@id": personId }, mainEntityOfPage: url, inLanguage: "ru" });
  if ((service || article) && !types.has("BreadcrumbList")) {
    const trail = [{ name: "Главная", item: siteOrigin + "/" }, ...(article ? [{ name: "Блог", item: siteOrigin + "/blog" }] : []), { name: copy?.title, item: url }];
    extra.push({ "@type": "BreadcrumbList", "@id": `${url}#breadcrumbs`, name: "Навигация по странице", itemListElement: trail.map((item, i) => ({ "@type": "ListItem", position: i + 1, ...item })) });
  }
  return { html: output, extra };
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
  let result = applyOgImage(html, route);
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
  result = result.replace(/<img\b[^>]*data-responsive-widths="([0-9, ]+)"[^>]*>/giu, (tag, widths: string) => {
    const src = /\bsrc="([^"]+)"/iu.exec(tag)?.[1];
    const candidates = src ? responsiveSrcSet(src) : undefined;
    if (!candidates) throw new Error(`Responsive image is not processed: ${src}`);
    const existing = /\bsrcset="([^"]+)"/iu.exec(tag)?.[1];
    if (!existing) return tag.replace(/\s*\/?>(?=$)/u, ` srcset="${candidates}">`);
    const requested = new Set(widths.split(",").map(Number));
    const additions = candidates.split(", ").filter((candidate) => requested.has(Number(candidate.match(/ (\d+)w$/u)?.[1])));
    return tag.replace(/\bsrcset="[^"]+"/iu, `srcset="${[...additions, existing].join(", ")}"`);
  });
  // Developer comments are not page content and must not be counted as images.
  const normalized = pageStructuredData(result, route);
  result = normalized.html;
  const graph = discoveryGraph(route);
  graph["@graph"].push(...normalized.extra);
  const schema = JSON.stringify(graph).replaceAll("<", "\\u003c");
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
