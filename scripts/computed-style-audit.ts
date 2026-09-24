/**
 * Снятие ВЫЧИСЛЕННЫХ стилей с localhost (QWEN-02 §4).
 *
 * Зачем: docs/audit/dark-theme-inventory.md §5.1 оставил открытый вопрос —
 * перекрывает ли `public/site-skin.css` локальный `:root` статических страниц.
 * По исходнику это не решить: `docs/SITE-HANDOFF.md:452-455` требует
 * `getComputedStyle`, потому что в этом проекте объявленное не всегда доходит
 * до рендера (слои `!important`, специфичность, порядок подключения).
 *
 * Живой сайт не открывается никогда: поднимается статический сервер из `dist/`
 * и все замеры идут только на 127.0.0.1.
 *
 * Запуск:
 *   npm run build
 *   npx tsx scripts/computed-style-audit.ts                 — всё, нужен playwright
 *   npx tsx scripts/computed-style-audit.ts --serve-only    — только сервер (для ручной проверки)
 *   npx tsx scripts/computed-style-audit.ts --out data.json — сохранить замеры в JSON
 *
 * Playwright в devDependencies проекта НЕТ и специально не добавляется
 * (QWEN-02 §4.1). Браузер ставит тот, кто принимает работу: `npx playwright
 * install chromium`. Без него скрипт печатает понятное сообщение и выходит.
 */
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";
import { contrastRatio } from "./contrast.ts";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const WIDTHS = [1440, 390] as const;

/** Что снимаем у каждого маршрута. */
const PROBES: ReadonlyArray<{ label: string; selector: string }> = [
  { label: "html", selector: "html" },
  { label: "body", selector: "body" },
  { label: "шапка", selector: "header" },
  { label: "подвал", selector: "footer" },
  { label: "h1", selector: "h1" },
  { label: "кер/.eyebrow", selector: ".eyebrow, .v3-kicker, .ds-eyebrow, .calc-eyebrow, [class*='kicker']" },
  { label: "кнопка", selector: "button, .cta, .v3-button, .calc-cta, .site-static-header__cta, a[href='/contact']" },
];

/** Статическая отдача dist/ с той же логикой выбора файла, что у
 * server/production-server.js: сначала пре-рендер маршрута, потом plain HTML. */
async function resolveFile(urlPath: string): Promise<string | null> {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/u, "") || "/";
  const rel = clean === "/" ? "" : clean.slice(1);
  const candidates = [
    // Сначала литеральный путь: /tokens.css и /site-shell.js — это ассеты, и
    // без этой строки они уезжают в 404, а страница молча рендерится без
    // общих стилей. Именно так и рождается фейковый «вычисленный стиль».
    rel ? path.join(DIST, rel) : path.join(DIST, "index.html"),
    path.join(DIST, "prerender", rel, "index.html"),
    rel ? path.join(DIST, rel, "index.html") : path.join(DIST, "index.html"),
    rel ? path.join(DIST, `${rel}.html`) : path.join(DIST, "index.html"),
  ];
  for (const candidate of candidates) {
    // Сервер локальный, но путь приходит из URL — не даём выйти за пределы dist/.
    if (path.relative(DIST, candidate).startsWith("..")) continue;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* пробуем следующий кандидат */
    }
  }
  return null;
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

export function startLocalServer(): Promise<{ server: Server; origin: string }> {
  return new Promise((resolve, reject) => {
    const handler = async (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => {
      const url = req.url ?? "/";
      const target = await resolveFile(url);
      if (!target) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("нет файла в dist/ — сначала npm run build");
        return;
      }
      const type = TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream";
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(await readFile(target));
    };
    // порт 0 = свободный порт от ОС; ipv4 explicitly — живой сайт не трогаем
    const server = createServer(handler).listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        resolve({ server, origin: `http://127.0.0.1:${address.port}` });
      } else {
        reject(new Error("не удалось получить порт локального сервера"));
      }
    });
    server.on("error", reject);
  });
}

/** rgb()/rgba() из getComputedStyle → hex для сравнения контраста. */
export function toHex(color: string): string | null {
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/u);
  if (!m) return /^#[0-9a-fA-F]{6}$/u.test(color) ? color : null;
  if (m[4] !== undefined && Number(m[4]) === 0) return null; // fully transparent
  const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`.toUpperCase();
}

export function rgbStringsMatch(a: string, b: string): boolean {
  const ha = toHex(a);
  const hb = toHex(b);
  return ha !== null && ha === hb;
}

/** Что снято с одного элемента. Набор свойств — под §3 «снимок до/после»:
 * цвет, фон, шрифт, размер, скругление, отступы. */
interface ProbeSample {
  label: string;
  selector: string;
  found: boolean;
  color: string;
  background: string;
  backgroundImage: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  borderRadius: string;
  padding: string;
  margin: string;
  contrast: number | null;
}

/** Состояние :hover / :focus-visible одного интерактивного элемента. */
export interface StateSample {
  what: string;
  color: string;
  background: string;
  outline: string;
  opacity: string;
  contrast: number | null;
}

export interface RouteAudit {
  route: string;
  width: number;
  bodyBackgroundImage: string;
  scrollOverflow: boolean | null;
  scrollWidth: number;
  clientWidth: number;
  offscreen: Array<{ tag: string; cls: string; left: number; right: number }>;
  menuItems: Array<{ text: string; color: string; background: string; contrast: number | null }> | null;
  states: Array<{ label: string; states: Record<string, StateSample> }>;
  probes: ProbeSample[];
}

/** Минимальный профиль страницы Playwright, нужный этому скрипту. Держится
 * структурным типом, а не `import type` — чтобы скрипт оставался запускаемым
 * там, где playwright не установлен (в CI без бинаря браузера). */
interface PageLike {
  setViewportSize(options: { width: number; height: number }): Promise<void>;
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  waitForFunction(
    fn: () => boolean,
    arg?: unknown,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  evaluate<T>(fn: (...args: never[]) => T, ...args: unknown[]): Promise<T>;
  click(selector: string): Promise<void>;
  hover(selector: string): Promise<void>;
  focus(selector: string): Promise<void>;
  $$eval<R>(selector: string, fn: (els: never[]) => R): Promise<R>;
  mouse: { move(x: number, y: number): Promise<void> };
}

interface StateRead {
  color: string;
  background: string;
  outline: string;
  opacity: string;
  focusVisible: boolean;
}

/** Снимаем :hover и :focus-visible у немногих интерактивных элементов —
 * полного покрытия 70 маршрутов он не требует, а ловит как раз то, что
 * в QWEN-02 осталось за кадром (§6 «что осталось непроверенным»). */
const STATE_TARGETS: ReadonlyArray<{ label: string; selector: string }> = [
  { label: "ссылка навигации", selector: "header nav a, .site-static-nav > a, .ds-nav a, .v3-nav__links a, .calc-nav a, nav a" },
  { label: "кнопка/CTA", selector: ".cta, .v3-button, .calc-cta, .site-static-header__cta, .ds-header-cta, button" },
  { label: "ссылка футера", selector: "footer a, .site-static-footer a, .ds-footer a, .calc-footer a, .v3-footer a" },
];

interface GeometryResult {
  bodyBackgroundImage: string;
  scrollWidth: number;
  clientWidth: number;
  offscreen: Array<{ tag: string; cls: string; left: number; right: number }>;
}

interface MenuLinkResult {
  text: string;
  color: string;
  background: string;
}

const MENU_BUTTON_SELECTOR = ".ds-menu-button, .site-static-menu-button, .v3-nav__menu, button[aria-controls*='menu' i], button[aria-label*='меню' i]";
const MENU_LINKS_SELECTOR = "#site-mobile-menu a, .ds-mobile-menu a, .v3-mobile-menu a, [id*='mobile-menu' i] a, [class*='mobile-menu' i] a";

/** Условие «страница в покое»: ни одной конечной во времени анимации,
 * играющей сейчас. Бесконечные (бегущая строка) и scroll-driven (градиент
 * `.v3-work` на главной) не ждём — они не заканчиваются, а их текущий кадр и
 * есть обычное состояние. */
const isSettled = () =>
  (document.getAnimations ? document.getAnimations() : []).every(
    (a) =>
      a.playState !== "running" ||
      a.timeline !== document.timeline ||
      (a.effect && a.effect.getTiming().iterations === Infinity),
  );

/** Снимок сразу после «load» — это середина перехода. На /content-day в момент
 * load играёт 33 анимации, и getComputedStyle отдал стартовое значение
 * rgba(10,10,10,.72) вместо итогового --site-muted (#5f5f59), хотя класс
 * body.site-static уже висел. Разница между двумя прогонами выглядела как
 * регрессия правки, а была замером тайминга — отсюда это ожидание. Timeout не
 * роняет прогон: страница с вечно играющей анимацией просто измерится как есть. */
async function waitForSettled(page: PageLike) {
  await page.waitForFunction(isSettled, null, { timeout: 2500 }).catch(() => {});
}

/** Один проход по маршруту в контексте страницы Playwright. */
export async function auditPage(
  page: PageLike,
  origin: string,
  route: string,
  width: number,
): Promise<RouteAudit> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${origin}${route}`, { waitUntil: "load" });
  await waitForSettled(page);

  const probes = await page.evaluate((labels: typeof PROBES) => labels.map((p) => {
    const el = document.querySelector(p.selector);
    const empty = { label: p.label, selector: p.selector, found: false, color: "", background: "", backgroundImage: "", fontFamily: "", fontSize: "", fontWeight: "", borderRadius: "", padding: "", margin: "", contrast: null };
    if (!el) return empty;
    const cs = getComputedStyle(el);
    return { label: p.label, selector: p.selector, found: true, color: cs.color, background: cs.backgroundColor, backgroundImage: cs.backgroundImage, fontFamily: cs.fontFamily.slice(0, 40), fontSize: cs.fontSize, fontWeight: cs.fontWeight, borderRadius: cs.borderRadius, padding: cs.padding, margin: cs.margin, contrast: null };
  }), PROBES);

  const geometry = await page.evaluate((): GeometryResult => ({
    bodyBackgroundImage: getComputedStyle(document.body).backgroundImage,
    scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
    clientWidth: document.scrollingElement?.clientWidth ?? 0,
    offscreen: Array.from(document.querySelectorAll("body *"))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 1 && (r.left < -1 || r.right > window.innerWidth + 1) && getComputedStyle(el).position !== "fixed")
      .slice(0, 25)
      .map(({ el, r }) => ({ tag: el.tagName.toLowerCase(), cls: (el.className || "").toString().slice(0, 60), left: Math.round(r.left), right: Math.round(r.right) })),
  }));

  let menuItems: RouteAudit["menuItems"] = null;
  if (width === 390) {
    const hasMenuButton = await page.evaluate((selector: string) => Boolean(document.querySelector(selector)), MENU_BUTTON_SELECTOR);
    if (hasMenuButton) {
      await page.click(MENU_BUTTON_SELECTOR);
      await waitForSettled(page);
      const links = await page.$$eval(MENU_LINKS_SELECTOR, (els: never[]) => (els as HTMLAnchorElement[]).map((a): MenuLinkResult => {
        const cs = getComputedStyle(a);
        return { text: a.textContent?.trim().slice(0, 24) ?? "", color: cs.color, background: cs.backgroundColor };
      }));
      menuItems = links.map((link) => {
        const fg = toHex(link.color);
        const bg = toHex(link.background);
        return { ...link, contrast: fg && bg ? Number(contrastRatio(fg, bg).toFixed(2)) : null };
      });
    }
  }

  const states: RouteAudit["states"] = [];
  for (const target of STATE_TARGETS) {
    const exists = await page.evaluate((selector: string) => Boolean(document.querySelector(selector)), target.selector);
    if (!exists) continue;
    // Ждём дозавершения перехода перед каждой меркой, иначе снимается середина
    // анимации цвета.
    const read = async (): Promise<StateRead | null> => {
      await waitForSettled(page);
      return page.evaluate((selector: string): StateRead | null => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const cs = getComputedStyle(el);
        let focusVisible = false;
        try { focusVisible = el.matches(":focus-visible"); } catch { focusVisible = false; }
        return { color: cs.color, background: cs.backgroundColor, outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, opacity: cs.opacity, focusVisible };
      }, target.selector);
    };
    // Курсор остаётся на элементе после page.hover(), поэтому перед меркой
    // «обычное» следующей цели мышь уводится — иначе обычный_state читался бы в
    // :hover. Для hover/focus этот шаг наоборот запрещён.
    const away = () => page.mouse.move(0, 0);

    const found: Record<string, StateSample> = {};
    const keep = (name: string, r: StateRead | null) => {
      if (!r) return;
      const fg = toHex(r.color);
      const bg = toHex(r.background);
      found[name] = { what: target.label, color: r.color, background: r.background, outline: r.outline, opacity: r.opacity, contrast: fg && bg ? Number(contrastRatio(fg, bg).toFixed(2)) : null };
    };

    await away();
    keep("обычное", await read());
    try { await page.hover(target.selector); keep("hover", await read()); } catch { /* элемент мог быть перекрыт — не повод ронять прогон */ }
    try { await page.focus(target.selector); const r = await read(); keep(r?.focusVisible ? "focus-visible" : "focus (не visible)", r); } catch { /* то же */ }
    if (Object.keys(found).length) states.push({ label: target.label, states: found });
  }

  return {
    route,
    width,
    bodyBackgroundImage: geometry.bodyBackgroundImage,
    scrollOverflow: width === 390 ? geometry.scrollWidth > geometry.clientWidth + 1 : null,
    scrollWidth: geometry.scrollWidth,
    clientWidth: geometry.clientWidth,
    offscreen: width === 390 ? geometry.offscreen : [],
    menuItems,
    states,
    probes: (probes as ProbeSample[]).map((p) => {
      const bg = toHex(p.background);
      const fg = toHex(p.color);
      return { ...p, contrast: bg && fg ? Number(contrastRatio(fg, bg).toFixed(2)) : null };
    }),
  };
}

async function loadPlaywright(): Promise<{ chromium: { launch: (o: Record<string, unknown>) => Promise<unknown> } }> {
  const name = "playwright"; // не литерал — иначе tsc падает на отсутствующем модуле
  try {
    return await import(name) as { chromium: { launch: (o: Record<string, unknown>) => Promise<unknown> } };
  } catch {
    throw new Error(
      "Playwright не установлен (в проекте его нет намеренно — QWEN-02 §4.1).\n"
      + "Установка: npm i -D playwright && npx playwright install chromium\n"
      + "Локальный сервер без браузера: npx tsx scripts/computed-style-audit.ts --serve-only",
    );
  }
}

function renderMarkdown(audits: RouteAudit[]): string {
  const lines = [
    "# Вычисленные стили по маршрутам (автогенерация)",
    "",
    "Скрипт: `scripts/computed-style-audit.ts`. Источник — только localhost, `dist/` после `npm run build`.",
    "",
    "| маршрут | px | body bg | body color | h1 color | кнопка bg/color | фон с картинкой? | переполнение |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const a of audits) {
    const get = (label: string) => a.probes.find((p) => p.label === label);
    const body = get("body");
    const h1 = get("h1");
    const btn = get("кнопка");
    lines.push(
      `| \`${a.route}\` | ${a.width} | ${body?.background ?? "—"} | ${body?.color ?? "—"} | ${h1?.color ?? "—"} | `
      + `${btn?.background ?? "—"} / ${btn?.color ?? "—"} | `
      + `${a.bodyBackgroundImage && a.bodyBackgroundImage !== "none" ? "есть" : "нет"} | `
      + `${a.scrollOverflow === null ? "—" : a.scrollOverflow ? "ДА" : "нет"} |`,
    );
  }
  const lowContrast: string[] = [];
  for (const a of audits) {
    for (const p of a.probes) {
      if (p.found && p.contrast !== null && p.contrast < 4.5) {
        lowContrast.push(`| \`${a.route}\` | ${a.width} | ${p.label} | ${p.color} на ${p.background} | ${p.contrast} |`);
      }
    }
    for (const m of a.menuItems ?? []) {
      const hexBg = toHex(m.background);
      const hexFg = toHex(m.color);
      const c = hexBg && hexFg ? Number(contrastRatio(hexFg, hexBg).toFixed(2)) : null;
      if (c !== null && c < 4.5) lowContrast.push(`| \`${a.route}\` | ${a.width} | меню «${m.text}» | ${m.color} на ${m.background} | ${c} |`);
    }
  }
  lines.push("", "## Пары с контрастом ниже 4.5", "", "| маршрут | px | элемент | цвета | контраст |", "|---|---|---|---|---|", ...(lowContrast.length ? lowContrast : ["| — | — | — | — | — |"]));
  const overflow = audits.filter((a) => a.scrollOverflow || a.offscreen.length);
  lines.push("", "## Мобильная ширина: вылезание за экран", "");
  if (!overflow.length) lines.push("Нет ни переполнения, ни элементов за краями.");
  for (const a of overflow) {
    lines.push(`- \`${a.route}\` @${a.width}: scrollWidth ${a.scrollWidth} против clientWidth ${a.clientWidth}`);
    for (const o of a.offscreen.slice(0, 6)) lines.push(`    · <${o.tag} class="${o.cls}"> left=${o.left} right=${o.right}`);
  }

  lines.push("", "## Открытое мобильное меню (390px)", "", "| маршрут | пункт | цвет | фон | контраст |", "|---|---|---|---|---|");
  const menuRows = audits.filter((a) => a.menuItems?.length);
  if (!menuRows.length) lines.push("| — | ни на одном маршруте не нашлось кнопки меню | | | |");
  for (const a of menuRows) {
    for (const m of a.menuItems ?? []) {
      lines.push(`| \`${a.route}\` | ${m.text} | ${m.color} | ${m.background} | ${m.contrast ?? "—"} |`);
    }
  }

  lines.push("", "## Состояния :hover и :focus-visible", "",
    "| маршрут | px | элемент | состояние | цвет | фон | outline | контраст |", "|---|---|---|---|---|---|---|---|");
  const stateRows = audits.filter((a) => a.states.length);
  if (!stateRows.length) lines.push("| — | — | состояний не снято | | | | | |");
  for (const a of stateRows) {
    for (const s of a.states) {
      for (const [name, v] of Object.entries(s.states)) {
        lines.push(`| \`${a.route}\` | ${a.width} | ${s.label} | ${name} | ${v.color} | ${v.background} | ${v.outline} | ${v.contrast ?? "—"} |`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("computed-style-audit.ts")) {
  const { server, origin } = await startLocalServer();
  console.log(`локальный сервер: ${origin} (живой сайт не открывается)`);

  if (process.argv.includes("--serve-only")) {
    console.log("режим --serve-only: сервер держится, Ctrl+C чтобы остановить");
    await new Promise<void>((r) => { server.on("close", r); process.once("SIGINT", () => server.close()); });
    process.exit(0);
  }

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true }) as {
    newPage: () => Promise<Parameters<typeof auditPage>[0]>;
    close: () => Promise<void>;
  };
  const page = await browser.newPage();
  const audits: RouteAudit[] = [];
  // --only <подстрока> — прогон части маршрутов: точечная перепроверка после
  // правки одной страницы, а не всех 70 (полный прогон занимает ~30 минут).
  const at = process.argv.indexOf("--only");
  const only = at !== -1 ? process.argv[at + 1] : undefined;
  const routes = INDEXABLE_ROUTES.map((r) => r.path).filter((r) => !only || r.includes(only));
  for (const route of routes) {
    for (const width of WIDTHS) {
      try {
        audits.push(await auditPage(page, origin, route, width));
        process.stdout.write(".");
      } catch (error) {
        console.warn(`\n${route} @${width}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
  console.log("");

  const out = process.argv.indexOf("--out");
  if (out !== -1 && process.argv[out + 1]) {
    await writeFile(path.resolve(process.argv[out + 1] as string), `${JSON.stringify(audits, null, 2)}\n`);
  }
  const report = process.argv.indexOf("--report");
  const target = report !== -1 && process.argv[report + 1] ? path.resolve(process.argv[report + 1] as string) : "docs/audit/computed-style.auto.md";
  await writeFile(target, renderMarkdown(audits));
  console.log(`замеров: ${audits.length}, отчёт: ${target}`);

  await browser.close();
  server.close();
}
