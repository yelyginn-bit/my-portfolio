import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  Image as ImageIcon,
  Play,
  Send,
} from "lucide-react";
import {
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_CATEGORY_PAGES,
  featuredPortfolioItems,
  getPortfolioItems,
  type PortfolioCategory,
  type PortfolioItem,
} from "./portfolioData";
import { SiteFooter } from "../components/site/Layout";

const TELEGRAM_URL = "https://t.me/YuriElygin";
const NAV_PORTFOLIO_CATEGORIES = PORTFOLIO_CATEGORIES.filter((category) => category.slug !== "photo");

type PortfolioFilter = "all" | "advertising" | "reels" | "events" | "youtube" | "editing" | "photo" | "marketplace";

const PORTFOLIO_FILTERS: Array<{ id: PortfolioFilter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "advertising", label: "Реклама" },
  { id: "reels", label: "Reels" },
  { id: "events", label: "Event" },
  { id: "youtube", label: "YouTube" },
  { id: "editing", label: "Монтаж" },
  { id: "photo", label: "Фото" },
  { id: "marketplace", label: "Маркетплейсы" },
];

const posterUrl = (id: string, size: "sm" | "md" | "lg" = "md") =>
  `https://kinescope.io/${id}/poster/${size}.webp`;

function LazyPortfolioVideo({ item }: { item: PortfolioItem }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "360px 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="direction-card-video">
      {ready && (
        <img
          src={posterUrl(item.id)}
          srcSet={`${posterUrl(item.id, "sm")} 640w, ${posterUrl(item.id, "md")} 1280w`}
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
          alt={`Кадр из проекта «${item.title}»`}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}

function DirectionCard({
  item,
  index,
}: {
  item: PortfolioItem;
  index: number;
  key?: string | number;
}) {
  return (
    <motion.a
      href={item.projectUrl}
      className={`direction-card direction-card--layout-${index % 6}${item.vertical ? " direction-card--vertical" : ""}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.04, 0.24) }}
    >
      <div className="direction-card-media">
        <LazyPortfolioVideo item={item} />
        <span className="direction-card-play" aria-hidden="true">
          <Play size={15} fill="currentColor" />
        </span>
      </div>
      <div className="direction-card-body">
        <div className="direction-card-topline">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </div>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <div className="direction-card-meta">
          <span>{item.client}</span>
          <span>{[item.category, item.year, item.services.slice(0, 2).join(" · ")].filter(Boolean).join(" / ")}</span>
        </div>
      </div>
    </motion.a>
  );
}

function DirectionLinks({ active }: { active?: PortfolioCategory }) {
  return (
    <nav className="direction-links" aria-label="Направления портфолио">
      <a href="/portfolio" data-active={!active}>
        Все работы
      </a>
      {NAV_PORTFOLIO_CATEGORIES.map((category) => (
        <a
          key={category.slug}
          href={`/portfolio/${category.slug}`}
          data-active={active === category.slug}
        >
          {category.navLabel}
        </a>
      ))}
    </nav>
  );
}

function DirectionCta({
  title,
  button,
  secondaryHref = "/portfolio",
  secondaryLabel = "Все работы",
}: {
  title: string;
  button: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="direction-cta">
      <p>Следующий проект</p>
      <h2>{title}</h2>
      <div>
        <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="direction-button direction-button--primary">
          {button}
          <Send size={16} />
        </a>
        <a href={secondaryHref} className="direction-button">
          {secondaryLabel}
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}

export function PortfolioDirectoryPage({ header }: { header: ReactNode }) {
  const [filter, setFilter] = useState<PortfolioFilter>("all");
  const categoryCounts = PORTFOLIO_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
    acc[category.slug] = getPortfolioItems(category.slug).length;
    return acc;
  }, {});
  const filteredItems = useMemo(() => {
    if (filter === "all") return featuredPortfolioItems;
    if (filter === "youtube") {
      return featuredPortfolioItems.filter((item) => item.tags.includes("editing") && !item.vertical);
    }
    return featuredPortfolioItems.filter((item) => item.category === filter || item.tags.includes(filter as PortfolioItem["tags"][number]));
  }, [filter]);

  return (
    <div className="direction-page">
      {header}
      <main>
        <section className="direction-hero direction-shell">
          <div>
            <span className="direction-eyebrow">Портфолио / направления</span>
            <h1>Портфолио</h1>
          </div>
          <p>
            Работы по Reels, рекламным роликам, мероприятиям, концертам, фото и монтажу.
            Выберите направление, чтобы отправить клиенту точную ссылку.
          </p>
        </section>

        <section className="direction-category-grid direction-shell" aria-label="Категории портфолио">
          {PORTFOLIO_CATEGORIES.map((category, index) => {
            const firstItem = getPortfolioItems(category.slug)[0];
            return (
              <motion.a
                key={category.slug}
                href={`/portfolio/${category.slug}`}
                className="direction-category-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="direction-category-media">
                  {firstItem ? (
                    <LazyPortfolioVideo item={firstItem} />
                  ) : (
                    <div className="direction-category-empty">
                      <ImageIcon size={28} />
                    </div>
                  )}
                </div>
                <div className="direction-category-copy">
                  <span>
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {categoryCounts[category.slug]
                      ? `${categoryCounts[category.slug]} работ`
                      : "подборка по запросу"}
                  </span>
                  <h2>{category.navLabel}</h2>
                  <p>{category.subtitle}</p>
                  <ArrowUpRight size={20} />
                </div>
              </motion.a>
            );
          })}
        </section>

        <section className="direction-work-section direction-shell">
          <div className="direction-section-heading">
            <span>{filteredItems.length} проектов</span>
            <h2>Выбранные работы</h2>
          </div>
          <div className="direction-filter" role="group" aria-label="Фильтр портфолио">
            {PORTFOLIO_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="direction-grid">
            {filteredItems.map((item, index) => (
              <DirectionCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </section>

        <DirectionCta title="Есть задача для фото, видео или монтажа?" button="Обсудить проект" />
      </main>
      <SiteFooter />
    </div>
  );
}

export function PortfolioCategoryPageView({
  category,
  header,
}: {
  category: PortfolioCategory;
  header: ReactNode;
}) {
  const page = PORTFOLIO_CATEGORY_PAGES[category];
  const items = getPortfolioItems(category);

  return (
    <div className={`direction-page direction-page--${category}`}>
      {header}
      <main>
        <section className="direction-hero direction-shell">
          <div>
            <a href="/portfolio" className="direction-back">
              <ArrowLeft size={15} />
              Все направления
            </a>
            <span className="direction-eyebrow">{page.eyebrow}</span>
            <h1>{page.title}</h1>
          </div>
          <div>
            <p>{page.subtitle}</p>
            <small>{page.intro}</small>
          </div>
        </section>

        <div className="direction-shell">
          <DirectionLinks active={category} />
        </div>

        <section className="direction-work-section direction-shell">
          <div className="direction-section-heading">
            <span>{items.length ? `${items.length} работ` : "Материалы"}</span>
            <h2>{items.length ? "Выбранные проекты" : "Фотоподборка под вашу задачу"}</h2>
          </div>

          {items.length > 0 ? (
            <div className={`direction-grid direction-grid--${category}`}>
              {items.map((item, index) => (
                <DirectionCard key={item.id} item={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="direction-empty-state">
              <Camera size={28} />
              <div>
                <h3>Отправлю подходящие серии лично</h3>
                <p>
                  Опишите формат, площадку и задачу съёмки. Я соберу релевантную подборку:
                  бизнес-портрет, репортаж, контент для соцсетей или фото с мероприятия.
                </p>
              </div>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="direction-button direction-button--primary">
                Запросить подборку
                <Send size={16} />
              </a>
            </div>
          )}
        </section>

        <section className="direction-related direction-shell">
          <span>Связанная страница</span>
          <a href={page.relatedHref}>
            {page.relatedLabel}
            <ArrowUpRight size={18} />
          </a>
        </section>

        <DirectionCta title={page.subtitle} button={page.ctaLabel} />
      </main>
      <SiteFooter />
    </div>
  );
}

const CONTENT_AUDIENCES = [
  "Салоны красоты",
  "Кафе и рестораны",
  "Барбершопы",
  "Фитнес и студии",
  "Эксперты и личные бренды",
  "Магазины и шоурумы",
  "Ивенты и локальный бизнес",
];

const CONTENT_INCLUDES = [
  "Подготовка идеи и структуры съёмки",
  "Съёмка на iPhone или профессиональную камеру",
  "Свет, звук и базовая постановка кадра",
  "Фото для соцсетей и сайта",
  "Reels / Shorts / вертикальные ролики",
  "Монтаж, цветокоррекция, звук и субтитры",
  "Готовые материалы для публикации",
];

const CONTENT_PACKAGES = [
  { name: "Mini", price: "от 35 000 ₽", description: "Подготовка, съёмка до 2 часов и 3 готовых Reels." },
  { name: "Content Day", price: "от 60 000 ₽", description: "Съёмка 3–4 часа, 7 Reels и набор обработанных фото." },
  { name: "Business Video + Content", price: "от 110 000 ₽", description: "Рекламный ролик, серия вертикальных видео и фото-контент." },
];

const CONTENT_PROCESS = [
  "Заявка и обсуждение задачи",
  "Подготовка идей и плана съёмки",
  "Съёмка",
  "Монтаж, цвет и звук",
  "Передача готовых материалов",
];

export function ContentDayPage({ header }: { header: ReactNode }) {
  const heroItem = getPortfolioItems("reels").find((item) => item.featured)
    ?? getPortfolioItems("reels")[0];

  return (
    <div className="direction-page content-day-page">
      {header}
      <main>
        <section className="content-day-hero">
          {heroItem && <LazyPortfolioVideo item={heroItem} />}
          <div className="content-day-hero-shade" />
          <div className="content-day-hero-copy direction-shell">
            <span>Фото + видео за одну съёмку</span>
            <h1>Контент-день для бизнеса</h1>
            <p>
              За одну съёмку подготовлю фото и видео-контент для соцсетей, сайта и рекламы:
              Reels, короткие ролики, фото, монтаж, цвет и звук.
            </p>
            <div>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="direction-button direction-button--primary">
                Обсудить контент-день
                <Send size={16} />
              </a>
              <a href="/portfolio/reels" className="direction-button direction-button--light">
                Посмотреть портфолио
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>

        <section className="content-day-band direction-shell">
          <div className="direction-section-heading">
            <span>Для кого</span>
            <h2>Одна съёмка для регулярного контента</h2>
          </div>
          <div className="content-day-audience">
            {CONTENT_AUDIENCES.map((item, index) => (
              <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</span>
            ))}
          </div>
        </section>

        <section className="content-day-band content-day-includes">
          <div className="direction-shell content-day-split">
            <div className="direction-section-heading">
              <span>Что входит</span>
              <h2>От идеи до готовых файлов</h2>
              <p>
                До съёмки фиксируем задачи и список материалов. После вы получаете понятный
                комплект для публикаций, сайта и рекламы.
              </p>
            </div>
            <div className="content-day-checklist">
              {CONTENT_INCLUDES.map((item) => (
                <div key={item}>
                  <Check size={17} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="content-day-band direction-shell">
          <div className="direction-section-heading">
            <span>Пакеты</span>
            <h2>Формат под объём задачи</h2>
          </div>
          <div className="content-day-packages">
            {CONTENT_PACKAGES.map((item, index) => (
              <article key={item.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.name}</h3>
                <strong>{item.price}</strong>
                <p>{item.description}</p>
                <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                  Обсудить пакет
                  <ArrowUpRight size={17} />
                </a>
              </article>
            ))}
          </div>
          <p className="content-day-price-note">
            Финальный состав и стоимость фиксируются после короткого брифа.
          </p>
        </section>

        <section className="content-day-band content-day-process">
          <div className="direction-shell">
            <div className="direction-section-heading">
              <span>Процесс</span>
              <h2>Пять понятных шагов</h2>
            </div>
            <div className="content-day-steps">
              {CONTENT_PROCESS.map((item, index) => (
                <div key={item}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <DirectionCta
          title="Хотите получить контент на 2–4 недели за одну съёмку?"
          button="Написать Юрию"
          secondaryHref="/portfolio/reels"
          secondaryLabel="Портфолио Reels"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
