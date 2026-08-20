import { projects } from "../portfolio/v3PortfolioData";

export type PublicRouteType = "react" | "static" | "blog" | "legal" | "internal";

export interface SiteRoute {
  path: string;
  type: PublicRouteType;
  indexable: boolean;
  sitemap: boolean;
  publicNav: boolean;
  canonical: string;
  buildTarget?: string;
}

const route = (path: string, type: PublicRouteType, options: Partial<SiteRoute> = {}): SiteRoute => ({
  path,
  type,
  indexable: true,
  sitemap: true,
  publicNav: false,
  canonical: `https://yelyginn.ru${path === "/" ? "/" : path}`,
  ...options,
});

export const SITE_ROUTES: SiteRoute[] = [
  route("/", "react", { publicNav: true, buildTarget: "index.html" }),
  route("/portfolio", "react", { publicNav: true, buildTarget: "portfolio.html" }),
  ...["camera", "commercial", "events", "reels", "concerts", "interviews", "post", "color", "broadcast", "product"].map((category) => route(`/portfolio/${category}`, "react")),
  ...projects.map((project) => route(`/portfolio/${project.slug}`, "react")),
  route("/pryamye-translyacii", "react", { publicNav: true, buildTarget: "pryamye-translyacii.html" }),
  route("/ceny", "static", { publicNav: true, buildTarget: "ceny.html" }),
  route("/calculator", "static", { publicNav: true, buildTarget: "calculator.html" }),
  route("/blog", "react", { publicNav: true, buildTarget: "index.html" }),
  route("/about", "react", { publicNav: true, buildTarget: "index.html" }),
  route("/contact", "react", { buildTarget: "index.html" }),
  route("/cases", "internal", { indexable: false, sitemap: false, publicNav: false, buildTarget: "cases.html" }),
  route("/cvetokorrekciya", "react", { buildTarget: "cvetokorrekciya.html" }),
  route("/reklamnye-roliki", "static", { buildTarget: "reklamnye-roliki.html" }),
  route("/reels", "static", { buildTarget: "reels.html" }),
  route("/event-video", "static", { buildTarget: "event-video.html" }),
  route("/video-dlya-marketpleysov", "static", { buildTarget: "video-dlya-marketpleysov.html" }),
  ...["privacy-policy", "personal-data-consent", "cookie-policy", "terms", "payment-terms", "cancellation-refund", "gallery-terms", "data-request"].map((name) => route(`/${name}`, "legal", { buildTarget: "legal.html" })),
  ...["/account", "/admin", "/gallery", "/g/*", "/journal", "/journal/*", "/photo", "/portfolio/photo"].map((path) => route(path, "internal", { indexable: false, sitemap: false, publicNav: false })),
];

export const PUBLIC_NAV_ROUTES = SITE_ROUTES.filter((item) => item.publicNav);
export const SITEMAP_ROUTES = SITE_ROUTES.filter((item) => item.indexable && item.sitemap);
