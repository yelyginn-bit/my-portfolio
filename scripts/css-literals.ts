/**
 * Храповик «литералы не растут» (QWEN-02 §2).
 *
 * Считает по каждому файлу три вещи:
 *   color       — hex / rgb() / rgba() / hsl() / hsla() вне объявлений `--токенов`
 *                 и вне комментариев;
 *   radius      — `border-radius` (и longhand) конкретным числом, то есть не `0`
 *                 и не `var(...)`;
 *   fontFamily  — литеральное `font-family`, не через `var(--ds-font-*)`.
 *
 * Файлы: все `*.css` в `src/` и `public/` плюс инлайн-блоки `<style>` HTML-входов
 * публичных страниц. Методика — та же, что в docs/audit/dark-theme-inventory.md §0.
 *
 * Что сознательно НЕ считается (чтобы храповик не ругался на шум):
 *   - объявления `--что-угодно: значение` — это сами токены, а не хардкод;
 *   - `transparent`, `currentColor`, `inherit` — не литералы палитры;
 *   - `@font-face` — там `font-family` определяет семейство, а не подменяет токен;
 *   - шортхенд `font:` — `font: 400 … Georgia, serif` с шрифтовым стеком внутри
 *     не разбирается (см. пример в design-system.css:943); при переходе на
 *     токены его править всё равно придётся, но сюда он не попадает;
 *   - инлайн-атрибуты `style="…"` в HTML — только блоки `<style>`;
 *   - классы `bb-*` — их проверяет свой тест из PROMPT-30, не дублируем.
 *
 * Запуск:   npx tsx scripts/css-literals.ts            — таблица в консоль
 *           npx tsx scripts/css-literals.ts --write    — перезаписать baseline
 * Проверка: npx tsx --test tests/css-literals.test.ts
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface LiteralCounts {
  color: number;
  radius: number;
  fontFamily: number;
  total: number;
}

export const BASELINE_PATH = "tests/fixtures/css-literals-baseline.json";

/** HTML-входы публичных страниц. Приватные (account/admin/gallery/journal),
 * 404 и файлы подтверждения прав владения доменом сюда не входят — у них свои
 * литералы, и в инвентаризации фазы 5 они не участвуют. */
export const PUBLIC_HTML_ENTRIES: readonly string[] = [
  "index.html",
  "ceny.html",
  "cvetokorrekciya.html",
  "legal.html",
  "calculator.html",
  "content-day.html",
  "event-video.html",
  "photo.html",
  "pryamye-translyacii.html",
  "reels.html",
  "reklamnye-roliki.html",
  "video-dlya-marketpleysov.html",
  "blog/kak-snimat-reels-dlya-biznesa.html",
  "blog/skolko-stoit-snyat-reklamnyy-rolik.html",
  "blog/video-dlya-kartochek-wildberries.html",
  "blog/videosemka-meropriyatiy-nn.html",
];

const HEX = /#[0-9a-fA-F]{3,8}\b/gu;
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?)\(/gu;

/** Убирает блочные комментарии, сохраняя count строк и длину текста посимвольно
 * (заглавляя содержимое), чтобы номера строк в находках не съезжали. */
function blankComments(text: string): string {
  let outStr = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const chunk = end === -1 ? text.slice(i) : text.slice(i, end + 2);
      outStr += chunk.replace(/[^\n]/gu, " ");
      i += chunk.length;
    } else {
      outStr += text[i];
      i += 1;
    }
  }
  return outStr;
}

interface LeafBlock {
  selector: string;
  body: string;
}

/** Возвращает листовые блоки `{ … }` вместе с их селектором (или препюлом
 * at-rule). Контейнеры вроде `@media { … }` сами блоком не считаются — их
 * вложенные правила возвращаются отдельными элементами массива. */
function findLeafBlocks(css: string): LeafBlock[] {
  const blocks: LeafBlock[] = [];
  let selectorStart = 0;
  const stack: { selector: string; bodyStart: number }[] = [];
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "{") {
      const raw = css.slice(selectorStart, i);
      stack.push({ selector: raw.trim().replace(/\s+/gu, " "), bodyStart: i + 1 });
      selectorStart = i + 1;
    } else if (ch === "}") {
      const top = stack.pop();
      if (top) {
        const body = css.slice(top.bodyStart, i);
        const nested = css.slice(top.bodyStart, i).includes("{");
        if (!nested) blocks.push({ selector: top.selector, body });
      }
      selectorStart = i + 1;
    }
  }
  return blocks;
}

function countInDeclarations(selector: string, body: string): LiteralCounts {
  const counts: LiteralCounts = { color: 0, radius: 0, fontFamily: 0, total: 0 };
  // @font-face объявляет семейства, а не подменяет токены — пропускаем.
  if (/^@font-face\b/iu.test(selector)) return counts;
  // Классы bb-* ведёт отдельный тест PROMPT-30.
  if (/\.bb-/u.test(selector)) return counts;

  for (const rawDecl of body.split(";")) {
    const decl = rawDecl.trim();
    if (!decl) continue;
    const colon = decl.indexOf(":");
    if (colon === -1) continue;
    const property = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (!property || !value) continue;
    // Объявление токена — источник значений темы, а не хардкод.
    if (property.startsWith("--")) continue;

    if (property === "font-family") {
      if (!value.includes("var(")) counts.fontFamily += 1;
      continue;
    }
    if (/^border(-top|-right|-bottom|-left)?-radius$/u.test(property)) {
      const isZero = value.split(/\s+/u).every((part) => /^0(?:px|rem|em)?$/u.test(part));
      if (!isZero && !value.includes("var(")) counts.radius += 1;
      continue;
    }

    const hex = (value.match(HEX) ?? []).filter((hexLiteral) => !isUrlFragment(value, hexLiteral));
    const functional = value.match(FUNCTIONAL_COLOR) ?? [];
    counts.color += hex.length + functional.length;
  }

  counts.total = counts.color + counts.radius + counts.fontFamily;
  return counts;
}

/** `url(#gradient)` — это ссылка на SVG-фильтр, а не цвет, хотя по форме
 * совпадает с трёхзначным hex. Отсекаем только тот случай, когда «hex»
 * стоит внутри url(). */
function isUrlFragment(value: string, hexLiteral: string): boolean {
  const at = value.indexOf(hexLiteral);
  if (at === -1) return false;
  const before = value.slice(Math.max(0, at - 40), at);
  return /url\(\s*["']?[^)]*$/iu.test(before);
}

export function analyzeCss(css: string): LiteralCounts {
  const blanked = blankComments(css);
  const totals: LiteralCounts = { color: 0, radius: 0, fontFamily: 0, total: 0 };
  for (const block of findLeafBlocks(blanked)) {
    const c = countInDeclarations(block.selector, block.body);
    totals.color += c.color;
    totals.radius += c.radius;
    totals.fontFamily += c.fontFamily;
  }
  // total пересчитываем в конце: у составных правил (напр. @media) доли складываются.
  totals.total = totals.color + totals.radius + totals.fontFamily;
  return totals;
}

function styleBlocksOf(html: string): string[] {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/giu)].map((m) => m[1]);
}

async function listCssFiles(rootDir: string, dir: string): Promise<string[]> {
  const entries = await readdir(path.join(rootDir, dir), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await listCssFiles(rootDir, relative)));
    else if (entry.name.endsWith(".css")) files.push(relative);
  }
  return files.sort();
}

/** Полный снимок: файл → количество литералов. */
export async function collectLiteralCounts(rootDir = process.cwd()): Promise<Record<string, LiteralCounts>> {
  const result: Record<string, LiteralCounts> = {};

  for (const dir of ["src", "public"]) {
    for (const file of await listCssFiles(rootDir, dir)) {
      result[file] = analyzeCss(await readFile(path.join(rootDir, file), "utf8"));
    }
  }

  for (const file of PUBLIC_HTML_ENTRIES) {
    const html = await readFile(path.join(rootDir, file), "utf8");
    const totals: LiteralCounts = { color: 0, radius: 0, fontFamily: 0, total: 0 };
    for (const block of styleBlocksOf(html)) {
      const c = analyzeCss(block);
      totals.color += c.color;
      totals.radius += c.radius;
      totals.fontFamily += c.fontFamily;
    }
    totals.total = totals.color + totals.radius + totals.fontFamily;
    result[`${file} <style>`] = totals;
  }

  return result;
}

const empty = (): LiteralCounts => ({ color: 0, radius: 0, fontFamily: 0, total: 0 });
export const addCounts = (a: LiteralCounts, b: LiteralCounts): LiteralCounts => ({
  color: a.color + b.color,
  radius: a.radius + b.radius,
  fontFamily: a.fontFamily + b.fontFamily,
  total: a.total + b.total,
});

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("css-literals.ts")) {
  const rootDir = process.cwd();
  const counts = await collectLiteralCounts(rootDir);
  const write = process.argv.includes("--write");
  if (write) {
    const target = path.join(rootDir, BASELINE_PATH);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(counts, null, 2)}\n`);
    console.log(`baseline записан: ${BASELINE_PATH} (${Object.keys(counts).length} файлов)`);
  } else {
    let sum = empty();
    for (const [file, c] of Object.entries(counts).sort((a, b) => b[1].total - a[1].total)) {
      sum = addCounts(sum, c);
      console.log(`${String(c.total).padStart(4)}  color=${String(c.color).padStart(3)} radius=${String(c.radius).padStart(3)} family=${String(c.fontFamily).padStart(2)}  ${file}`);
    }
    console.log(`\nвсего: color=${sum.color} radius=${sum.radius} font-family=${sum.fontFamily} → ${sum.total}`);
  }
}
