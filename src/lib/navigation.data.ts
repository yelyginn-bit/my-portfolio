// Единый источник пунктов навигации (PROMPT-21 §3): шапка, мобильное меню и
// подвал всех систем берут пункты отсюда. Маршрут проверяется на существование
// и индексируемость в ROUTE_MANIFEST при загрузке модуля — ссылка на
// несуществующий или приватный маршрут валит сборку сразу, а не тихо.
import { CATEGORY_META, PORTFOLIO_CATEGORY_ORDER } from "../portfolio/v3PortfolioData";
import { ROUTE_MANIFEST } from "../public/routeManifest";

export interface NavLink {
  href: string;
  label: string;
}

const indexablePaths = new Set(ROUTE_MANIFEST.filter((route) => route.indexable).map((route) => route.path));

function link(href: string, label: string): NavLink {
  if (!indexablePaths.has(href)) {
    throw new Error(`navigation.data.ts: "${href}" отсутствует в ROUTE_MANIFEST или не индексируется`);
  }
  return { href, label };
}

/** Десять посадочных услуг из ROUTE_MANIFEST (render: "static"), кроме /photo и /ceny — у них свои пункты верхнего уровня. */
export const SERVICE_LINKS: readonly NavLink[] = [
  link("/reklamnye-roliki", "Рекламные ролики"),
  link("/event-video", "Видеосъёмка мероприятий"),
  link("/reels", "Reels для бизнеса"),
  link("/video-dlya-marketpleysov", "Видео для маркетплейсов"),
  link("/content-day", "Контент-день"),
  link("/pryamye-translyacii", "Прямые трансляции"),
  link("/cvetokorrekciya", "Цветокоррекция"),
];

/** Десять категорий портфолио — метки берутся из CATEGORY_META, а не дублируются здесь. */
export const PORTFOLIO_CATEGORY_LINKS: readonly NavLink[] = PORTFOLIO_CATEGORY_ORDER.map((category) =>
  link(`/portfolio/${category}`, CATEGORY_META[category].title),
);

/** Категория портфолио → посадочная услуга (PROMPT-21 §5: «кейс в портфолио
 * → услуга, к которой он относится»). У camera/post/concerts/interviews нет
 * отдельной посадочной — только у семи услуг из SERVICE_LINKS, — для них
 * ссылка ведёт на общий прайс. */
export const CATEGORY_TO_SERVICE: Readonly<Record<string, NavLink>> = {
  commercial: link("/reklamnye-roliki", "Рекламные ролики"),
  events: link("/event-video", "Видеосъёмка мероприятий"),
  reels: link("/reels", "Reels для бизнеса"),
  product: link("/video-dlya-marketpleysov", "Видео для маркетплейсов"),
  broadcast: link("/pryamye-translyacii", "Прямые трансляции"),
  color: link("/cvetokorrekciya", "Цветокоррекция"),
};

export const PHOTO_LINK: NavLink = link("/photo", "Фото");
export const PRICES_LINK: NavLink = link("/ceny", "Цены");
export const BLOG_LINK: NavLink = link("/blog", "Блог");
export const ABOUT_LINK: NavLink = link("/about", "Обо мне");
export const CONTACT_LINK: NavLink = link("/contact", "Обсудить проект");
export const CALCULATOR_LINK: NavLink = link("/calculator", "Рассчитать стоимость");
export const PORTFOLIO_OVERVIEW_LINK: NavLink = link("/portfolio", "Портфолио");

export interface NavDropdown {
  kind: "dropdown";
  label: string;
  href?: string;
  items: readonly NavLink[];
}

export interface NavItem {
  kind: "link";
  href: string;
  label: string;
}

export type PrimaryNavEntry = NavDropdown | NavItem;

/** Структура верхней навигации (PROMPT-21b §2.2): Услуги и Портфолио —
 * выпадающие меню, остальное — обычные пункты. Раньше «Съёмка»/«Пост» были
 * отдельными пунктами верхнего уровня — они категории портфолио (camera/post)
 * и теперь внутри выпадающего «Портфолио» вместе с остальными восемью. */
export const PRIMARY_NAV: readonly PrimaryNavEntry[] = [
  { kind: "dropdown", label: "Услуги", items: SERVICE_LINKS },
  { kind: "dropdown", label: "Портфолио", href: PORTFOLIO_OVERVIEW_LINK.href, items: PORTFOLIO_CATEGORY_LINKS },
  { kind: "link", href: PHOTO_LINK.href, label: PHOTO_LINK.label },
  { kind: "link", href: PRICES_LINK.href, label: PRICES_LINK.label },
  { kind: "link", href: BLOG_LINK.href, label: BLOG_LINK.label },
  { kind: "link", href: ABOUT_LINK.href, label: ABOUT_LINK.label },
];

/** Подвал — карта сайта по группам (PROMPT-21 §4). Каждая публичная страница
 * достижима хотя бы отсюда: либо прямой ссылкой, либо через категорию/раздел
 * в один клик (38 карточек проектов — через свои 10 категорий, не перечислены
 * поштучно). */
export const FOOTER_GROUPS: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Услуги",
    links: SERVICE_LINKS,
  },
  {
    title: "Работы",
    links: [PORTFOLIO_OVERVIEW_LINK, ...PORTFOLIO_CATEGORY_LINKS, PHOTO_LINK],
  },
  {
    title: "Цены и расчёт",
    links: [PRICES_LINK, CALCULATOR_LINK],
  },
  {
    title: "Блог",
    links: [
      BLOG_LINK,
      link("/blog/skolko-stoit-snyat-reklamnyy-rolik", "Сколько стоит рекламный ролик"),
      link("/blog/kak-snimat-reels-dlya-biznesa", "Как подготовить Reels для бизнеса"),
      link("/blog/video-dlya-kartochek-wildberries", "Видео для карточек товара"),
      link("/blog/videosemka-meropriyatiy-nn", "Видеосъёмка мероприятий в НН"),
    ],
  },
  {
    title: "О себе и контакты",
    links: [ABOUT_LINK, link("/contact", "Контакты")],
  },
  {
    title: "Документы",
    links: [
      link("/privacy-policy", "Политика обработки данных"),
      link("/personal-data-consent", "Согласие на обработку данных"),
      link("/cookie-policy", "Cookies"),
      link("/terms", "Условия использования"),
      link("/payment-terms", "Условия оплаты"),
      link("/cancellation-refund", "Отмена и возврат"),
      link("/gallery-terms", "Условия доступа к галереям"),
      link("/data-request", "Запрос данных"),
    ],
  },
];
