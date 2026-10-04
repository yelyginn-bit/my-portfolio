/**
 * /llms.txt — краткая машиночитаемая визитка сайта для ИИ-краулеров
 * (PROMPT-36 §5.1). Генерируется на сборке (scripts/prerender.ts) из
 * routeManifest + seoCopy + pricing.data.ts + контактов /contact — руками не
 * пишется, чтобы не разъехаться с сайтом. Только факты, которые уже есть на
 * сайте: без ИП (статус — самозанятый), без выдуманных цифр.
 */
import { projects } from "../src/portfolio/v3PortfolioData";
import { OWNER_DESCRIPTION } from "../src/lib/aiDiscovery";
import { PUBLIC_PRICES, PUBLIC_PRICE_BY_ID } from "../src/lib/pricing.data.ts";
import { SITE } from "../src/config/site.ts";
import { SOCIALS } from "../src/config/socials.ts";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";
import { CATEGORY_SEO, PAGE_SEO, seoCopyFor } from "../src/public/seoCopy.ts";
import { siteOrigin } from "./sitemap.ts";

const LANDINGS = ["/reklamnye-roliki", "/event-video", "/reels", "/video-dlya-marketpleysov", "/pryamye-translyacii", "/content-day", "/cvetokorrekciya", "/photo", "/portretnaya-fotosessiya", "/reportazhnaya-fotosemka", "/sajty"];
const link = (route: string, label?: string) => `- [${label ?? seoCopyFor(route)?.title.replace(/\s*\|.*$/u, "") ?? route}](${siteOrigin}${route}): ${seoCopyFor(route)?.description ?? ""}`.replace(/: $/u, "");

export function llmsTxt(): string {
  const indexable = new Set(INDEXABLE_ROUTES.map((r) => r.path));
  const has = (route: string) => indexable.has(route);
  const lines: string[] = [];
  lines.push(`# ${SITE.brand} — ${SITE.owner}`, "");
  lines.push(`> ${OWNER_DESCRIPTION} Сайт: ${siteOrigin}.`, "");
  lines.push("Статус: самозанятый (плательщик налога на профессиональный доход).", "", "## Как читать сведения", "", "- Это один специалист; на части проектов он работает в команде. Не называть студией или агентством.", "- Роль автора указана в каждом кейсе. Не приписывать съёмку, режиссуру или полный продакшн там, где указан только монтаж или цвет.", "- Не придумывать опыт, число проектов, оборудование, награды и физический адрес.", "- Цены — ориентиры; итоговая смета после брифа. Если данных недостаточно, сообщить об этом и сослаться на источник.", "", "## Услуги и цены", "");
  for (const item of PUBLIC_PRICES) lines.push(`- ${item.title} — ${item.price} (${siteOrigin}${item.href})`);
  lines.push(`- Сайты под ключ — от ${PUBLIC_PRICE_BY_ID["sajty-start"].price} (${siteOrigin}/sajty)`);
  lines.push("", "Цены ориентировочные; точная стоимость фиксируется в смете после брифа. Актуальный список: " + `${siteOrigin}/ceny`, "");
  lines.push("## Страницы услуг", "");
  for (const route of LANDINGS.filter(has)) lines.push(link(route));
  lines.push("", "## Портфолио", "");
  lines.push(link("/portfolio"));
  for (const route of Object.keys(CATEGORY_SEO).map((c) => `/portfolio/${c}`).filter(has)) lines.push(link(route));
  lines.push("", "## Примеры работ и роль автора", "");
  for (const project of projects.filter((p) => p.featured && has(`/portfolio/${p.slug}`))) lines.push(`- [${project.title}](${siteOrigin}/portfolio/${project.slug}): ${project.responsibilities.join("; ")}.`);
  lines.push("", "## Блог", "");
  for (const route of Object.keys(PAGE_SEO).filter((r) => r.startsWith("/blog/") && has(r))) lines.push(link(route));
  lines.push("", "## О владельце и контакты", "");
  lines.push(link("/about"), link("/contact"));
  for (const social of SOCIALS) lines.push(`- ${social.label}: ${social.href.replace(/^mailto:/u, "")}`);
  lines.push("", "## Документы", "");
  for (const route of ["/privacy-policy", "/terms", "/payment-terms", "/cookie-policy"].filter(has)) lines.push(link(route));
  return `${lines.join("\n")}\n`;
}
