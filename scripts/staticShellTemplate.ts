// Достройка навигации для 11 статических страниц (7 услуг + 4 статьи блога).
//
// Важная поправка к первоначальному плану: аудит фазы 4 заявлял, что у этих
// страниц пустой <header> — это было ошибкой метода (`grep -o` не читает
// через перенос строки, зацепил только открывающий тег). На деле у каждой
// страницы уже есть свой рукописный <header><div class="wrap">...<nav>…
// с 4–7 реальными ссылками (разными на каждой странице — Портфолио, Цены,
// контекстная ссылка на соседнюю услугу). Значит не переписываем шапку
// целиком (это и стало бы «серьёзной переделкой», от которой предостерегает
// PROMPT-21 §3.3), а достраиваем в существующий <nav> недостающие пункты.
// Футер — единственное место, где реально пусто: только copyright и кнопка
// Telegram, ни одной ссылки на другую страницу. Туда добавляется настоящий
// подвал-карта сайта.
import { ABOUT_LINK, BLOG_LINK, CALCULATOR_LINK, FOOTER_GROUPS, PHOTO_LINK, PORTFOLIO_OVERVIEW_LINK, PRICES_LINK, type NavLink } from "../src/lib/navigation.data";

const REQUIRED_HEADER_LINKS: readonly NavLink[] = [PORTFOLIO_OVERVIEW_LINK, PHOTO_LINK, PRICES_LINK, BLOG_LINK, ABOUT_LINK, CALCULATOR_LINK];

/** Возвращает те из REQUIRED_HEADER_LINKS, которых ещё нет в переданном HTML шапки. */
function missingLinks(headerHtml: string): NavLink[] {
  return REQUIRED_HEADER_LINKS.filter((item) => !headerHtml.includes(`href="${item.href}"`));
}

/**
 * Вставляет недостающие пункты в существующий <nav>…</nav> шапки страницы,
 * перед закрывающим тегом. Ничего не удаляет и не переставляет — контекстная
 * ссылка на соседнюю услугу и порядок остальных пунктов сохраняются.
 */
export function augmentStaticHeader(html: string, fileLabel: string): string {
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/u);
  if (!headerMatch) throw new Error(`augmentStaticHeader: <header> not found in ${fileLabel}`);
  const headerHtml = headerMatch[0];
  const navCloseIndex = headerHtml.lastIndexOf("</nav>");
  if (navCloseIndex === -1) throw new Error(`augmentStaticHeader: <nav> not found inside <header> of ${fileLabel}`);

  const missing = missingLinks(headerHtml);
  if (missing.length === 0) return html;

  const insertion = missing.map((item) => `            <a href="${item.href}">${item.label}</a>\n`).join("");
  const newHeaderHtml = headerHtml.slice(0, navCloseIndex) + insertion + headerHtml.slice(navCloseIndex);
  return html.replace(headerHtml, newHeaderHtml);
}

/**
 * Вставляет полный подвал-карту сайта (шесть групп из navigation.data.ts)
 * в существующий <footer>, рядом с уже стоящей копирайт-строкой и кнопкой
 * Telegram — их не убирает.
 */
export function augmentStaticFooter(html: string, fileLabel: string): string {
  const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/u);
  if (!footerMatch) throw new Error(`augmentStaticFooter: <footer> not found in ${fileLabel}`);
  const footerHtml = footerMatch[0];
  // v3-footer (PROMPT-32 §11) уже несёт полную карту сайта в своей
  // разметке — второй подвал поверх него не нужен.
  if (footerHtml.includes('class="site-static-footer-nav"') || footerHtml.includes('class="v3-footer"')) return html;

  const groupsHtml = FOOTER_GROUPS.map((group) => {
    const links = group.links.map((item) => `<a href="${item.href}">${item.label}</a>`).join("");
    return `<nav aria-label="${group.title}"><strong>${group.title}</strong>${links}</nav>`;
  }).join("");
  const nav = `\n      <div class="site-static-footer-nav">${groupsHtml}</div>\n    `;

  const footerCloseIndex = footerHtml.lastIndexOf("</footer>");
  const newFooterHtml = footerHtml.slice(0, footerCloseIndex) + nav + footerHtml.slice(footerCloseIndex);
  return html.replace(footerHtml, newFooterHtml);
}

/** Файл → человекочитаемая метка для сообщений об ошибках сборки. */
export const STATIC_SHELL_FILES: readonly string[] = [
  "content-day.html",
  "event-video.html",
  "photo.html",
  "reels.html",
  "reklamnye-roliki.html",
  "pryamye-translyacii.html",
  "video-dlya-marketpleysov.html",
  "blog/kak-snimat-reels-dlya-biznesa.html",
  "blog/skolko-stoit-snyat-reklamnyy-rolik.html",
  "blog/video-dlya-kartochek-wildberries.html",
  "blog/videosemka-meropriyatiy-nn.html",
];
