import type { CSSProperties } from "react";
import { SiteHeader, SiteFooter } from "./V3App";
import { SERVICE_LANDINGS } from "./serviceLandings.data";
import { projectById, assetsForProject, posterUrl } from "../portfolio/v3PortfolioData";
import { longestWordEm } from "../lib/capsFit";
import KinescopeEmbed from "../components/media/KinescopeEmbed";

export default function ServiceLandingPage({ path }: { path: string }) {
  const page = SERVICE_LANDINGS.find((item) => item.path === path);
  if (!page) throw new Error(`Unknown service landing: ${path}`);
  return <><SiteHeader /><main className="v3-project v3-shell">
    <header className="v3-project__head"><div className="v3-project__title"><p className="v3-kicker">Нижний Новгород / Услуги</p><h1 style={{"--title-em": longestWordEm(page.h1)} as CSSProperties}>{page.h1}</h1></div><dl><dt>Формат</dt><dd>{page.label}</dd><dt>Стоимость</dt><dd>Рассчитаю под задачу</dd></dl></header>
    <p className="v3-project__description">{page.intro}</p>
    <section className="v3-project__case"><div><h2>{page.heading}</h2><p>{page.body}</p></div><div><h2>Стоимость и состав</h2><p>Стоимость рассчитаю под задачу. Съёмку, монтаж и дополнительные версии согласуем до начала работы.</p><p><a href="/ceny">Ориентиры стоимости</a> · <a href="/contact">Обсудить проект</a></p></div></section>
    <section className="v3-project__media" aria-label="Примеры работ">{page.projectIds.map((id) => {
      const project = projectById.get(id); if (!project) throw new Error(`Missing published project: ${id}`);
      const asset = assetsForProject(id)[0]; if (!asset) throw new Error(`Missing published video: ${id}`);
      return <article key={id}><h2><a href={`/portfolio/${project.slug}`}>{project.title}</a></h2><p>{project.description}</p><p>Моя роль: {project.responsibilities.join(" · ")}.</p><KinescopeEmbed id={asset.kinescopeId} orientation={asset.orientation === "portrait" ? "9:16" : "16:9"} title={project.title} poster={{src: posterUrl(asset.kinescopeId, "md"), alt: `Кадр проекта «${project.title}»`}} /></article>;
    })}</section>
    <nav className="v3-project__related-actions" aria-label="Близкие услуги">{page.related.map((href,index)=><a key={href} className="v3-project__related-service" href={href}>{page.relatedLabels[index]}</a>)}<a className="v3-project__related-service" href="/ceny">Цены</a></nav>
  </main><SiteFooter /></>;
}
