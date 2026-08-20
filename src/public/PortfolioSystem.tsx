import { ArrowUpRight } from "lucide-react";
import {
  assetsForProject,
  posterUrl,
  type Project,
  type WorkAsset,
} from "../portfolio/v3PortfolioData";
import { PROJECT_STILLS, type ProjectStill } from "./v3Content";

const roleLabels: Record<string, string> = {
  camera: "камера",
  operator: "оператор",
  edit: "монтаж",
  multicam: "мультикам",
  color: "цвет",
  sound: "звук",
  graphics: "графика",
  cleanup: "cleanup",
  sde: "SDE",
};

const projectHref = (project: Project) => `/portfolio/${project.slug}`;
const projectRoles = (project: Project) => project.roles.map((role) => roleLabels[role]).join(" // ");
const projectNumber = (projects: Project[], project: Project) => String(projects.indexOf(project) + 1).padStart(2, "0");

function ResponsivePoster({ asset, alt, priority = false, sizes }: { asset: WorkAsset; alt: string; priority?: boolean; sizes: string }) {
  const portrait = asset.orientation === "portrait";
  return (
    <img
      src={posterUrl(asset.kinescopeId, "md")}
      srcSet={`${posterUrl(asset.kinescopeId, "sm")} 640w, ${posterUrl(asset.kinescopeId, "md")} 1280w, ${posterUrl(asset.kinescopeId, "lg")} 1920w`}
      sizes={sizes}
      width={portrait ? 900 : 1600}
      height={portrait ? 1600 : 900}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}

function ResponsiveStill({ still, alt, priority = false, sizes }: { still: ProjectStill; alt: string; priority?: boolean; sizes: string }) {
  return (
    <img
      src={still.src}
      srcSet={still.srcSet}
      sizes={sizes}
      width={still.width}
      height={still.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}

function ProjectImage({ project, index = 0, priority = false, sizes, alt }: { project: Project; index?: number; priority?: boolean; sizes: string; alt: string }) {
  const curated = PROJECT_STILLS[project.id];
  const still = curated?.[index % curated.length];
  if (still) return <ResponsiveStill still={still} alt={alt} priority={priority} sizes={sizes} />;
  const assets = assetsForProject(project.id);
  return <ResponsivePoster asset={assets[index % assets.length]} alt={alt} priority={priority} sizes={sizes} />;
}

const visualCountForProject = (project: Project) => PROJECT_STILLS[project.id]?.length || assetsForProject(project.id).length;
const materialLabel = (count: number) => count === 1 ? "материал" : count < 5 ? "материала" : "материалов";
const textLedProjectIds = new Set(["gorky-memory"]);

function MediaCluster({ project, priority = false }: { project: Project; priority?: boolean }) {
  const assets = assetsForProject(project.id);
  const main = assets[0];
  const curated = PROJECT_STILLS[project.id];
  const visualCount = visualCountForProject(project);
  const secondaryCount = Math.min(2, Math.max(0, visualCount - 1));
  const fallbackPoster = posterUrl(main.kinescopeId, "md");
  return (
    <div className={`portfolio-media-cluster portfolio-media-cluster--${main.orientation} portfolio-media-cluster--count-${Math.min(3, visualCount)}`}>
      <figure className="portfolio-media-cluster__main">
        <ProjectImage project={project} alt={`Кадр из проекта «${project.title}»`} priority={priority} sizes="(max-width: 700px) 94vw, 62vw" />
      </figure>
      {secondaryCount > 0 && (
        <div className="portfolio-media-cluster__rail" aria-label={`Дополнительные кадры проекта «${project.title}»`}>
          {Array.from({ length: secondaryCount }, (_, index) => (
            <figure key={`${project.id}-${index + 1}`} style={{ backgroundImage: `url(${fallbackPoster})` }}>
              <ProjectImage project={project} index={index + 1} alt={`Кадр ${index + 2} из проекта «${project.title}»`} sizes="(max-width: 700px) 44vw, 20vw" />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectInfo({ project, number, detailed = false }: { project: Project; number: string; detailed?: boolean }) {
  const visualCount = visualCountForProject(project);
  return (
    <div className="portfolio-project-info">
      <div className="portfolio-project-info__meta">
        <span>{number}</span>
        <span>{visualCount} {materialLabel(visualCount)}</span>
      </div>
      <div>
        <h3>{project.title}</h3>
        {detailed && project.description && <p>{project.description}</p>}
        <small>{projectRoles(project)}</small>
      </div>
      <ArrowUpRight aria-hidden="true" />
    </div>
  );
}

export function FeaturedPanel({ project, number, priority = false }: { project: Project; number: string; priority?: boolean }) {
  if (textLedProjectIds.has(project.id)) {
    return (
      <article className="portfolio-featured portfolio-featured--text-only">
        <a className="portfolio-featured__info" href={projectHref(project)}>
          <ProjectInfo project={project} number={number} detailed />
        </a>
      </article>
    );
  }
  const visualCount = Math.min(3, visualCountForProject(project));
  return (
    <article className={`portfolio-featured portfolio-featured--count-${visualCount}`}>
      <a className="portfolio-featured__media" href={projectHref(project)} aria-label={`Открыть проект «${project.title}»`}>
        <MediaCluster project={project} priority={priority} />
      </a>
      <a className="portfolio-featured__info" href={projectHref(project)}>
        <ProjectInfo project={project} number={number} detailed />
      </a>
    </article>
  );
}

export function ProjectRow({ project, number, reverse = false }: { project: Project; number: string; reverse?: boolean; key?: string }) {
  if (textLedProjectIds.has(project.id)) {
    return (
      <a className="portfolio-row portfolio-row--text-only" href={projectHref(project)}>
        <ProjectInfo project={project} number={number} detailed />
      </a>
    );
  }
  const visualCount = Math.min(3, visualCountForProject(project));
  return (
    <a className={`portfolio-row portfolio-row--count-${visualCount}${reverse ? " portfolio-row--reverse" : ""}`} href={projectHref(project)}>
      <div className="portfolio-row__media"><MediaCluster project={project} /></div>
      <ProjectInfo project={project} number={number} detailed />
    </a>
  );
}

export function ModularMosaic({ projects, allProjects }: { projects: Project[]; allProjects: Project[]; key?: string }) {
  const textProjects = projects.filter((project) => textLedProjectIds.has(project.id));
  const visualProjects = projects.filter((project) => !textLedProjectIds.has(project.id));
  return (
    <>
      {textProjects.map((project) => <a key={project.id} className="portfolio-text-project" href={projectHref(project)}><ProjectInfo project={project} number={projectNumber(allProjects, project)} detailed /></a>)}
      {visualProjects.length > 0 && <section className={`portfolio-mosaic portfolio-mosaic--count-${visualProjects.length}`} aria-label="Модульная подборка проектов">
        {visualProjects.map((project, index) => (
          <a key={project.id} className={`portfolio-mosaic__item portfolio-mosaic__item--${index + 1}`} href={projectHref(project)}>
            <ProjectImage project={project} alt={`Кадр из проекта «${project.title}»`} sizes={index === 0 ? "(max-width: 700px) 94vw, 58vw" : "(max-width: 700px) 94vw, 38vw"} />
            <div>
              <span>{projectNumber(allProjects, project)}</span>
              <h3>{project.title}</h3>
              {project.description && <p>{project.description}</p>}
              <small>{projectRoles(project)}</small>
            </div>
          </a>
        ))}
      </section>}
    </>
  );
}

export function PosterGrid({ projects, allProjects }: { projects: Project[]; allProjects: Project[] }) {
  return (
    <section className="portfolio-posters" aria-label="Вертикальные работы">
      <header><span>VERTICAL // POSTERS</span><span>{projects.length} ПРОЕКТА</span></header>
      <div>
        {projects.map((project) => {
          const asset = assetsForProject(project.id).find((item) => item.orientation === "portrait") || assetsForProject(project.id)[0];
          return (
            <a key={project.id} href={projectHref(project)}>
              <figure>
                <ResponsivePoster asset={asset} alt={`Вертикальный кадр из проекта «${project.title}»`} sizes="(max-width: 700px) 45vw, 30vw" />
              </figure>
              <div><span>{projectNumber(allProjects, project)}</span><h3>{project.title}</h3>{project.description && <p>{project.description}</p>}<small>{projectRoles(project)}</small></div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export default function PortfolioSystem({ projects, firstMediaPriority = false }: { projects: Project[]; firstMediaPriority?: boolean }) {
  if (projects.length === 0) return null;

  const featured = projects[0];
  const portraitCandidates = projects.slice(1).filter((project) => assetsForProject(project.id).some((asset) => asset.orientation === "portrait")).slice(0, 4);
  const posterProjects = portraitCandidates.length >= 2 ? portraitCandidates : [];
  const posterIds = new Set(posterProjects.map((project) => project.id));
  const remaining = projects.slice(1).filter((project) => !posterIds.has(project.id));
  const firstRow = remaining.shift();
  const firstMosaic = remaining.splice(0, Math.min(3, remaining.length));
  const tail: Array<{ kind: "row"; project: Project; reverse: boolean } | { kind: "mosaic"; projects: Project[] }> = [];
  let reverse = true;
  while (remaining.length > 0) {
    const row = remaining.shift();
    if (row) {
      tail.push({ kind: "row", project: row, reverse });
      reverse = !reverse;
    }
    const mosaic = remaining.splice(0, Math.min(3, remaining.length));
    if (mosaic.length > 0) tail.push({ kind: "mosaic", projects: mosaic });
  }

  return (
    <div className="portfolio-system">
      <FeaturedPanel project={featured} number={projectNumber(projects, featured)} priority={firstMediaPriority} />
      {firstRow && <ProjectRow project={firstRow} number={projectNumber(projects, firstRow)} />}
      {firstMosaic.length > 0 && <ModularMosaic projects={firstMosaic} allProjects={projects} />}
      {posterProjects.length > 0 && <PosterGrid projects={posterProjects} allProjects={projects} />}
      {tail.map((item, index) => item.kind === "row"
        ? <ProjectRow key={item.project.id} project={item.project} number={projectNumber(projects, item.project)} reverse={item.reverse} />
        : <ModularMosaic key={`mosaic-${index}-${item.projects[0].id}`} projects={item.projects} allProjects={projects} />)}
    </div>
  );
}
