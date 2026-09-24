/**
 * Проверки целостности реестра портфолио — встраиваются в тот же пре-рендер,
 * где уже стоит проверка H1, и валят сборку до того, как чужое видео попадёт
 * на сайт.
 *
 * Известная история, ради которой это существует: в
 * `YELYGINN-registry-proektov.md` два Kinescope ID были найдены приписанными
 * сразу к двум разным проектам (VK Fest ↔ «Горький в тени войны», тизер
 * СИБУРа ↔ «Основа»). Без этой проверки такой ID один раз тихо утащит на
 * страницу чужой ролик.
 *
 * Проверяет живой реестр (`src/portfolio/v3PortfolioData.ts`), из которого
 * реально строятся страницы — не архивный `src/lib/portfolio.data.ts`
 * (PROMPT-25 §2).
 */
import type { Project, WorkAsset } from "../portfolio/v3PortfolioData";

const VALID_ORIENTATIONS: readonly WorkAsset["orientation"][] = ["landscape", "portrait"];

export interface PortfolioValidationResult {
  errors: string[];
}

/** Один и тот же Kinescope ID не должен встречаться в двух разных проектах. */
export function findDuplicateKinescopeIds(projects: readonly Pick<Project, "id" | "videos">[]): string[] {
  const owners = new Map<string, Set<string>>();
  for (const project of projects) {
    for (const kinescopeId of project.videos) {
      const set = owners.get(kinescopeId) ?? new Set<string>();
      set.add(project.id);
      owners.set(kinescopeId, set);
    }
  }
  const errors: string[] = [];
  for (const [kinescopeId, projectIds] of owners) {
    if (projectIds.size > 1) {
      errors.push(`Kinescope ID "${kinescopeId}" встречается в нескольких проектах: ${[...projectIds].join(", ")}`);
    }
  }
  return errors;
}

/** Каждый ролик должен иметь заявленное и допустимое соотношение сторон. */
export function findInvalidOrientations(assets: readonly Pick<WorkAsset, "projectId" | "kinescopeId" | "orientation">[]): string[] {
  const errors: string[] = [];
  for (const asset of assets) {
    if (!VALID_ORIENTATIONS.includes(asset.orientation)) {
      errors.push(`Проект "${asset.projectId}": ролик "${asset.kinescopeId}" имеет недопустимое соотношение сторон "${asset.orientation}"`);
    }
  }
  return errors;
}

export function validatePortfolioRegistry(
  projects: readonly Pick<Project, "id" | "videos">[],
  assets: readonly Pick<WorkAsset, "projectId" | "kinescopeId" | "orientation">[],
): PortfolioValidationResult {
  return {
    errors: [
      ...findDuplicateKinescopeIds(projects),
      ...findInvalidOrientations(assets),
    ],
  };
}
