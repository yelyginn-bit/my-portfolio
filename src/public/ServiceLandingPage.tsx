import {posterSrcSet} from "../lib/responsiveImages";
import type { CSSProperties } from "react";
import { SiteHeader, SiteFooter } from "./V3App";
import { ALL_SERVICE_LANDINGS } from "./serviceLandings.data";
import { projectById, assetsForProject, posterUrl } from "../portfolio/v3PortfolioData";
import { longestWordEm } from "../lib/capsFit";
import KinescopeEmbed from "../components/media/KinescopeEmbed";
import { PUBLIC_PRICE_BY_ID } from "../lib/pricing.data";

export default function ServiceLandingPage({ path }: { path: string }) {
  const page = ALL_SERVICE_LANDINGS.find((item) => item.path === path);
  if (!page) throw new Error(`Unknown service landing: ${path}`);
  const priceIds = "priceIds" in page ? page.priceIds : [];
  const prices = priceIds.map((id) => {
    const item = PUBLIC_PRICE_BY_ID[id];
    if (!item) throw new Error("Unknown service price: " + id);
    return item;
  });
  return <><SiteHeader /><main className="v3-project v3-shell">
    {prices.length > 0 && <nav aria-label="Хлебные крошки"><a className="v3-project__back" href="/">Главная</a>{" / "}<span aria-current="page">{page.label}</span></nav>}
    <header className="v3-project__head"><div className="v3-project__title"><p className="v3-kicker">Нижний Новгород / Услуги</p><h1 style={{"--title-em": longestWordEm(page.h1)} as CSSProperties}>{page.h1}</h1></div><dl><dt>Формат</dt><dd>{page.label}</dd><dt>Стоимость</dt><dd>{prices.length === 1 ? prices[0].price : "Рассчитаю под задачу"}</dd></dl></header>
    <p className="v3-project__description">{page.intro}</p>
    <section className="v3-project__case"><div><h2>{page.heading}</h2><p>{page.body}</p></div><div><h2>Стоимость и состав</h2>{prices.length > 0 ? prices.map((item) => <article key={item.id} data-service-price={item.id}><h3>{item.title}</h3><p className="v3-project__description">{item.price}</p><p>{item.description}</p><ul>{item.includes.map((part) => <li key={part}>{part}</li>)}</ul><p>{item.limitations}</p><p>{item.timeline}</p></article>) : <p>Стоимость рассчитаю под задачу. Съёмку, монтаж и дополнительные версии согласуем до начала работы.</p>}<p><a href="/ceny">Ориентиры стоимости</a> · <a href="/contact">Обсудить проект</a></p></div></section>
    {page.projectIds.length > 0 && <section className="v3-project__media" aria-label="Примеры работ">{page.projectIds.map((id) => {
      const project = projectById.get(id); if (!project) throw new Error(`Missing published project: ${id}`);
      const asset = assetsForProject(id)[0]; if (!asset) throw new Error(`Missing published video: ${id}`);
      return <article key={id}><h2><a href={`/portfolio/${project.slug}`}>{project.title}</a></h2><p>{project.description}</p><p>Моя роль: {project.responsibilities.join(" · ")}.</p><KinescopeEmbed id={asset.kinescopeId} orientation={asset.orientation === "portrait" ? "9:16" : "16:9"} title={project.title} poster={{src: posterUrl(asset.kinescopeId, "md"), srcSet: posterSrcSet(asset.kinescopeId), sizes: "(max-width: 720px) 94vw, 80vw", alt: `Кадр проекта «${project.title}»`}} /></article>;
    })}</section>}
    <nav className="v3-project__related-actions" aria-label="Близкие услуги">{page.related.map((href,index)=><a key={href} className="v3-project__related-service" href={href}>{page.relatedLabels[index]}</a>)}<a className="v3-project__related-service" href="/ceny">Цены</a></nav>
  </main><SiteFooter /></>;
}
