import { ArrowUpRight } from "lucide-react";
import { SiteFooter, SiteHeader, PageContainer } from "../components/site/Layout";
import { SITE } from "../config/site";
import { PUBLIC_PRICES } from "../lib/pricing.data";

export default function Prices() {
  return <div className="price-page"><SiteHeader /><main>
    <PageContainer as="section" className="price-page-hero"><div><p>Прайс / ориентиры</p><h1>Стоимость продакшна</h1></div><div><p>Понятные точки входа для съёмки, монтажа, фото и регулярного контента.</p><small>Точная стоимость рассчитывается после брифа и фиксируется в смете.</small></div></PageContainer>
    <PageContainer as="section" className="price-page-catalog"><header><p>Основные услуги</p><h2>Выберите подходящий формат</h2></header><div className="price-page-list">{PUBLIC_PRICES.map((item,index)=><article key={item.id} className={item.featured?"is-featured":""}><div className="price-page-index">{String(index+1).padStart(2,"0")}</div><div className="price-page-name"><span>{item.category}</span><h3>{item.title}</h3><p>{item.description}</p></div><strong>{item.price}</strong><div className="price-page-details"><p>{item.includes.join(" · ")}</p><small>{item.limitations}<br />{item.timeline}.</small></div><div className="price-page-actions"><a href={item.portfolioHref}>Работы</a><a href={item.href} aria-label={`${item.title}: подробнее`}><ArrowUpRight /></a></div></article>)}</div></PageContainer>
    <section className="price-page-cta"><PageContainer><p>Калькулятор даст предварительный ориентир. Финальный состав и стоимость фиксируются после короткого брифа.</p><h2>Есть задача?<br />Соберём точную смету.</h2><div><a href="/calculator">Рассчитать стоимость</a><a href={SITE.telegramUrl}>Написать в Telegram</a></div></PageContainer></section>
  </main><SiteFooter /></div>;
}
