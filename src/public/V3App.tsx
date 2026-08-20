import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Menu, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { LEGAL } from "../config/legal";
import { SITE } from "../config/site";
import { secureFetch } from "../lib/api";
import { COLOR_COMPARE_PAIRS } from "../lib/colorCompare.data";
import ColorCompare from "../components/ColorCompare";
import {
  CATEGORY_META,
  HERO_SHOWREEL_ID,
  assetById,
  assetsForProject,
  posterUrl,
  projectById,
  projectBySlug,
  projects,
  projectsForCategory,
  type PortfolioCategory,
  type Project,
  type WorkAsset,
} from "../portfolio/v3PortfolioData";
import PortfolioSystem from "./PortfolioSystem";
import { PRIMARY_SOCIALS, SECONDARY_SOCIALS } from "../config/socials";
import { BLOG_ENTRIES, MARQUEE_ITEMS, RESOLVE_STAGES } from "./v3Content";

const categoryOrder: PortfolioCategory[] = ["camera", "commercial", "events", "reels", "concerts", "interviews", "post", "color", "broadcast", "product"];
const roleLabels: Record<string, string> = {
  camera: "камера", operator: "оператор", edit: "монтаж", multicam: "мультикам",
  color: "цвет", sound: "звук", graphics: "графика", cleanup: "очистка", sde: "SDE",
};
const formatLabels: Record<string, string> = {
  commercial: "реклама", event: "событие", reels: "reels", concert: "концерт",
  interview: "интервью", podcast: "подкаст", theatre: "театр", product: "продукт",
  architecture: "архитектура", education: "обучение", factory: "производство",
  presentation: "презентация", broadcast: "прямой эфир", showreel: "шоурил",
};
const contactServices = ["Съёмка // оператор", "Рекламный ролик", "Событие", "Reels", "Прямая трансляция", "Монтаж", "Цветокоррекция", "SDE // отчётное видео", "Интервью // подкаст", "Другая задача"];
const selectedWorkProjectIds = ["metro-concerts", "sibur-women", "scientists-nn", "sber-architecture"] as const;

function LazyPlayer({ asset, title }: { asset: WorkAsset; title: string }) {
  const portrait = asset.orientation === "portrait";
  return (
    <div id={`video-${asset.kinescopeId}`} className={`v3-player v3-player--${asset.orientation}`}>
        <a className="v3-player__poster" href={`https://kinescope.io/${asset.kinescopeId}`} target="_blank" rel="noreferrer" aria-label={`Открыть видео из проекта «${title}»`}>
          <img src={posterUrl(asset.kinescopeId, "md")} srcSet={`${posterUrl(asset.kinescopeId, "sm")} 640w, ${posterUrl(asset.kinescopeId, "md")} 1280w`} sizes="(max-width: 720px) 94vw, 72vw" width={portrait ? 900 : 1600} height={portrait ? 1600 : 900} alt={`Кадр из проекта «${title}»`} loading="lazy" decoding="async" />
          <span><Play fill="currentColor" />СМОТРЕТЬ ВИДЕО</span>
        </a>
    </div>
  );
}

const primaryNav = [
  { href: "/portfolio", label: "РАБОТЫ", active: "work" },
  { href: "/portfolio/camera", label: "СЪЁМКА", active: "camera" },
  { href: "/portfolio/post", label: "ПОСТ", active: "post" },
  { href: "/blog", label: "БЛОГ", active: "blog" },
  { href: "/about", label: "ОБО МНЕ", active: "about" },
] as const;

function currentNavItem() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  if (path === "/portfolio/camera") return "camera";
  if (path === "/portfolio/post" || path === "/portfolio/editing") return "post";
  if (path === "/blog" || path.startsWith("/blog/")) return "blog";
  if (path === "/about") return "about";
  if (path === "/portfolio" || path.startsWith("/portfolio/")) return "work";
  return undefined;
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const active = currentNavItem();
  useEffect(() => {
    document.body.classList.toggle("v3-menu-open", open);
    return () => document.body.classList.remove("v3-menu-open");
  }, [open]);
  return (
    <>
      <header className="v3-header">
        <nav className="v3-nav" aria-label="Основная навигация">
          <a className="v3-nav__brand" href="/" aria-label="YELYGINN — главная">Y</a>
          <div className="v3-nav__links">{primaryNav.map((item) => <a key={item.href} href={item.href} aria-current={active === item.active ? "page" : undefined}>{item.label}</a>)}</div>
          <span className="v3-nav__status">CORE // READY</span>
          <a className="v3-nav__cta" href="/contact"><span className="v3-nav__cta-full">ОБСУДИТЬ ПРОЕКТ</span><span className="v3-nav__cta-short">ОБСУДИТЬ</span><ArrowUpRight size={14} /></a>
          <button className="v3-nav__menu" type="button" aria-expanded={open} aria-controls="v3-mobile-menu" aria-label={open ? "Закрыть меню" : "Открыть меню"} onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button>
        </nav>
      </header>
      {open && (
          <div id="v3-mobile-menu" className="v3-mobile-menu">
            {primaryNav.map((item, index) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active === item.active ? "page" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</a>
            ))}
            <a href="/contact" onClick={() => setOpen(false)}><span>06</span>ОБСУДИТЬ ПРОЕКТ <ArrowUpRight size={16} /></a>
          </div>
      )}
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="v3-footer">
      <div className="v3-footer__wordmark" aria-label="YELYGINN"><span>YELYGINN</span></div>
      <div className="v3-footer__meta">
        <span>© {new Date().getFullYear()} YELYGINN</span>
        <nav aria-label="Юридическая информация"><a href="/privacy-policy">Политика</a><a href="/personal-data-consent">Согласие</a><a href="/cookie-policy">Cookies</a><button type="button" data-cookie-settings>Настройки cookie</button></nav>
        <span>НИЖНИЙ НОВГОРОД // РОССИЯ</span>
      </div>
    </footer>
  );
}

function HeroShowreel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const asset = assetById.get(HERO_SHOWREEL_ID)!;
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)").matches) return;
    video.play().catch(() => setPlaying(false));
    return () => video.pause();
  }, []);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [videoFailed]);

  const toggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) video.play().catch(() => setPlaying(false));
  }, [videoFailed]);

  return (
    <section
      className="v32-hero"
      aria-label="YELYGINN — операторская работа и постпродакшн"
    >
      <div className={`v32-showreel${videoReady && !videoFailed ? " is-ready" : ""}`}>
        <img
          src={posterUrl(asset.kinescopeId, "lg")}
          srcSet={`${posterUrl(asset.kinescopeId, "sm")} 640w, ${posterUrl(asset.kinescopeId, "lg")} 1280w`}
          sizes="100vw"
          alt=""
          width="1280"
          height="720"
          fetchPriority="high"
          decoding="async"
        />
        {!videoFailed && <video
          ref={videoRef}
          poster={posterUrl(asset.kinescopeId, "lg")}
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoReady(true)}
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => { setVideoFailed(true); setPlaying(false); }}
          aria-label="Шоурил YELYGINN"
        ><source src="/v3-assets/hero-showreel.mp4" type="video/mp4" /></video>}
      </div>
      <div className="v32-hero__copy">
        <p className="v3-kicker">ВИДЕОСЪЁМКА // МОНТАЖ // ЦВЕТОКОРРЕКЦИЯ</p>
        <h1><span>ВИДЕОСЪЁМКА</span><span>И МОНТАЖ</span><span>В НИЖНЕМ НОВГОРОДЕ</span></h1>
        <div className="v32-hero__position"><b>YELYGINN</b><span>НИЖНИЙ НОВГОРОД // РОССИЯ // ВЫЕЗД // УДАЛЁННЫЙ ПОСТ</span></div>
        <p className="v32-hero__lead">Снимаю, собираю мультикам, крашу и работаю камерой в команде прямого эфира. Портфолио — сначала видео, потом слова.</p>
        <div className="v32-hero__actions">
          <a className="v3-button v3-button--orange" href="/portfolio">СМОТРЕТЬ РАБОТЫ <ArrowRight /></a>
          <a className="v3-button v3-button--line" href="#contact">ОБСУДИТЬ ПРОЕКТ <ArrowUpRight /></a>
        </div>
      </div>
      {videoFailed ? <a className="v32-showreel-toggle" href={`https://kinescope.io/${HERO_SHOWREEL_ID}`} target="_blank" rel="noreferrer"><Play fill="currentColor" /><span>ШОУРИЛ // ОТКРЫТЬ</span></a> : <div className="v32-showreel-controls">
        <button type="button" onClick={togglePlayback} aria-label={playing ? "Поставить шоурил на паузу" : "Воспроизвести шоурил"}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}<span>{playing ? "ПАУЗА" : "ШОУРИЛ"}</span></button>
        <button type="button" onClick={toggleSound} aria-label={muted ? "Включить звук" : "Выключить звук"}>{muted ? <VolumeX /> : <Volume2 />}<span>{muted ? "ЗВУК" : "ВКЛЮЧЁН"}</span></button>
      </div>}
    </section>
  );
}

function MultiAngleColorComparison() {
  const [activeId, setActiveId] = useState(COLOR_COMPARE_PAIRS[0].id);
  const active = COLOR_COMPARE_PAIRS.find((pair) => pair.id === activeId) || COLOR_COMPARE_PAIRS[0];
  return (
    <article className="v32-proof__color">
      <div className="v32-proof__label"><span>ЦВЕТ // ДО И ПОСЛЕ</span><b>ВЫБЕРИТЕ РАКУРС</b></div>
      <ColorCompare pair={active} />
      <div className="v32-angle-selector" role="group" aria-label="Ракурс сравнения цвета">
        {COLOR_COMPARE_PAIRS.map((pair, index) => (
          <button key={pair.id} type="button" aria-pressed={pair.id === activeId} onClick={() => setActiveId(pair.id)}>
            {pair.thumbnail && <img src={pair.thumbnail} width="260" height="146" loading="lazy" decoding="async" alt="" />}
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

type ResolveStage = (typeof RESOLVE_STAGES)[number];

const RESOLVE_CHAPTERS: ReadonlyArray<{ id: string; label: string; stages: ResolveStage[] }> = [
  { id: "shot-01", label: "SHOT 01", stages: RESOLVE_STAGES.slice(0, 8) },
  {
    id: "shot-02",
    label: "SHOT 02",
    stages: RESOLVE_STAGES.slice(8).filter((stage) => stage.timestamp !== "21:47:44"),
  },
];

function ResolveChapter({ chapter }: { chapter: (typeof RESOLVE_CHAPTERS)[number]; key?: string }) {
  const [stageIndex, setStageIndex] = useState(0);
  const active = chapter.stages[stageIndex];

  useEffect(() => {
    [stageIndex - 1, stageIndex + 1].forEach((index) => {
      const stage = chapter.stages[index];
      if (!stage) return;
      [stage.clean, stage.resolve].forEach((src) => {
        const image = new Image();
        image.src = src;
      });
    });
  }, [chapter.stages, stageIndex]);

  return (
    <section className="v32-resolve-chapter" aria-label={`${chapter.label}: восемь этапов цветокоррекции`}>
      <header>
        <div><span>ПОСТ // DAVINCI RESOLVE</span><b>{chapter.label}</b></div>
        <p>{String(stageIndex + 1).padStart(2, "0")} // ЭТАП <span>{active.timestamp}</span></p>
      </header>
      <div className="v32-resolve-chapter__media">
        <figure><img key={`${active.id}-clean`} src={active.clean} width="1600" height="900" loading="lazy" decoding="async" alt={`${chapter.label}, этап ${stageIndex + 1}: чистый кадр`} /><figcaption>ЧИСТЫЙ КАДР</figcaption></figure>
        <figure><img key={`${active.id}-resolve`} src={active.resolve} width="1800" height="1171" loading="lazy" decoding="async" alt={`${chapter.label}, этап ${stageIndex + 1}: настоящее рабочее окно DaVinci Resolve`} /><figcaption>DAVINCI RESOLVE // NODE GRAPH</figcaption></figure>
      </div>
      <div className="v32-resolve-chapter__scrubber">
        <input
          aria-label={`${chapter.label}: выбрать этап цветокоррекции`}
          aria-valuetext={`Этап ${stageIndex + 1} из 8, ${active.timestamp}`}
          type="range"
          min="0"
          max="7"
          step="1"
          value={stageIndex}
          onChange={(event) => setStageIndex(Number(event.currentTarget.value))}
        />
        <div className="v32-resolve-chapter__markers" role="group" aria-label={`${chapter.label}: этапы`}>
          {chapter.stages.map((stage, index) => (
            <button
              key={stage.id}
              type="button"
              className={index === stageIndex ? "is-active" : ""}
              aria-pressed={index === stageIndex}
              onClick={() => setStageIndex(index)}
            >
              {String(index + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResolveBreakdown() {
  return <article id="davinci-breakdown" className="v32-resolve-breakdown">{RESOLVE_CHAPTERS.map((chapter) => <ResolveChapter key={chapter.id} chapter={chapter} />)}</article>;
}

function ProductionProof() {
  return (
    <section id="process" className="v32-proof">
      <div className="v3-shell">
        <header className="v32-proof__head"><p className="v3-kicker">ПРОЦЕСС // ИЗНУТРИ</p><h2>КАК ЭТО<br /><i>СДЕЛАНО.</i></h2><p>Исходники, цвет, монтаж и BTS из реальных проектов.</p></header>
        <div className="v32-proof__grid">
          <MultiAngleColorComparison />
          <ResolveBreakdown />
          <figure className="v32-proof__operator"><img src="/v3-assets/bts-operator.webp" width="1280" height="853" loading="lazy" decoding="async" alt="Юрий Елыгин за камерой на съёмочной площадке" /><figcaption><span>СЪЁМКА // BTS</span><b>ОПЕРАТОР НА ПЛОЩАДКЕ</b></figcaption></figure>
          <figure className="v32-proof__vertical"><img src="/v3-assets/vertical-podcast.webp" width="720" height="1280" loading="lazy" decoding="async" alt="Вертикальный монтаж подкаста в формате 9 на 16" /><figcaption><span>ВЕРТИКАЛЬНЫЙ ФОРМАТ // 9:16</span><b>РАБОЧИЙ КАДР</b></figcaption></figure>
          <figure className="v32-proof__live"><img src="/v3-assets/bts-broadcast-camera.webp" width="720" height="1565" loading="lazy" decoding="async" alt="Камеры на площадке прямого эфира" /><figcaption><span>ЭФИР // МУЛЬТИКАМ</span><b>РАБОТА В КОМАНДЕ</b></figcaption></figure>
        </div>
      </div>
    </section>
  );
}

function ProjectEvidence({ project }: { project: Project }) {
  if (project.id !== "sibur-women") return null;
  return (
    <section className="v32-project-proof">
      <header><p className="v3-kicker">МАТЕРИАЛЫ // ЦВЕТ</p><h2>ДО // ПОСЛЕ</h2><p>Одинаковый момент и кроп из рабочего набора проекта. Слайдер работает мышью, касанием и клавиатурой.</p></header>
      <ColorCompare pair={COLOR_COMPARE_PAIRS[0]} />
      <figure><img src="/v3-assets/post-davinci-nodes.webp" width="1600" height="900" loading="lazy" decoding="async" alt="DaVinci Resolve: node tree и scopes рабочего проекта" /><figcaption>РАБОЧЕЕ ОКНО // DAVINCI RESOLVE</figcaption></figure>
    </section>
  );
}

function ContactSection() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [service, setService] = useState(contactServices[0]);
  const [message, setMessage] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const telegramUrl = `${SITE.telegramUrl}?text=${encodeURIComponent(`Здравствуйте, Юрий!\nУслуга: ${service}\nИмя: ${name}\nЗадача: ${message}`)}`;

  const submit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !contact.trim() || !message.trim() || !privacy || !consent) return;
    setStatus("sending");
    try {
      const response = await secureFetch("/api/send-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim(), service, message: message.trim(), website: "", source: window.location.pathname, consentAccepted: true, consentVersion: LEGAL.consentVersion, policyVersion: LEGAL.policyVersion, formId: "homepage-contact", pageUrl: window.location.pathname }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) throw new Error("delivery failed");
      setStatus("success");
      setName(""); setContact(""); setMessage(""); setPrivacy(false); setConsent(false);
    } catch {
      setStatus("error");
    }
  }, [consent, contact, message, name, privacy, service]);

  return (
    <section id="contact" className="v3-contact v3-contact--unified v3-shell">
      <div className="v3-contact__intro">
        <p className="v3-kicker">КОНТАКТ // КОРОТКИЙ БРИФ</p>
        <h2>ЕСТЬ ЗАДАЧА?<br /><i>РАССКАЖИТЕ.</i></h2>
        <p>Напишите, что нужно снять или собрать на посте. Отвечу сам и уточню детали.</p>
        <div className="v3-social-grid" aria-label="Основные способы связи">
          {PRIMARY_SOCIALS.map((social, index) => <a key={social.id} className={`v3-social v3-social--${social.id}`} href={social.href} target={social.id === "email" ? undefined : "_blank"} rel={social.id === "email" ? undefined : "noreferrer"}><span>{String(index + 1).padStart(2, "0")} // {social.label}</span><ArrowUpRight aria-hidden="true" /></a>)}
          <div className="v3-social-grid__secondary">{SECONDARY_SOCIALS.map((social) => <a key={social.id} href={social.href} target="_blank" rel="noreferrer">{social.label} <ArrowUpRight aria-hidden="true" /></a>)}</div>
        </div>
      </div>
      <form className="v3-form" onSubmit={submit}>
        <label><span>01 // КАК ВАС ЗОВУТ?</span><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Имя или компания" /></label>
        <label><span>02 // КАК С ВАМИ СВЯЗАТЬСЯ?</span><input value={contact} onChange={(e) => setContact(e.target.value)} required placeholder="Telegram, email или телефон" /></label>
        <label><span>03 // ЧТО НУЖНО?</span><select value={service} onChange={(e) => setService(e.target.value)}>{contactServices.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>04 // О ПРОЕКТЕ</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} placeholder="Формат, дата, город, объём и ссылка на референс — если есть" /></label>
        <label className="v3-check"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} required /><span><Check />Ознакомлен с <a href="/privacy-policy">политикой обработки данных</a></span></label>
        <label className="v3-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /><span><Check />Даю <a href="/personal-data-consent">согласие на обработку данных</a></span></label>
        <button className="v3-button v3-button--dark" type="submit" disabled={status === "sending"}>{status === "sending" ? "ОТПРАВКА…" : "ОТПРАВИТЬ ЗАДАЧУ"}<ArrowUpRight /></button>
        {status === "success" && <p role="status" className="v3-form__status">Заявка отправлена. Юрий свяжется с вами по указанному контакту.</p>}
        {status === "error" && <p role="alert" className="v3-form__status v3-form__status--error">Сайт не смог доставить заявку. <a href={telegramUrl}>Продолжить в Telegram ↗</a></p>}
      </form>
    </section>
  );
}

function HomePage() {
  const selectedWorkProjects = selectedWorkProjectIds.map((id) => projectById.get(id)!);
  return (
    <>
      <SiteHeader />
      <main className="v32-home">
        <HeroShowreel />
        <section className="v3-marquee" aria-label="Бренды и проекты"><div className="v3-marquee__track">{[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((brand, index) => <span key={`${brand}-${index}`}>{brand}<b>//</b></span>)}</div></section>
        <div className="v32-work-proof">
          <section className="v3-work"><div className="v3-shell"><header className="v3-section-head"><p className="v3-kicker">ОТОБРАННЫЕ // ПРОЕКТЫ</p><h2>ВЫБРАННЫЕ<br /><i>РАБОТЫ.</i></h2><a href="/portfolio">ВСЕ РАБОТЫ <ArrowUpRight /></a></header><PortfolioSystem projects={selectedWorkProjects} /></div></section>
          <ProductionProof />
        </div>
        <section id="about" className="v3-about v3-shell"><p className="v3-kicker">ОБО МНЕ</p><h2>СНИМАЮ <span>//</span> <i>МОНТИРУЮ.</i></h2><div><p>Я оператор и режиссёр монтажа из Нижнего Новгорода. Снимаю сам и работаю в составе production-команд.</p><p>После площадки собираю мультикам, делаю монтаж и цвет. Могу вести задачу целиком или подключиться на отдельный этап.</p><a href="/about">ПОДРОБНЕЕ <ArrowUpRight aria-hidden="true" /></a></div></section>
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}

function PortfolioPage({ category }: { category?: PortfolioCategory }) {
  const visible = category ? projectsForCategory(category) : projects;
  const editorialPriority = ["metro-concerts", "scientists-nn", "sibur-women", "hoff-products", "become-legendary", "small-homeland", "skrf-hockey", "gorky-war"];
  const presented = [...visible].sort((left, right) => {
    const leftPriority = editorialPriority.indexOf(left.id);
    const rightPriority = editorialPriority.indexOf(right.id);
    if (leftPriority >= 0 || rightPriority >= 0) return (leftPriority < 0 ? Number.MAX_SAFE_INTEGER : leftPriority) - (rightPriority < 0 ? Number.MAX_SAFE_INTEGER : rightPriority);
    return Number(right.featured) - Number(left.featured)
    || right.videos.length - left.videos.length
    || projects.indexOf(left) - projects.indexOf(right);
  });
  const meta = category ? CATEGORY_META[category] : null;
  return (
    <><SiteHeader /><main className="v3-catalog"><header className="v3-catalog__hero v3-shell"><p className="v3-kicker">ПОРТФОЛИО // {visible.length} ПРОЕКТОВ</p><h1>{meta ? meta.title : "РАБОТЫ"}</h1><p>{meta?.description || "Видео сгруппированы по проектам; внутри каждого проекта сохранены все подтверждённые материалы и роли."}</p></header><nav className="v3-filters v3-shell" aria-label="Разделы портфолио"><a href="/portfolio" aria-current={!category ? "page" : undefined}>ВСЕ</a><a href="/portfolio/camera" aria-current={category === "camera" ? "page" : undefined}>СЪЁМКА</a><a href="/portfolio/post" aria-current={category === "post" ? "page" : undefined}>ПОСТ</a></nav><section className="v3-catalog__list v3-shell"><PortfolioSystem projects={presented} firstMediaPriority /></section></main><SiteFooter /></>
  );
}

function BroadcastPage() {
  const liveProjects = projectsForCategory("broadcast");
  return (
    <><SiteHeader /><main className="v3-catalog v3-shell"><header className="v3-catalog__hero"><p className="v3-kicker">ЭФИР // МУЛЬТИКАМ // КОМАНДА</p><h1>ПРЯМЫЕ<br />ТРАНСЛЯЦИИ</h1><p>Работаю оператором на трансляциях и в составе production-команды. Снимаю события, концерты и сценические проекты.</p></header><section className="v32-broadcast-proof"><figure><img src="/v3-assets/bts-broadcast-camera.webp" width="720" height="1565" loading="eager" decoding="async" alt="Мультикамерная съёмка на площадке" /><figcaption>МУЛЬТИКАМ // ПЛОЩАДКА</figcaption></figure><figure><img src="/v3-assets/bts-gimbal.webp" width="720" height="1565" loading="lazy" decoding="async" alt="Камера на стабилизаторе на выездной съёмке" /><figcaption>КАМЕРА // ВЫЕЗД</figcaption></figure><div><p className="v3-kicker">ПОДТВЕРЖДЁННЫЕ // РОЛИ</p><h2>РАБОТА В ЭФИРНОЙ КОМАНДЕ</h2><ul><li>Оператор камеры на мероприятии</li><li>Камера в составе многокамерной трансляции</li><li>Мультикамерная запись и последующий монтаж</li><li>Съёмка событий, концертов и сценических проектов</li></ul></div></section><header className="v3-section-head"><p className="v3-kicker">СВЯЗАННЫЕ // ПРОЕКТЫ // {liveProjects.length}</p><h2>ЭФИР<br /><i>МУЛЬТИКАМ.</i></h2></header><section className="v3-catalog__list"><PortfolioSystem projects={liveProjects} /></section><ContactSection /></main><SiteFooter /></>
  );
}

function ProjectPage({ project }: { project: Project }) {
  const assets = assetsForProject(project.id);
  const currentIndex = projects.indexOf(project);
  const next = projects[(currentIndex + 1) % projects.length];
  return (
    <><SiteHeader /><main className="v3-project v3-shell"><a className="v3-project__back" href="/portfolio"><ArrowLeft /> ВСЕ РАБОТЫ</a><header className="v3-project__head"><div><p className="v3-kicker">ПРОЕКТ // {String(currentIndex + 1).padStart(2, "0")}</p><h1>{project.title}</h1></div><dl>{project.client && <><dt>КЛИЕНТ</dt><dd>{project.client}</dd></>}<dt>ФОРМАТ</dt><dd>{project.formats.map((item) => formatLabels[item]).join(" // ")}</dd><dt>МОЯ РОЛЬ</dt><dd>{project.roles.map((item) => roleLabels[item]).join(" // ")}</dd><dt>ВИДЕО</dt><dd>{assets.length}</dd></dl></header>{project.description && <p className="v3-project__description">{project.description}</p>}<section className="v3-project__media">{assets.map((asset, index) => <article key={asset.kinescopeId}><div className="v3-project__media-meta"><span>{String(index + 1).padStart(2, "0")} // {String(assets.length).padStart(2, "0")}</span><a href={`#video-${asset.kinescopeId}`}>#{asset.kinescopeId}</a></div><LazyPlayer asset={asset} title={project.title} /></article>)}</section><ProjectEvidence project={project} /><section className="v3-project__credits"><div><p className="v3-kicker">МОЯ РОЛЬ // ПОДТВЕРЖДЕНО ИСТОЧНИКОМ</p><h2>ЧТО Я СДЕЛАЛ</h2></div><ul>{project.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></section><a className="v3-next" href={`/portfolio/${next.slug}`}><span>СЛЕДУЮЩИЙ // ПРОЕКТ</span><strong>{next.title}</strong><ArrowRight /></a></main><SiteFooter /></>
  );
}

function BlogPage() {
  return (
    <><SiteHeader /><main className="v3-editorial-page"><header className="v3-editorial-hero v3-shell"><p className="v3-kicker">БЛОГ // ПРАКТИКА</p><h1>О СЪЁМКЕ<br /><i>И МОНТАЖЕ.</i></h1><p>Короткие разборы подготовки, съёмки и монтажа — без универсальных рецептов.</p></header><section className="v3-blog-grid v3-shell">{BLOG_ENTRIES.map((entry, index) => <a key={entry.href} href={entry.href}><span>{String(index + 1).padStart(2, "0")} // {entry.tag}</span><h2>{entry.title}</h2><p>{entry.description}</p><ArrowUpRight aria-hidden="true" /></a>)}</section></main><SiteFooter /></>
  );
}

function AboutPage() {
  return (
    <><SiteHeader /><main className="v3-editorial-page"><header className="v3-editorial-hero v3-shell"><p className="v3-kicker">ОБО МНЕ</p><h1>ЮРИЙ<br /><i>ЕЛЫГИН.</i></h1><p>Оператор, режиссёр монтажа и колорист из Нижнего Новгорода.</p></header><section className="v3-about-page v3-shell"><figure><img src="/v3-assets/bts-operator.webp" width="1280" height="853" loading="eager" decoding="async" alt="Юрий Елыгин работает с камерой на съёмочной площадке" /><figcaption>СЪЁМОЧНАЯ ПЛОЩАДКА // BTS</figcaption></figure><div><h2>СНИМАЮ И РАБОТАЮ С МАТЕРИАЛОМ ПОСЛЕ ПЛОЩАДКИ.</h2><p>Могу самостоятельно снять небольшой проект или работать оператором в production-команде.</p><p>Собираю монтаж, мультикам, работаю с цветом и довожу материал до готовой версии. Подключаюсь как на весь процесс, так и на отдельный этап.</p><a className="v3-button v3-button--orange" href="/portfolio">СМОТРЕТЬ РАБОТЫ <ArrowRight /></a></div></section><ContactSection /></main><SiteFooter /></>
  );
}

function ContactPage() {
  return <><SiteHeader /><main className="v3-editorial-page v3-contact-page"><ContactSection /></main><SiteFooter /></>;
}

function RedirectToPortfolio() {
  useEffect(() => window.location.replace("/portfolio"), []);
  return <main className="v3-redirect"><p>Переходим к работам…</p><a href="/portfolio">ОТКРЫТЬ ПОРТФОЛИО</a></main>;
}

function updateSeo(title: string, description: string, canonicalPath: string) {
  document.title = title;
  const upsert = (selector: string, tag: "meta" | "link", attrs: Record<string, string>) => {
    let node = document.querySelector<HTMLElement>(selector);
    if (!node) { node = document.createElement(tag); document.head.appendChild(node); }
    Object.entries(attrs).forEach(([key, value]) => node!.setAttribute(key, value));
  };
  upsert('meta[name="description"]', "meta", { name: "description", content: description });
  upsert('link[rel="canonical"]', "link", { rel: "canonical", href: `https://yelyginn.ru${canonicalPath}` });
  upsert('meta[property="og:title"]', "meta", { property: "og:title", content: title });
  upsert('meta[property="og:description"]', "meta", { property: "og:description", content: description });
  upsert('meta[property="og:url"]', "meta", { property: "og:url", content: `https://yelyginn.ru${canonicalPath}` });
}

export default function V3App() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  const segment = path.startsWith("/portfolio/") ? decodeURIComponent(path.slice("/portfolio/".length)) : "";
  const normalizedCategory = segment === "editing" ? "post" : segment;
  const category = categoryOrder.includes(normalizedCategory as PortfolioCategory) ? normalizedCategory as PortfolioCategory : undefined;
  const params = new URLSearchParams(window.location.search);
  const legacyAsset = params.get("id") ? assetById.get(params.get("id")!) : undefined;
  const legacySlugs: Record<string, string> = { "metro-gorkovskaya": "metro-gorkovskaya-concerts", "sber-architecture-course": "sber-arhitektura" };
  const project = projectBySlug.get(segment) || projectBySlug.get(legacySlugs[segment]) || (legacyAsset ? projectById.get(legacyAsset.projectId) : undefined);

  const view = useMemo(() => {
    if (path === "/blog") return { title: "Блог о съёмке и постпродакшне | YELYGINN", description: "Практические заметки Юрия Елыгина о подготовке, видеосъёмке, монтаже и постпродакшне.", canonical: "/blog" };
    if (path === "/about") return { title: "Обо мне — Юрий Елыгин | YELYGINN", description: "Юрий Елыгин — оператор, режиссёр монтажа и колорист из Нижнего Новгорода.", canonical: "/about" };
    if (path === "/contact") return { title: "Обсудить проект | YELYGINN", description: "Связаться с Юрием Елыгиным: Instagram, Telegram, YouTube, email и короткий бриф проекта.", canonical: "/contact" };
    if (path === "/pryamye-translyacii" || path === "/pryamye-translyacii.html") return { title: "Оператор прямых трансляций в Нижнем Новгороде | YELYGINN", description: "Оператор камеры на прямую трансляцию, многокамерная съёмка и работа в составе live production crew в Нижнем Новгороде и с выездом.", canonical: "/pryamye-translyacii" };
    if (path === "/portfolio" || path === "/portfolio.html") return { title: "Портфолио — 89 видеоработ | YELYGINN", description: "89 видеоработ Юрия Елыгина: операторская работа, монтаж, цвет, commercial, events, Reels и live production.", canonical: "/portfolio" };
    if (category) return { title: `${CATEGORY_META[category].title} | YELYGINN`, description: CATEGORY_META[category].description, canonical: `/portfolio/${category}` };
    if (project) return { title: `${project.title} | YELYGINN`, description: project.description || `${project.title}: ${project.responsibilities.join(", ")}.`, canonical: `/portfolio/${project.slug}` };
    return { title: "Юрий Елыгин — оператор, монтаж, цвет и live production", description: "Операторская работа, монтаж, цвет, commercial, event-видео и live production в Нижнем Новгороде и с выездом.", canonical: "/" };
  }, [category, project, path]);
  useEffect(() => updateSeo(view.title, view.description, view.canonical), [view]);

  if (path === "/portfolio" || path === "/portfolio.html") return <PortfolioPage />;
  if (path === "/blog") return <BlogPage />;
  if (path === "/about") return <AboutPage />;
  if (path === "/contact") return <ContactPage />;
  if (path === "/cases" || path === "/cases.html") return <RedirectToPortfolio />;
  if (path === "/pryamye-translyacii" || path === "/pryamye-translyacii.html") return <BroadcastPage />;
  if (category) return <PortfolioPage category={category} />;
  if (project) return <ProjectPage project={project} />;
  return <HomePage />;
}
