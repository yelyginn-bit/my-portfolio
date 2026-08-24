import manifest from "../../lib/portfolio-photos.manifest.json";

/**
 * Отдаёт фото из `public/portfolio-photos/<id>.webp`, обработанное
 * `scripts/process-portfolio-photos.ts`. `width`/`height` берутся из
 * манифеста, который пишет пайплайн, — не из пропа, чтобы верстальщик не мог
 * случайно указать неверные и получить прыжок layout при загрузке.
 *
 * Только webp, без JPEG-фолбэка: убран ради веса деплоя (см.
 * PHOTO-PIPELINE-REPORT.md) — webp-поддержка браузеров уже >97% глобально.
 * `<img>` напрямую с srcset, `<picture>` не нужен при одном формате.
 * Ленивая загрузка — нативным `loading="lazy"`, тот же паттерн, что уже
 * используют `<img>` в ColorCompare и во всех статичных страницах сайта.
 */

interface ManifestEntry {
  width: number;
  height: number;
  widths: number[];
}

const MANIFEST = manifest as Record<string, ManifestEntry>;

export interface PortfolioImageProps {
  id: string;
  alt: string;
  sizes?: string;
  className?: string;
}

export function PortfolioImage({ id, alt, sizes = "100vw", className }: PortfolioImageProps) {
  const entry = MANIFEST[id];
  if (!entry) {
    throw new Error(`PortfolioImage: unknown photo id "${id}". Run scripts/process-portfolio-photos.ts or add it to scripts/photo-map.ts.`);
  }

  const base = `/portfolio-photos/${id}`;
  const srcSet = entry.widths
    .map((width) => `${base}${width === entry.width ? "" : `-${width}w`}.webp ${width}w`)
    .join(", ");

  return (
    <img
      className={className}
      src={`${base}.webp`}
      srcSet={srcSet}
      sizes={sizes}
      width={entry.width}
      height={entry.height}
      loading="lazy"
      decoding="async"
      alt={alt}
    />
  );
}

export default PortfolioImage;
