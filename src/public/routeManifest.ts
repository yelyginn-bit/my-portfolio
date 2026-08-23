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
import { PORTFOLIO_PROJECTS, type PortfolioProject } from "../lib/portfolio.data";

export type RouteRenderKind = "v3" | "calculator" | "static" | "private" | "redirect" | "case";

export interface PublicRouteRecord {
  path: string;
  render: RouteRenderKind;
  indexable: boolean;
  priority?: number;
}

const fixedRoutes: readonly PublicRouteRecord[] = [
  { path: "/", render: "v3", indexable: true, priority: 1 },
  { path: "/portfolio", render: "v3", indexable: true, priority: 0.9 },
  { path: "/blog", render: "v3", indexable: true, priority: 0.75 },
  { path: "/about", render: "v3", indexable: true, priority: 0.75 },
  { path: "/contact", render: "v3", indexable: true, priority: 0.75 },
  { path: "/calculator", render: "calculator", indexable: true, priority: 0.8 },
  { path: "/content-day", render: "static", indexable: true, priority: 0.8 },
  { path: "/reklamnye-roliki", render: "static", indexable: true, priority: 0.9 },
  { path: "/event-video", render: "static", indexable: true, priority: 0.85 },
  { path: "/reels", render: "static", indexable: true, priority: 0.9 },
  { path: "/cvetokorrekciya", render: "static", indexable: true, priority: 0.85 },
  { path: "/video-dlya-marketpleysov", render: "static", indexable: true, priority: 0.85 },
  { path: "/pryamye-translyacii", render: "static", indexable: true, priority: 0.9 },
  { path: "/ceny", render: "static", indexable: true, priority: 0.8 },
  { path: "/photo", render: "static", indexable: true, priority: 0.75 },
  { path: "/portfolio/photo", render: "private", indexable: false },
  { path: "/account", render: "private", indexable: false },
  { path: "/admin", render: "private", indexable: false },
  { path: "/gallery", render: "private", indexable: false },
  { path: "/journal", render: "private", indexable: false },
  { path: "/privacy-policy", render: "static", indexable: true, priority: 0.3 },
  { path: "/personal-data-consent", render: "static", indexable: true, priority: 0.2 },
  { path: "/cookie-policy", render: "static", indexable: true, priority: 0.2 },
  { path: "/terms", render: "static", indexable: true, priority: 0.3 },
  { path: "/payment-terms", render: "static", indexable: true, priority: 0.3 },
  { path: "/cancellation-refund", render: "static", indexable: true, priority: 0.2 },
  { path: "/gallery-terms", render: "static", indexable: true, priority: 0.2 },
  { path: "/data-request", render: "static", indexable: true, priority: 0.2 },
  { path: "/blog/skolko-stoit-snyat-reklamnyy-rolik", render: "static", indexable: true, priority: 0.7 },
  { path: "/blog/kak-snimat-reels-dlya-biznesa", render: "static", indexable: true, priority: 0.7 },
  { path: "/blog/video-dlya-kartochek-wildberries", render: "static", indexable: true, priority: 0.7 },
  { path: "/blog/videosemka-meropriyatiy-nn", render: "static", indexable: true, priority: 0.7 },
  { path: "/portfolio/editing", render: "redirect", indexable: false },
];

const categoryRoutes: readonly PublicRouteRecord[] = PORTFOLIO_CATEGORY_ORDER.map((category) => ({
  path: `/portfolio/${category}`,
  render: "v3" as const,
  indexable: true,
  priority: category === "camera" || category === "post" ? 0.85 : 0.8,
}));

const projectRoutes: readonly PublicRouteRecord[] = projects.map((project) => ({
  path: `/portfolio/${project.slug}`,
  render: "v3" as const,
  indexable: true,
  priority: project.featured ? 0.8 : 0.75,
}));

/**
 * Механизм маршрутов кейсов `/cases/<slug>`, порождаемых из
 * `src/lib/portfolio.data.ts`. Публикация — по явному опт-ину: пока slug не
 * добавлен сюда, для него не будет ни маршрута в манифесте, ни sitemap-записи,
 * ни pre-render файла. Пусто по умолчанию — реестр данных не значит
 * публикацию кейсов.
 */
export const PUBLISHED_CASE_SLUGS: readonly string[] = [];

export const CASE_PROJECTS: readonly PortfolioProject[] = PUBLISHED_CASE_SLUGS.map((slug) => {
  const project = PORTFOLIO_PROJECTS.find((candidate) => candidate.id === slug);
  if (!project) throw new Error(`PUBLISHED_CASE_SLUGS references unknown portfolio project: ${slug}`);
  return project;
});

const caseRoutes: readonly PublicRouteRecord[] = CASE_PROJECTS.map((project) => ({
  path: `/cases/${project.id}`,
  render: "case" as const,
  indexable: true,
  priority: 0.75,
}));

export const ROUTE_MANIFEST: readonly PublicRouteRecord[] = [
  ...fixedRoutes,
  ...categoryRoutes,
  ...projectRoutes,
  ...caseRoutes,
];

export const V3_PRERENDER_ROUTES = ROUTE_MANIFEST
  .filter((route) => route.render === "v3")
  .map((route) => route.path);

export const CASE_PRERENDER_ROUTES = ROUTE_MANIFEST
  .filter((route) => route.render === "case")
  .map((route) => route.path);

export const PRERENDER_ROUTES = [
  ...V3_PRERENDER_ROUTES,
  "/calculator",
  ...CASE_PRERENDER_ROUTES,
];

export const INDEXABLE_ROUTES = ROUTE_MANIFEST.filter((route) => route.indexable);

export const normalizePublicPath = (rawPath: string) => rawPath.replace(/\/+$/u, "") || "/";

export interface V3RouteResolution {
  path: string;
  kind: "home" | "portfolio" | "category" | "project" | "blog" | "about" | "contact" | "broadcast" | "redirect" | "unknown";
  category?: PortfolioCategory;
  project?: Project;
  seo: { title: string; description: string; canonical: string };
}

export function resolveV3Route(rawPath: string, rawSearch = ""): V3RouteResolution {
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
  if (path === "/pryamye-translyacii" || path === "/pryamye-translyacii.html") return { path, kind: "broadcast", seo: { title: "Оператор прямых трансляций в Нижнем Новгороде | YELYGINN", description: "Оператор камеры на прямую трансляцию, многокамерная съёмка и работа в составе live production crew в Нижнем Новгороде и с выездом.", canonical: "/pryamye-translyacii" } };
  if (path === "/portfolio" || path === "/portfolio.html") return { path, kind: "portfolio", seo: { title: "Портфолио — 89 видеоработ | YELYGINN", description: "89 видеоработ Юрия Елыгина: операторская работа, монтаж, цвет, commercial, events, Reels и live production.", canonical: "/portfolio" } };
  if (path === "/cases" || path === "/cases.html") return { path, kind: "redirect", seo: { title: "Портфолио | YELYGINN", description: "Работы Юрия Елыгина.", canonical: "/portfolio" } };
  if (category) return { path, kind: "category", category, seo: { title: `${CATEGORY_META[category].title} | YELYGINN`, description: CATEGORY_META[category].description, canonical: `/portfolio/${category}` } };
  if (project) return { path, kind: "project", project, seo: { title: `${project.title} | YELYGINN`, description: project.description || `${project.title}: ${project.responsibilities.join(", ")}.`, canonical: `/portfolio/${project.slug}` } };
  if (path === "/") return { path, kind: "home", seo: { title: "Видеограф и видеооператор в Нижнем Новгороде — съёмка, монтаж, цвет | Юрий Елыгин", description: "Профессиональная видеосъёмка в Нижнем Новгороде: рекламные ролики, съёмка мероприятий, Reels, монтаж и цветокоррекция. Работаю с брендами и бизнесом. Смета после брифа.", canonical: "/" } };
  return { path, kind: "unknown", seo: { title: "YELYGINN", description: "Операторская работа, монтаж, цвет и live production.", canonical: path } };
}
