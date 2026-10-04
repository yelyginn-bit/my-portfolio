import {
  CATEGORY_META,
  PORTFOLIO_CATEGORY_ORDER,
  assetById,
  projectById,
  projectBySlug,
  projects,
  type PortfolioCategory,
  type Project,
} from "../portfolio/v3PortfolioData";
import { seoCopyFor } from "./seoCopy";

export type RouteRenderKind = "v3" | "calculator" | "static" | "legal" | "private" | "redirect";

export interface PublicRouteRecord {
  path: string;
  render: RouteRenderKind;
  indexable: boolean;
  priority?: number;
  /** PROMPT-29 §5.3, PROMPT-35 §0.1: единственное место в коде, откуда
   * берётся data-theme="dark" на <html> для V3-маршрутов (applyTheme() в
   * scripts/prerender.ts). Для static/calculator-маршрутов и юридических
   * страниц (свой injectRoot(), applyTheme() их не касается) это поле —
   * только сверка тестами; сам атрибут несёт исходный HTML-файл руками.
   * PROMPT-35: весь публичный сайт тёмный — поле здесь у всех индексируемых
   * маршрутов, кроме /journal, /admin, /account, /portfolio/photo
   * (приватные, не публичный продукт). */
  theme?: "dark";
}

const fixedRoutes: readonly PublicRouteRecord[] = [
  { path: "/", render: "v3", indexable: true, priority: 1, theme: "dark" },
  { path: "/portfolio", render: "v3", indexable: true, priority: 0.9, theme: "dark" },
  { path: "/blog", render: "v3", indexable: true, priority: 0.75, theme: "dark" },
  { path: "/about", render: "v3", indexable: true, priority: 0.75, theme: "dark" },
  { path: "/contact", render: "v3", indexable: true, priority: 0.75, theme: "dark" },
  { path: "/calculator", render: "calculator", indexable: true, priority: 0.8, theme: "dark" },
  { path: "/content-day", render: "static", indexable: true, priority: 0.8, theme: "dark" },
  { path: "/reklamnye-roliki", render: "static", indexable: true, priority: 0.9, theme: "dark" },
  { path: "/event-video", render: "static", indexable: true, priority: 0.85, theme: "dark" },
  { path: "/reels", render: "static", indexable: true, priority: 0.9, theme: "dark" },
  { path: "/cvetokorrekciya", render: "static", indexable: true, priority: 0.85, theme: "dark" },
  { path: "/video-dlya-marketpleysov", render: "static", indexable: true, priority: 0.85, theme: "dark" },
  { path: "/sajty", render: "static", indexable: true, priority: 0.85, theme: "dark" },
  { path: "/pryamye-translyacii", render: "static", indexable: true, priority: 0.9, theme: "dark" },
  { path: "/ceny", render: "static", indexable: true, priority: 0.8, theme: "dark" },
  { path: "/photo", render: "static", indexable: true, priority: 0.75, theme: "dark" },
  { path: "/portretnaya-fotosessiya", render: "static", indexable: true, priority: 0.75, theme: "dark" },
  { path: "/reportazhnaya-fotosemka", render: "static", indexable: true, priority: 0.75, theme: "dark" },
  { path: "/portfolio/photo", render: "private", indexable: false },
  { path: "/account", render: "private", indexable: false },
  { path: "/admin", render: "private", indexable: false },
  { path: "/journal", render: "private", indexable: false },
  { path: "/privacy-policy", render: "legal", indexable: true, priority: 0.3, theme: "dark" },
  { path: "/personal-data-consent", render: "legal", indexable: true, priority: 0.2, theme: "dark" },
  { path: "/cookie-policy", render: "legal", indexable: true, priority: 0.2, theme: "dark" },
  { path: "/terms", render: "legal", indexable: true, priority: 0.3, theme: "dark" },
  { path: "/payment-terms", render: "legal", indexable: true, priority: 0.3, theme: "dark" },
  { path: "/cancellation-refund", render: "legal", indexable: true, priority: 0.2, theme: "dark" },
  { path: "/gallery-terms", render: "legal", indexable: true, priority: 0.2, theme: "dark" },
  { path: "/data-request", render: "legal", indexable: true, priority: 0.2, theme: "dark" },
  { path: "/blog/skolko-stoit-snyat-reklamnyy-rolik", render: "static", indexable: true, priority: 0.7, theme: "dark" },
  { path: "/blog/kak-snimat-reels-dlya-biznesa", render: "static", indexable: true, priority: 0.7, theme: "dark" },
  { path: "/blog/video-dlya-kartochek-wildberries", render: "static", indexable: true, priority: 0.7, theme: "dark" },
  { path: "/blog/videosemka-meropriyatiy-nn", render: "static", indexable: true, priority: 0.7, theme: "dark" },
  { path: "/blog/videograf-operator-postanovshchik", render: "static", indexable: true, priority: 0.7, theme: "dark" },
  { path: "/blog/podgotovka-intervyu", render: "static", indexable: true, priority: 0.7, theme: "dark" },
  { path: "/portfolio/editing", render: "redirect", indexable: false },
  /* PROMPT-30 §3.4: служебная витрина компонентов брендбука — не публичный
   * продукт, не в PRIMARY_NAV/FOOTER_GROUPS, indexable: false держит её вне
   * sitemap.xml (см. INDEXABLE_ROUTES ниже) так же, как /admin, /journal. */
  { path: "/_kit", render: "static", indexable: false, theme: "dark" },
];

const categoryRoutes: readonly PublicRouteRecord[] = PORTFOLIO_CATEGORY_ORDER.map((category) => ({
  path: `/portfolio/${category}`,
  render: "v3" as const,
  indexable: true,
  priority: category === "camera" || category === "post" ? 0.85 : 0.8,
  theme: "dark" as const,
}));

const projectRoutes: readonly PublicRouteRecord[] = projects.map((project) => ({
  path: `/portfolio/${project.slug}`,
  render: "v3" as const,
  indexable: true,
  priority: project.featured ? 0.8 : 0.75,
  theme: "dark" as const,
}));

export const ROUTE_MANIFEST: readonly PublicRouteRecord[] = [
  ...fixedRoutes,
  ...categoryRoutes,
  ...projectRoutes,
];

export const V3_PRERENDER_ROUTES = ROUTE_MANIFEST
  .filter((route) => route.render === "v3")
  .map((route) => route.path);

export const PRERENDER_ROUTES = [
  ...V3_PRERENDER_ROUTES,
  "/calculator",
];

export const INDEXABLE_ROUTES = ROUTE_MANIFEST.filter((route) => route.indexable);

/** Тексты из seoCopy.ts перекрывают то, что собрано ниже из данных. */
const withCopy = <T extends { path: string; seo: { title: string; description: string; canonical: string } }>(r: T): T => {
  const copy = seoCopyFor(r.path);
  return copy ? { ...r, seo: { ...r.seo, title: copy.title, description: copy.description } } : r;
};

export const normalizePublicPath = (rawPath: string) => rawPath.replace(/\/+$/u, "") || "/";

export interface V3RouteResolution {
  path: string;
  kind: "home" | "portfolio" | "category" | "project" | "blog" | "about" | "contact" | "redirect" | "unknown";
  category?: PortfolioCategory;
  project?: Project;
  seo: { title: string; description: string; canonical: string };
}

function resolveV3RouteRaw(rawPath: string, rawSearch = ""): V3RouteResolution {
  const path = normalizePublicPath(rawPath);
  const segment = path.startsWith("/portfolio/") ? decodeURIComponent(path.slice("/portfolio/".length)) : "";
  const normalizedCategory = segment === "editing" ? "post" : segment;
  const category = PORTFOLIO_CATEGORY_ORDER.includes(normalizedCategory as PortfolioCategory)
    ? normalizedCategory as PortfolioCategory
    : undefined;
  const params = new URLSearchParams(rawSearch);
  const legacyAssetId = params.get("id");
  const legacyAsset = legacyAssetId ? assetById.get(legacyAssetId) : undefined;
  const legacySlugs: Record<string, string> = {
    "metro-gorkovskaya": "metro-gorkovskaya-concerts",
    "sber-architecture-course": "sber-arhitektura",
  };
  const project = projectBySlug.get(segment)
    || projectBySlug.get(legacySlugs[segment])
    || (legacyAsset ? projectById.get(legacyAsset.projectId) : undefined);

  if (path === "/blog") return { path, kind: "blog", seo: { title: "Блог о съёмке и постпродакшне | YELYGINN", description: "Практические заметки Юрия Елыгина о подготовке, видеосъёмке, монтаже и постпродакшне.", canonical: "/blog" } };
  if (path === "/about") return { path, kind: "about", seo: { title: "Обо мне — Юрий Елыгин | YELYGINN", description: "Юрий Елыгин — оператор, режиссёр монтажа и колорист из Нижнего Новгорода.", canonical: "/about" } };
  if (path === "/contact") return { path, kind: "contact", seo: { title: "Обсудить проект | YELYGINN", description: "Связаться с Юрием Елыгиным: Instagram, Telegram, YouTube, email и короткий бриф проекта.", canonical: "/contact" } };
  if (path === "/portfolio" || path === "/portfolio.html") return { path, kind: "portfolio", seo: { title: "Портфолио — 90 видеоработ | YELYGINN", description: "90 видеоработ Юрия Елыгина: операторская работа, монтаж, цвет, commercial, events, Reels и live production.", canonical: "/portfolio" } };
  if (path === "/cases" || path === "/cases.html") return { path, kind: "redirect", seo: { title: "Портфолио | YELYGINN", description: "Работы Юрия Елыгина.", canonical: "/portfolio" } };
  if (category) return { path, kind: "category", category, seo: { title: `${CATEGORY_META[category].title} | YELYGINN`, description: CATEGORY_META[category].description, canonical: `/portfolio/${category}` } };
  if (project) return { path, kind: "project", project, seo: { title: `${project.title} | YELYGINN`, description: project.description || `${project.title}: ${project.responsibilities.join(", ")}.`, canonical: `/portfolio/${project.slug}` } };
  if (path === "/") return { path, kind: "home", seo: { title: "Фотограф и видеооператор в Нижнем Новгороде | Юрий Елыгин", description: "Портретная и репортажная фотосъёмка, видео мероприятий, Reels, монтаж и цветокоррекция. Съёмка в Нижнем Новгороде, постпродакшн удалённо. Юрий Елыгин.", canonical: "/" } };
  return { path, kind: "unknown", seo: { title: "YELYGINN", description: "Операторская работа, монтаж, цвет и live production.", canonical: path } };
}

export const resolveV3Route = (rawPath: string, rawSearch = ""): V3RouteResolution => withCopy(resolveV3RouteRaw(rawPath, rawSearch));
