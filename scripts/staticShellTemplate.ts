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
import { ABOUT_LINK, BLOG_LINK, CALCULATOR_LINK, CONTACT_LINK, FOOTER_GROUPS, PHOTO_LINK, PORTFOLIO_OVERVIEW_LINK, PRICES_LINK, PRIMARY_NAV, type NavLink } from "../src/lib/navigation.data";
import { SITE } from "../src/config/site";

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
  "404.html",
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

// ── V3 chrome — общая шапка/подвал (PROMPT-32 §10-11, PROMPT-33 §Б) ────────
//
// Разметка — не копия классов, а тот же рендер, что и у React SiteHeader/
// SiteFooter (src/public/V3App.tsx): один источник (navigation.data.ts),
// два способа получить из него HTML — JSX на V3-страницах, эти функции на
// статических. Выпадающие "Услуги"/"Портфолио" — <details>/.nav-dropdown +
// public/v3-header-behavior.js вместо React-портала (тот же приём, что на
// пилоте). CSS — прямая ссылка на src/design-system.css и src/v3-polish.css:
// Vite обрабатывает <link> в любом зарегистрированном в rollupOptions.input
// HTML-входе так же, как импорт из скрипта (хеширует, код-сплитит), второй
// копии стилей не появляется.

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export interface V3ChromeActive {
  /** href текущего пункта верхнего уровня (Фото/Цены/Блог/Обо мне). */
  topLevelHref?: string;
  /** href текущей услуги внутри выпадающего "Услуги" (SERVICE_LINKS). */
  serviceHref?: string;
}

function renderNavEntry(entry: (typeof PRIMARY_NAV)[number], active: V3ChromeActive, mobile: boolean): string {
  if (entry.kind === "link") {
    const current = entry.href === active.topLevelHref;
    return `<a href="${entry.href}"${current ? ' aria-current="page"' : ""}>${escapeHtml(entry.label)}</a>`;
  }
  const isServices = entry.label === "Услуги";
  const activeHref = isServices ? active.serviceHref : undefined;
  const items = entry.items
    .map((item) => `<a href="${item.href}"${item.href === activeHref ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`)
    .join("");
  if (mobile) {
    const overview = entry.href ? `<a href="${entry.href}">Все — ${entry.label.toLowerCase()}</a>` : "";
    return `<details class="nav-dropdown-mobile-group"><summary${activeHref ? ' aria-current="page"' : ""}>${escapeHtml(entry.label)}</summary>${overview}${items}</details>`;
  }
  const overview = entry.href ? `<a href="${entry.href}">${isServices ? "Всё" : "Всё портфолио"}</a>` : "";
  return `<div class="nav-dropdown"><button type="button" aria-expanded="false"${activeHref ? ' data-active="true"' : ""}>${escapeHtml(entry.label)}</button><div class="nav-dropdown-menu">${overview}${items}</div></div>`;
}

export function renderV3Header(active: V3ChromeActive = {}): string {
  const desktopLinks = PRIMARY_NAV.map((entry) => renderNavEntry(entry, active, false)).join("");
  const mobileLinks = PRIMARY_NAV.map((entry) => renderNavEntry(entry, active, true)).join("");
  return `<header class="v3-header">
      <nav class="v3-nav" aria-label="Основная навигация">
        <a class="v3-nav__brand" href="/" aria-label="YELYGINN — главная">Y</a>
        <div class="v3-nav__links">${desktopLinks}</div>
        <a class="nav-calc-button" href="${CALCULATOR_LINK.href}">${escapeHtml(CALCULATOR_LINK.label)}</a>
        <span class="v3-nav__status">CORE // READY</span>
        <a class="v3-nav__cta" href="${CONTACT_LINK.href}"><span class="v3-nav__cta-full">${escapeHtml(CONTACT_LINK.label.toUpperCase())}</span><span class="v3-nav__cta-short">ОБСУДИТЬ</span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></a>
        <button class="v3-nav__menu" type="button" aria-expanded="false" aria-controls="v3-mobile-menu" aria-label="Открыть меню"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg></button>
      </nav>
    </header>
    <div id="v3-mobile-menu" class="v3-mobile-menu" hidden>
      <a class="v3-mobile-menu__calc" href="${CALCULATOR_LINK.href}">${escapeHtml(CALCULATOR_LINK.label)}</a>
      ${mobileLinks}
      <a href="${CONTACT_LINK.href}">${escapeHtml(CONTACT_LINK.label)} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></a>
      <div class="v3-mobile-menu__contacts">
        <a href="${SITE.telegramUrl}">Telegram</a>
        <a href="mailto:${SITE.email}">Email</a>
      </div>
    </div>`;
}

export function renderV3Footer(active: V3ChromeActive = {}): string {
  const groups = FOOTER_GROUPS.map((group) => {
    const links = group.links
      .map((item) => `<a href="${item.href}"${item.href === active.serviceHref || item.href === active.topLevelHref ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`)
      .join("");
    return `<nav aria-label="${escapeHtml(group.title)}"><strong>${escapeHtml(group.title)}</strong>${links}</nav>`;
  }).join("");
  return `<footer class="v3-footer">
      <div class="v3-footer__wordmark" aria-label="YELYGINN">
        <svg viewBox="-12 -981 4725 1235" preserveAspectRatio="xMinYMid meet" role="img" aria-hidden="true">
          <text x="0" y="0">YELYGINN</text>
        </svg>
      </div>
      <div class="v3-footer__groups">${groups}</div>
      <div class="v3-footer__meta">
        <span>© 2026 YELYGINN</span>
        <nav aria-label="Юридическая информация"><a href="/privacy-policy">Политика</a><a href="/personal-data-consent">Согласие</a><a href="/cookie-policy">Cookies</a><button type="button" data-cookie-settings>Настройки cookie</button></nav>
        <span>НИЖНИЙ НОВГОРОД // РОССИЯ</span>
      </div>
    </footer>`;
}

/**
 * Заменяет существующие <header>/<footer> страницы на общий V3-компонент
 * целиком (не достраивает, как augmentStaticHeader/Footer выше) и добавляет
 * ссылки на design-system.css/v3-polish.css + поведенческий скрипт, если их
 * ещё нет. Старые классы страницы (.logo/.inner/nav, .foot/.foot-copy)
 * перестают использоваться в разметке — их CSS в собственном <style> файла
 * можно удалить отдельным проходом (agentами уже проверено на пилоте).
 */
export function replaceWithV3Chrome(html: string, fileLabel: string, active: V3ChromeActive = {}): string {
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/u);
  if (!headerMatch) throw new Error(`replaceWithV3Chrome: <header> not found in ${fileLabel}`);
  let result = html.replace(headerMatch[0], renderV3Header(active));

  const footerMatch = result.match(/<footer[^>]*>[\s\S]*?<\/footer>/u);
  if (!footerMatch) throw new Error(`replaceWithV3Chrome: <footer> not found in ${fileLabel}`);
  result = result.replace(footerMatch[0], renderV3Footer(active));

  // Ссылки на design-system.css/v3-polish.css НЕ добавляются здесь: к моменту
  // transformIndexHtml Vite уже построил граф ассетов по исходному файлу на
  // диске — тег, вписанный в этот момент, остаётся буквальной строкой
  // /src/design-system.css в dist/, не хешируется и не резолвится. Оба тега
  // должны быть в самом .html-файле (как на пилоте, PROMPT-32 §10) —
  // добавлены отдельно в каждый файл из V3_CHROME_FILES при первом переводе.
  if (!result.includes("v3-header-behavior.js")) {
    result = result.replace(/<\/body>/u, `    <script src="/v3-header-behavior.js" defer></script>\n  </body>`);
  }
  return result;
}
