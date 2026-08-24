/**
 * Пайплайн обработки фотографий из архива в статику сайта.
 *
 * Запуск отдельной командой, НЕ частью `npm run build`:
 *
 *   npx tsx scripts/process-portfolio-photos.ts --source "/путь/к/архиву"
 *
 * Вход — папка вне репозитория (путь параметром). Выход —
 * `public/portfolio-photos/<id>.webp` (канонический файл, имя не меняется —
 * на него завязан валидатор реестра в scripts/prerender.ts) плюс более узкие
 * срезы `<id>-480w.webp`/`<id>-960w.webp` для srcset. Только webp — без
 * JPEG-фолбэка: экономия веса деплоя перевесила поддержку браузеров без
 * webp (globally >97%). Метаданные (ширина/высота каждого id) пишутся в
 * src/lib/portfolio-photos.manifest.json — компонент изображения читает их
 * оттуда, а не открывает файлы заново в браузере.
 *
 * Карта «исходный файл → id» — в scripts/photo-map.ts, явная, не
 * автогенерация из имён файлов.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { CAMERA_SCREENSHOTS, COLOR_PAIRS, SINGLE_PHOTOS, type CameraScreenshotSource, type ColorPairSource } from "./photo-map";

const execFileAsync = promisify(execFile);

const WIDTHS = [480, 960, 1600] as const;
const CANONICAL_WIDTH = WIDTHS[WIDTHS.length - 1];
const WEBP_QUALITY = 82;

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "public", "portfolio-photos");
const manifestPath = path.join(rootDir, "src", "lib", "portfolio-photos.manifest.json");

function parseArgs(argv: readonly string[]) {
  const sourceFlagIndex = argv.indexOf("--source");
  const source = sourceFlagIndex >= 0 ? argv[sourceFlagIndex + 1] : argv[0];
  if (!source) {
    throw new Error("Usage: tsx scripts/process-portfolio-photos.ts --source <path-to-archive>");
  }
  return { source: path.resolve(source) };
}

/** sharp не умеет декодировать HEIC из коробки (нет libheif в прекомпилированном
 * бинарнике). На macOS для этого уже есть системный `sips` — используем его
 * только для HEIC, во временный PNG, дальше единый путь через sharp. */
async function resolveReadableSource(absoluteSourcePath: string, scratchDir: string): Promise<string> {
  if (!/\.heic$/iu.test(absoluteSourcePath)) return absoluteSourcePath;
  const outPath = path.join(scratchDir, `${path.basename(absoluteSourcePath, path.extname(absoluteSourcePath))}.png`);
  await execFileAsync("sips", ["-s", "format", "png", absoluteSourcePath, "--out", outPath]);
  return outPath;
}

interface ProcessedPhoto {
  id: string;
  width: number;
  height: number;
  widths: number[];
}

/** Ресайзит один источник на все применимые ширины (без апскейла), пишет
 * `<id>-<w>w.webp` для промежуточных ширин, `<id>.webp` для канонической
 * (самой крупной применимой). EXIF не сохраняется нигде: sharp по умолчанию
 * не переносит метаданные в выход, если явно не вызван `.withMetadata()` —
 * мы его не вызываем. `.rotate()` без аргументов применяет поворот по EXIF
 * Orientation к самим пикселям до того, как эта метка (и всё остальное
 * EXIF) будет отброшена. */
async function processSource(id: string, absoluteSourcePath: string, scratchDir: string): Promise<ProcessedPhoto> {
  const readable = await resolveReadableSource(absoluteSourcePath, scratchDir);
  const base = sharp(readable).rotate();
  const sourceMeta = await base.metadata();
  const sourceWidth = sourceMeta.width ?? CANONICAL_WIDTH;

  const applicableWidths: number[] = WIDTHS.filter((w) => w <= sourceWidth);
  if (applicableWidths.length === 0) applicableWidths.push(sourceWidth);
  const canonicalTargetWidth = applicableWidths[applicableWidths.length - 1];

  let canonicalDims: { width: number; height: number } | undefined;
  for (const width of applicableWidths) {
    const resized = base.clone().resize({ width, withoutEnlargement: true });
    const isCanonical = width === canonicalTargetWidth;
    const suffix = isCanonical ? "" : `-${width}w`;
    const outFile = path.join(outputDir, `${id}${suffix}.webp`);
    const info = await resized.webp({ quality: WEBP_QUALITY }).toFile(outFile);
    if (isCanonical) canonicalDims = { width: info.width, height: info.height };
  }

  if (!canonicalDims) throw new Error(`No canonical output produced for ${id}`);
  return { id, width: canonicalDims.width, height: canonicalDims.height, widths: applicableWidths };
}

/** Находит файл скриншота по ASCII-безопасной части имени и наличию "(2)",
 * не полагаясь на точное совпадение неразрывных пробелов в имени файла. */
async function resolveCameraScreenshot(entry: CameraScreenshotSource, sourceRoot: string): Promise<string> {
  const dirPath = path.join(sourceRoot, entry.dir);
  const files = await readdir(dirPath);
  const candidates = files.filter((f) => f.includes(entry.timestamp) && f.includes("(2)") === (entry.variant === "still"));
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one "${entry.variant}" file matching "${entry.timestamp}" in ${entry.dir}, found ${candidates.length}: ${candidates.join(", ")}`);
  }
  return path.join(dirPath, candidates[0]);
}

async function processPair(pair: ColorPairSource, sourceRoot: string, scratchDir: string) {
  const raw = await processSource(pair.rawId, path.join(sourceRoot, pair.rawSource), scratchDir);
  const color = await processSource(pair.colorId, path.join(sourceRoot, pair.colorSource), scratchDir);
  if (raw.width !== color.width || raw.height !== color.height) {
    throw new Error(
      `Color-grade pair geometry mismatch: ${pair.rawId} is ${raw.width}x${raw.height} but ${pair.colorId} is ${color.width}x${color.height}. ` +
      "Both sides of a pair must end up the same size or the before/after slider breaks.",
    );
  }
  return [raw, color];
}

async function main() {
  const { source } = parseArgs(process.argv.slice(2));
  await mkdir(outputDir, { recursive: true });
  const scratchDir = await mkdtemp(path.join(tmpdir(), "yelyginn-photo-pipeline-"));

  try {
    const processed: ProcessedPhoto[] = [];

    for (const pair of COLOR_PAIRS) {
      const [raw, color] = await processPair(pair, source, scratchDir);
      processed.push(raw, color);
      console.log(`pair OK: ${pair.rawId} / ${pair.colorId} — ${raw.width}x${raw.height}`);
    }

    for (const single of SINGLE_PHOTOS) {
      const result = await processSource(single.id, path.join(source, single.source), scratchDir);
      processed.push(result);
      console.log(`photo OK: ${single.id} — ${result.width}x${result.height}`);
    }

    for (const screenshot of CAMERA_SCREENSHOTS) {
      const absoluteSource = await resolveCameraScreenshot(screenshot, source);
      const result = await processSource(screenshot.id, absoluteSource, scratchDir);
      processed.push(result);
      console.log(`photo OK: ${screenshot.id} — ${result.width}x${result.height}`);
    }

    const manifest = Object.fromEntries(
      processed
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(({ id, width, height, widths }) => [id, { width, height, widths }]),
    );
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    console.log(`\nProcessed ${processed.length} photos into ${path.relative(rootDir, outputDir)}`);
    console.log(`Manifest written to ${path.relative(rootDir, manifestPath)}`);
  } finally {
    await rm(scratchDir, { recursive: true, force: true });
  }
}

await main();
