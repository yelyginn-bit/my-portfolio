// Контекстные ссылки для 6 статических посадочных услуг (PROMPT-21 §5):
// 2–3 работы из портфолио той же категории + цены + калькулятор. Связи
// берутся из данных (projectsForCategory), а не прописываются руками —
// иначе появится ещё одна копия, которая разойдётся с остальными.
import { CATEGORY_META, projectsForCategory, type PortfolioCategory } from "../src/portfolio/v3PortfolioData";
import { CALCULATOR_LINK, PRICES_LINK } from "../src/lib/navigation.data";

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

export function relatedWorkHtml(category: PortfolioCategory): string {
  const projects = pickProjects(category, 3);
  const cards = projects
    .map((project) => `<a class="related-work-card" href="/portfolio/${project.slug}">${escapeHtml(project.title)}</a>`)
    .join("\n            ");
  return `
      <section class="related-work" aria-label="Похожие работы">
        <div class="wrap">
          <h2>Похожие <span>работы</span></h2>
          <div class="related-work-list">
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
