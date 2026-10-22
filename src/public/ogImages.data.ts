import { SERVICE_LANDINGS } from "./serviceLandings.data";
import { assetsForProject, posterUrl, projects, projectsForCategory, workAssets, PORTFOLIO_CATEGORY_ORDER, type PortfolioCategory, type Project } from "../portfolio/v3PortfolioData";
import { INDEXABLE_ROUTES } from "./routeManifest";

const forbidden = /лукойл|lukoil/iu;
const defaultSource = "/v3-assets/hero-showreel-poster.webp";
function projectFrame(project: Project): string {
  if (forbidden.test(JSON.stringify(project))) throw new Error("Excluded project cannot supply an OG frame");
  const asset = assetsForProject(project.id).find((item) => {
    const sourceId = posterUrl(item.kinescopeId).split("/").at(-1)!.replace(/\.webp$/u, "");
    const owner = workAssets.find((candidate) => candidate.kinescopeId === sourceId);
    return !owner || owner.projectId === project.id;
  });
  if (!asset) throw new Error(`No project-owned OG frame: ${project.slug}`);
  return posterUrl(asset.kinescopeId, "lg");
}
function categoryFrame(category: PortfolioCategory): string {
  const project = projectsForCategory(category).find((p) => !forbidden.test(JSON.stringify(p)));
  if (!project) throw new Error(`No published OG frame for category: ${category}`);
  return projectFrame(project);
}
const sourceByRoute: Readonly<Record<string, string>> = {
  ...Object.fromEntries(SERVICE_LANDINGS.map((page) => [page.path, projectFrame(projects.find((project) => project.id === page.projectIds[0])!)])),
  "/blog/skolko-stoit-fotograf-na-meropriyatie": "/portfolio-photos/kvn-05-960w.webp",
  "/photo": "/portfolio-photos/portraits-05-960w.webp",
  "/predmetnaya-fotosemka": categoryFrame("product"),
  "/operator-s-tehnikoy": categoryFrame("camera"),
  "/studiynaya-fotosemka": "/portfolio-photos/portraits-05-960w.webp",
  "/portretnaya-fotosessiya": "/portfolio-photos/portraits-05-960w.webp",
  "/reportazhnaya-fotosemka": "/portfolio-photos/kvn-05-960w.webp",
  "/reklamnye-roliki": categoryFrame("commercial"),
  "/event-video": categoryFrame("events"),
  "/reels": categoryFrame("reels"),
  "/cvetokorrekciya": categoryFrame("color"),
  "/video-dlya-marketpleysov": categoryFrame("product"),
  "/content-day": categoryFrame("reels"),
  "/pryamye-translyacii": categoryFrame("broadcast"),
  "/sajty": projectFrame(projects.find((p) => p.slug === "showreel-site")!),
  "/blog/skolko-stoit-snyat-reklamnyy-rolik": categoryFrame("commercial"),
  "/blog/kak-snimat-reels-dlya-biznesa": categoryFrame("reels"),
  "/blog/video-dlya-kartochek-wildberries": categoryFrame("product"),
  "/blog/videosemka-meropriyatiy-nn": categoryFrame("events"),
  "/blog/videograf-operator-postanovshchik": categoryFrame("camera"),
  "/blog/podgotovka-intervyu": categoryFrame("interviews"),
};

export interface OgImage { source: string; path: string }
/** The only route → OG image mapping; project/category routes follow their registry. */
export const OG_IMAGES: Readonly<Record<string, OgImage>> = Object.fromEntries(INDEXABLE_ROUTES.map((route) => {
  const project = projects.find((p) => route.path === `/portfolio/${p.slug}`);
  const category = PORTFOLIO_CATEGORY_ORDER.find((c) => route.path === `/portfolio/${c}`);
  const source = project ? projectFrame(project) : category ? categoryFrame(category) : sourceByRoute[route.path] || defaultSource;
  if (forbidden.test(source)) throw new Error("Excluded OG source");
  return [route.path, { source, path: `/og/${source.slice(1).replaceAll("/", "-").replace(/\.[^.]+$/u, ".jpg")}` }];
}));
