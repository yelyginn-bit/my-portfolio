// Контекстные ссылки для 6 статических посадочных услуг (PROMPT-21 §5):
// 2–3 работы из портфолио той же категории + цены + калькулятор. Связи
// берутся из данных (projectsForCategory), а не прописываются руками —
// иначе появится ещё одна копия, которая разойдётся с остальными.
import { assetsForProject, CATEGORY_META, posterUrl, projectsForCategory, type PortfolioCategory } from "../src/portfolio/v3PortfolioData";
import { CALCULATOR_LINK, PRICES_LINK, SERVICE_LINKS } from "../src/lib/navigation.data";

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Файл → категория портфолио, чьи работы показываются как «похожие». */
export const SERVICE_CATEGORY: Readonly<Record<string, PortfolioCategory>> = {
  "reklamnye-roliki.html": "commercial",
  "event-video.html": "events",
  "reels.html": "reels",
  "video-dlya-marketpleysov.html": "product",
  "content-day.html": "reels",
  "pryamye-translyacii.html": "broadcast",
};

function pickProjects(category: PortfolioCategory, count: number) {
  const all = projectsForCategory(category);
  const featured = all.filter((project) => project.featured);
  const rest = all.filter((project) => !project.featured);
  return [...featured, ...rest].slice(0, count);
}

/** Карточка с превью (PROMPT-32 §19) — тот же bb-project-card, что и на
 * главной странице у «Выбранных работ», первый реальный кадр проекта
 * (assetsForProject/posterUrl — те же источники, что и у остальных превью
 * портфолио), а не серая плашка с одним текстом. */
export function relatedWorkHtml(category: PortfolioCategory): string {
  const projects = pickProjects(category, 3);
  const cards = projects
    .map((project) => {
      const asset = assetsForProject(project.id)[0];
      const media = asset
        ? `<div class="bb-project-card__media"><img src="${posterUrl(asset.kinescopeId, "md")}" alt="" loading="lazy" decoding="async" width="640" height="${asset.orientation === "portrait" ? 853 : 360}" /></div>`
        : "";
      const role = project.client ? escapeHtml(project.client) : escapeHtml(CATEGORY_META[category].title);
      return `<a class="bb-project-card" href="/portfolio/${project.slug}">${media}<div class="bb-project-card__meta"><p class="bb-project-card__title">${escapeHtml(project.title)}</p><p class="bb-project-card__role">${role}</p></div></a>`;
    })
    .join("\n            ");
  return `
      <section class="related-work" aria-label="Похожие работы">
        <div class="wrap">
          <h2>Похожие <span>работы</span></h2>
          <div class="bb-work-grid bb-work-grid--3 related-work-list">
            ${cards}
          </div>
          <div class="links-row related-work-actions">
            <a class="tag" href="/portfolio/${category}">Все работы категории «${escapeHtml(CATEGORY_META[category].title)}»</a>
            <a class="tag" href="${PRICES_LINK.href}">${PRICES_LINK.label}</a>
            <a class="tag" href="${CALCULATOR_LINK.href}">${CALCULATOR_LINK.label}</a>
          </div>
        </div>
      </section>`;
}

export function augmentServiceRelatedWork(html: string, fileLabel: string): string {
  const category = SERVICE_CATEGORY[fileLabel];
  if (!category) return html;
  if (html.includes('class="related-work"')) return html;
  const mainCloseIndex = html.lastIndexOf("</main>");
  if (mainCloseIndex === -1) throw new Error(`augmentServiceRelatedWork: </main> not found in ${fileLabel}`);
  const section = relatedWorkHtml(category);
  return html.slice(0, mainCloseIndex) + section + "\n    " + html.slice(mainCloseIndex);
}

/** Файл статьи блога → услуга, о которой она (PROMPT-21 §5: «статья блога →
 * услуга, о которой она, и калькулятор»). */
export const BLOG_SERVICE: Readonly<Record<string, string>> = {
  "blog/kak-snimat-reels-dlya-biznesa.html": "/reels",
  "blog/skolko-stoit-snyat-reklamnyy-rolik.html": "/reklamnye-roliki",
  "blog/video-dlya-kartochek-wildberries.html": "/video-dlya-marketpleysov",
  "blog/videosemka-meropriyatiy-nn.html": "/event-video",
};

export function augmentBlogContext(html: string, fileLabel: string): string {
  if (html.includes('class="blog-context"')) return html;
  const mainCloseIndex = html.lastIndexOf("</main>");
  if (mainCloseIndex === -1) throw new Error(`augmentBlogContext: </main> not found in ${fileLabel}`);
  const serviceHref = BLOG_SERVICE[fileLabel];
  const service = SERVICE_LINKS.find((item) => item.href === serviceHref);
  const serviceLink = service ? `<a class="tag" href="${service.href}">${escapeHtml(service.label)}</a>\n            ` : "";
  const section = `
      <section class="blog-context" aria-label="Дальше по теме">
        <div class="wrap">
          <h2>Дальше <span>по теме</span></h2>
          <div class="links-row blog-context-actions">
            ${serviceLink}<a class="tag" href="${CALCULATOR_LINK.href}">${CALCULATOR_LINK.label}</a>
          </div>
        </div>
      </section>`;
  return html.slice(0, mainCloseIndex) + section + "\n    " + html.slice(mainCloseIndex);
}
