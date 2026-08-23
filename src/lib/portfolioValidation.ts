/**
 * Проверки целостности реестра портфолио — встраиваются в тот же пре-рендер,
 * где уже стоит проверка H1, и валят сборку до того, как чужое видео или
 * битая ссылка на фото попадут на сайт.
 *
 * Известная история, ради которой это существует: в
 * `YELYGINN-registry-proektov.md` два Kinescope ID уже были найдены
 * приписанными сразу к двум разным проектам (VK Fest ↔ «Горький в тени
 * войны», тизер СИБУРа ↔ «Основа»). Без этой проверки такой ID один раз
 * тихо утащит на страницу чужой ролик.
 */
import type { PortfolioProject, VideoOrientation } from "./portfolio.data";

const VALID_ORIENTATIONS: readonly VideoOrientation[] = ["16:9", "9:16"];

export interface PortfolioValidationResult {
  errors: string[];
}

/** Один и тот же Kinescope ID не должен встречаться в двух разных проектах. */
export function findDuplicateKinescopeIds(projects: readonly PortfolioProject[]): string[] {
  const owners = new Map<string, Set<string>>();
  for (const project of projects) {
    for (const video of project.videos) {
      const set = owners.get(video.kinescopeId) ?? new Set<string>();
      set.add(project.id);
      owners.set(video.kinescopeId, set);
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
export function findInvalidOrientations(projects: readonly PortfolioProject[]): string[] {
  const errors: string[] = [];
  for (const project of projects) {
    for (const video of project.videos) {
      if (!VALID_ORIENTATIONS.includes(video.orientation)) {
        errors.push(`Проект "${project.id}": ролик "${video.kinescopeId}" имеет недопустимое соотношение сторон "${video.orientation}"`);
      }
    }
  }
  return errors;
}

/** Каждая упомянутая в реестре фотография должна существовать в обработанной
 * статике. `photoExists` — внешняя проверка файловой системы (прокидывается
 * снаружи, чтобы этот модуль не зависел от Node fs и был тестируемым). */
export function findMissingPhotos(
  projects: readonly PortfolioProject[],
  photoExists: (photoId: string) => boolean,
): string[] {
  const errors: string[] = [];
  for (const project of projects) {
    for (const photo of project.photos) {
      if (!photoExists(photo.id)) {
        errors.push(`Проект "${project.id}": фотография "${photo.id}" не найдена в обработанной статике`);
      }
    }
    for (const pair of project.colorPairs) {
      if (!photoExists(pair.rawPhotoId)) {
        errors.push(`Проект "${project.id}": RAW-кадр "${pair.rawPhotoId}" пары "${pair.id}" не найден в обработанной статике`);
      }
      if (!photoExists(pair.colorPhotoId)) {
        errors.push(`Проект "${project.id}": цветокорректированный кадр "${pair.colorPhotoId}" пары "${pair.id}" не найден в обработанной статике`);
      }
    }
  }
  return errors;
}

export function validatePortfolioRegistry(
  projects: readonly PortfolioProject[],
  photoExists: (photoId: string) => boolean,
): PortfolioValidationResult {
  return {
    errors: [
      ...findDuplicateKinescopeIds(projects),
      ...findInvalidOrientations(projects),
      ...findMissingPhotos(projects, photoExists),
    ],
  };
}
