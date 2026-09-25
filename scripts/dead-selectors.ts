/**
 * В — «мёртвые правила stylesheet'а по отрендеренной разметке» (QWEN-06 §1 В).
 *
 * Почему это отдельный инструмент, а не grep: «правило не нужно» означает, что
 * ни один его селектор не находит узел ни на одной странице, И ни один его
 * класс не появляется в коде, который может дорисовать DOM после загрузки
 * (React, site-shell.js, приватные страницы за авторизацией). Первое считается
 * только в браузере, второе — только по исходникам.
 *
 * Запуск:
 *   npm run build
 *   npx tsx scripts/dead-selectors.ts --css src/design-system.css
 *   npx tsx scripts/dead-selectors.ts --css src/index.css --routes /ceny,/cvetokorrekciya
 *   npx tsx scripts/dead-selectors.ts --css src/v3-polish.css --widths 1440
 *
 * Выход: таблица в stdout + полный TSV в .night-shots/dead-<имя>.tsv.
 * Ничего не удаляет: решение о правке — за тем, кто читает отчёт.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : def;
};

const CSS = arg("css", "src/design-system.css");
const WIDTHS = arg("widths", "1440,390").split(",").map(Number);
const OUT = path.join(ROOT, ".night-shots", `dead-${path.basename(CSS)}.tsv`);

/** Комментарии вырезаем посимвольно и с сохранением длин, чтобы номера строк
 * не съехали: replace("/* … *​/", пробелы, кроме переводов строки). */
function blankComments(text: string) {
  const out = text.split("");
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i] === "/" && out[i + 1] === "*") {
      let j = i + 2;
      while (j < out.length && !(out[j] === "*" && out[j + 1] === "/")) { if (out[j] !== "\n") out[j] = " "; j++; }
      out[i] = " "; out[i + 1] = " ";
      if (out[j] === "*") out[j] = " ";
      if (out[j + 1] === "/") out[j + 1] = " ";
      i = j + 1;
    }
  }
  return out.join("");
}

interface Rule { selector: string; line: number; media: string }

/** Обход со стеком скобок. @layer обязателен в списке рекурсии: без него
 * из замера молча выпадают все правила внутри @layer base/utilities — на этом
 * же месте QWEN-05 потерял 25 правил и выдал «448 вместо 473». */
function parseRules(cssText: string): Rule[] {
  const clean = blankComments(cssText);
  const rules: Rule[] = [];
  (function walk(text: string, off: number, media: string) {
    let i = 0, buf = "";
    while (i < text.length) {
      const ch = text[i];
      if (ch === "{") {
        const selector = buf.replace(/\s+/g, " ").trim();
        let depth = 1, j = i + 1;
        while (j < text.length && depth > 0) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; j++; }
        const body = text.slice(i + 1, j - 1);
        if (selector.startsWith("@")) {
          if (/^@(keyframes|font-face|supports|media|layer)/.test(selector)) {
            walk(body, off + i + 1, selector.startsWith("@media") ? selector : media);
          }
        } else if (selector && !selector.split(",").every((s) => /^(from|to|[0-9.]+%)$/.test(s.trim()))) {
          rules.push({ selector, line: clean.slice(0, Math.max(0, off + i - buf.length)).split("\n").length, media });
        }
        buf = ""; i = j; continue;
      }
      if (ch === "}") { buf = ""; i++; continue; }
      buf += ch; i++;
    }
  })(clean, 0, "");
  return rules;
}

/** Все исходники, способные породить класс в DOM: React, ванильный JS шаблонов
 * и хрома, HTML-файлы (и в корне, и в dist — вторые уже сгенерированы), сервер.
 * CSS-файлы считаем отдельно: упоминание имени в чужом stylesheet'е — это не
 * потребитель, это копия правила. node_modules/dist-ассеты — не в счёт. */
function collectSources() {
  const code = new Map<string, string>();
  const css = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git"].includes(entry.name) || entry.name.startsWith(".night")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (full !== path.join(ROOT, "dist")) walk(full); continue; }
      const rel = path.relative(ROOT, full).split(path.sep).join("/");
      if (rel === CSS) continue;
      // Сам измеритель вне списка: в его комментариях живут примеры вроде
      // «.hero-title», и они считались бы потребителями правил.
      if (rel.endsWith("dead-selectors.ts")) continue;
      // dist целиком вне списка: там собранные HTML и CSS, и любой мёртвый
      // селектор нашёл бы «копию» в собственном скомпилированном файле.
      if (rel.startsWith("dist/")) continue;
      let text: string;
      try { text = fs.readFileSync(full, "utf8"); } catch { continue; }
      if (/\.(tsx?|jsx?|html)$/.test(entry.name)) code.set(rel, text);
      else if (/\.css$/.test(entry.name)) css.set(rel, text);
    }
  };
  walk(ROOT);
  return { code, css };
}

const rules = parseRules(fs.readFileSync(path.join(ROOT, CSS), "utf8"));
const selectorTexts = [...new Set(rules.flatMap((r) => r.selector.split(",").map((s) => s.trim())))];
const { code, css: cssFiles } = collectSources();

/** Ищем класс как отдельное слово (границы — кавычка, пробел, {, <, =, :, `,
 * запятая), чтобы `.hero-title` не находился на «hero-title-large». Обратный
 * апостроф обязателен: в React имена живут в шаблонных строках
 * (`className={`ds-grid ${className}`}`, Layout.tsx:36), и без него живой
 * класс выглядел бы мёртвым. Точка сознательно НЕ граница слева: упоминание в
 * чужом CSS — это копия правила, а не потребитель (см. cssCopies). */
const inSet = (set: Map<string, string>, name: string) => {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bt = "`";
  const re = new RegExp("(^|[\"'\\s{}<>=:" + bt + "])" + esc + "(?=$|[\"'\\s{}<>=:,.])", "m");
  const hits: string[] = [];
  for (const [file, text] of set) if (re.test(text)) hits.push(file);
  return hits;
};

/** В CSS имя класса всегда стоит с точкой, и граница «.» в поиск выше не
 * попадает — поэтому для чужих копий отдельный запрос: `.имя`, не продолжение
 * («.hero-title» не должен находиться на «.hero-title-large»). */
const cssCopies = (name: string) => {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\.${esc}(?![\\w-])`);
  const hits: string[] = [];
  for (const [file, text] of cssFiles) if (re.test(text)) hits.push(file);
  return hits;
};

const { chromium } = await import("playwright").catch(() => ({ chromium: null })) as any;
if (!chromium) { console.error("нет playwright — npx playwright install chromium"); process.exit(1); }

const { startLocalServer } = await import("../scripts/computed-style-audit.ts");
const { ROUTE_MANIFEST } = await import("../src/public/routeManifest.ts");
/** --routes /a,/b — ограничить список страниц. Нужно для файлов, которые
 * грузятся не везде: `src/index.css` подключён только к `/ceny` и
 * `/cvetokorrekciya`, и мерить его по всем 75 маршрутам было бы слишком
 * щедро — селектор, живущий на чужой странице, этому файлу ничего не должен. */
const only = arg("routes", "");
const wanted = only ? new Set(only.split(",").map((s: string) => s.trim())) : null;
const routes = ROUTE_MANIFEST.filter((r: { render: string }) => r.render !== "redirect")
  .filter((r: { path: string }) => !wanted || wanted.has(r.path));
if (!routes.length) { console.error(`--routes не совпал ни с одним маршрутом: ${only}`); process.exit(1); }

const { server, origin } = await startLocalServer();
const browser = await chromium.launch({ headless: true });
const seen: Record<string, number> = {};
const pagesByRoute: Record<string, number> = {};
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
      deviceScaleFactor: width === 390 ? 3 : 1,
    });
    const page = await context.newPage();
    for (const route of routes) {
      try {
        await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
        await page.waitForTimeout(width === 390 ? 900 : 700);
        const counts = await page.evaluate(
          `(${function (sels: string[]) { const o: Record<string, number> = {}; for (const x of sels) { try { o[x] = document.querySelectorAll(x).length; } catch (e) { o[x] = -1; } } return o; }})(${JSON.stringify(selectorTexts)})`,
        ) as Record<string, number>;
        pagesByRoute[route.path] = await page.evaluate(`document.querySelectorAll("body *").length`);
        for (const [k, v] of Object.entries(counts)) seen[k] = Math.max(seen[k] ?? 0, v);
      } catch (error) {
        console.log(`НЕ ОТКРЫЛСЯ ${route.path}: ${String(error).slice(0, 50)}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

interface Row { verdict: string; line: number; media: string; selector: string; evidence: string }
const rows: Row[] = [];
for (const rule of rules) {
  const parts = rule.selector.split(",").map((s) => s.trim()).filter(Boolean);
  const classParts = parts.filter((s) => /\.[A-Za-z_-]/.test(s));
  if (!classParts.length) continue; // элементный/атрибутный — не наш случай
  const alive = parts.some((s) => (seen[s] ?? 0) > 0);
  if (alive) continue;
  const names = [...new Set(parts.flatMap((s) => [...s.matchAll(/\.([A-Za-z][-\w]*)/g)].map((m) => m[1].replace(/\\/g, ""))))];
  const inCode = names.map((n) => ({ n, files: inSet(code, n) })).filter((x) => x.files.length);
  const inCss = names.map((n) => ({ n, files: cssCopies(n) })).filter((x) => x.files.length);
  const unverifiable = parts.some((s) => seen[s] === -1);
  const verdict = unverifiable ? "не проверяемо (браузер отверг селектор)"
    : inCode.length ? "в DOM нет, но имя есть в коде — появляется по действию или на приватной странице"
    : inCss.length ? "копия: ни узла, ни имени в коде, но такое же правило есть в другом CSS"
    : "мёртв: ни узла, ни имени в коде, ни копии в другом CSS";
  rows.push({
    verdict, line: rule.line, media: rule.media, selector: rule.selector,
    evidence: (inCode.length ? inCode.map((x) => `${x.n}: ${x.files.slice(0, 3).join(", ")}`).join(" | ")
      : inCss.map((x) => `${x.n}: ${x.files.slice(0, 3).join(", ")}`).join(" | ")),
  });
}

const byVerdict: Record<string, number> = {};
for (const r of rows) byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, rows.map((r) => [r.verdict, r.line, r.media, r.selector, r.evidence].join("\t")).join("\n") + "\n");

console.log(JSON.stringify({
  файл: CSS,
  строк_в_файле: fs.readFileSync(path.join(ROOT, CSS), "utf8").split("\n").length,
  байт: fs.statSync(path.join(ROOT, CSS)).size,
  всего_правил: rules.length,
  правил_с_классами: rules.filter((r) => /\.[A-Za-z_-]/.test(r.selector)).length,
  маршрутов_просмотрено: Object.keys(pagesByRoute).length,
  ширин: WIDTHS,
  сводка: byVerdict,
}, null, 1));
console.log("\n=== мёртв целиком (нет ни узла, ни имени в коде, ни копии) ===");
for (const r of rows.filter((x) => x.verdict.startsWith("мёртв"))) {
  console.log(`:${r.line}${r.media ? ` [${r.media}]` : ""}  ${r.selector.slice(0, 90)}`);
}
console.log(`\nполный список: ${path.relative(ROOT, OUT)} (${rows.length} строк)`);
