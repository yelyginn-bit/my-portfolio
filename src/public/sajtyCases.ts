export interface SajtyWebsiteCase {
  title: string;
  description: string;
  href: string;
}

/** Add only approved, completed website projects here. Empty means no block. */
export const SAJTY_WEBSITE_CASES: readonly SajtyWebsiteCase[] = [];

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export function renderSajtyCases(): string {
  if (SAJTY_WEBSITE_CASES.length === 0) return "";
  const cards = SAJTY_WEBSITE_CASES.map((item) => `<a class="bb-project-card" href="${escapeHtml(item.href)}"><div class="bb-project-card__media"></div><div class="bb-project-card__meta"><h3 class="bb-project-card__title">${escapeHtml(item.title)}</h3><p class="bb-project-card__role">${escapeHtml(item.description)}</p></div><span class="bb-project-card__arrow" aria-hidden="true">↗</span></a>`).join("");
  return `<section class="sajty-section" aria-label="Другие сайты"><div class="sajty-shell"><div class="bb-work-grid bb-work-grid--2">${cards}</div></div></section>`;
}
