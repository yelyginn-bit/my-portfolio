/**
 * Рендерер страницы кейса `/cases/<slug>` — механизм, а не опубликованный
 * контент. Страница генерируется из записи реестра `src/lib/portfolio.data.ts`;
 * какие именно slug'и реально публикуются, решает `PUBLISHED_CASE_SLUGS`
 * в `src/public/routeManifest.ts` (сейчас пуст — ни один кейс не публикуется).
 */
import { PageContainer, Section, SectionHeader, SiteFooter, SiteHeader } from "../components/site/Layout";
import KinescopeEmbed from "../components/media/KinescopeEmbed";
import type { PortfolioProject } from "../lib/portfolio.data";

export function CasePage({ project }: { project: PortfolioProject }) {
  return (
    <>
      <SiteHeader active="cases" />

      <main id="main">
        <Section className="case-hero">
          <PageContainer>
            <p className="ds-eyebrow">{project.category}</p>
            <h1>{project.title}</h1>
            <p className="case-hero-lead">{project.role}</p>
          </PageContainer>
        </Section>

        {project.technique.length > 0 && (
          <Section>
            <PageContainer>
              <SectionHeader eyebrow="Техника" title="Чем снято" />
              <ul className="case-technique-list">
                {project.technique.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </PageContainer>
          </Section>
        )}

        {project.videos.length > 0 && (
          <Section>
            <PageContainer>
              <SectionHeader eyebrow="Видео" title="Материалы проекта" />
              <div className="case-video-grid">
                {project.videos.map((video) => (
                  <div key={video.kinescopeId}>
                    <KinescopeEmbed id={video.kinescopeId} orientation={video.orientation} title={video.label} />
                  </div>
                ))}
              </div>
            </PageContainer>
          </Section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

export default CasePage;
