/**
 * Разорванные слова (PROMPT-36 §1, правило владельца).
 *
 * Слово либо целиком стоит на своей строке, либо его переносят целиком на
 * следующую. Перенос посреди слова — с дефисом (`hyphens: auto`) или без него
 * (`overflow-wrap: anywhere / break-word`) — не допускается нигде на сайте:
 * правится кегль, а не место разрыва.
 *
 * Как меряем. По каждому текстовому узлу страницы идём по «словам» (куски без
 * пробелов; после дефиса, тире или слэша перенос естественный — «Санкт-Петербург»
 * может встать на две строки, разрывом это не считается). Для каждого слова
 * берём Range и его `getClientRects()`: один прямоугольник на каждую строку,
 * куда слово попало. Если у слова прямоугольники стоят на разных строках
 * (top разъехались больше чем на полвысоты) — слово разорвано.
 *
 * Запуск (нужен `npm run build` и chromium у Playwright):
 *   npx tsx scripts/word-breaks.ts                — сводка по 70 маршрутам × 4 ширины
 *   npx tsx scripts/word-breaks.ts --route /reels — один маршрут
 */
import { chromium } from "playwright";
import { startLocalServer } from "./computed-style-audit.ts";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";

export const WORD_BREAK_WIDTHS = [1440, 1200, 768, 390] as const;

export interface WordBreakResult {
  words: number;
  /** слово разорвано между строками */
  breaks: number;
  /** слово целиком, но выходит за правый край окна (кегль велик для колонки) */
  overflows: number;
  offenders: string[];
}

/** Выполняется внутри страницы. Строка, а не функция: tsx не должен
 * преобразовывать её под другой рантайм. */
export const WORD_BREAK_FN = `() => {
  const SKIP = /(marquee|ticker)/i;
  const HYPHENS = "-/\\u2010\\u2011\\u2012\\u2013\\u2014";
  const skipEl = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const tag = n.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA" || tag === "OPTION") return true;
      const cls = n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className;
      if (SKIP.test(String(cls || ""))) return true;
    }
    return false;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const offenders = [];
  let words = 0, breaks = 0, overflows = 0;
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!el || skipEl(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (cs.whiteSpace === "pre" || cs.whiteSpace === "nowrap") continue;
    const text = node.textContent || "";
    for (const m of text.matchAll(/\\S+/g)) {
      // куски слова между «естественными» местами переноса: после дефиса/тире
      const parts = [];
      let from = m.index;
      for (let i = 0; i < m[0].length - 1; i++) {
        if (HYPHENS.includes(m[0][i])) { parts.push([from, m.index + i + 1]); from = m.index + i + 1; }
      }
      parts.push([from, m.index + m[0].length]);
      for (const [a, b] of parts) {
        if (b - a < 2) continue;
        range.setStart(node, a); range.setEnd(node, b);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
        if (!rects.length) continue;
        words++;
        // слово целиком, но за правым краем окна или своего обрезающего
        // блока: не разрыв, а переполнение. Блок с прокруткой (таблица с
        // overflow-x:auto) — намеренно, его пропускаем.
        const right = Math.max(...rects.map((r) => r.right));
        let limit = document.documentElement.clientWidth, scrolls = false;
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") { scrolls = true; break; }
          if (ox === "hidden" || ox === "clip") { limit = Math.min(limit, n.getBoundingClientRect().right); }
        }
        // у заголовков — и за правым краем собственного блока (ближайший
        // не-inline предок): слово целиком, но шире колонки — вылезет на соседа.
        // Мелкий текст интерфейса этой мерой не проверяем.
        const heading = !!el.closest("h1, h2, h3");
        let blk = el;
        while (blk && blk !== document.body && getComputedStyle(blk).display.startsWith("inline")) blk = blk.parentElement;
        const bs = blk ? getComputedStyle(blk) : null;
        const blockRight = blk && bs ? blk.getBoundingClientRect().right - parseFloat(bs.paddingRight || "0") - parseFloat(bs.borderRightWidth || "0") : Infinity;
        if (!scrolls && cs.position !== "fixed" && (right > limit + 1 || (heading && right > blockRight + 1.5))) {
          overflows++;
          if (offenders.length < 30) offenders.push("ЗА КРАЕМ " + el.tagName.toLowerCase() + " «" + text.slice(a, b) + "» " + cs.fontSize + " (правый край " + Math.round(right) + ", окно " + Math.round(limit) + ", блок " + Math.round(blockRight) + ")");
        }
        const tops = rects.map((r) => r.top);
        const minH = Math.min(...rects.map((r) => r.height));
        if (Math.max(...tops) - Math.min(...tops) > minH * 0.5) {
          breaks++;
          if (offenders.length < 30) {
            offenders.push(el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "") +
              " «" + text.slice(a, b) + "» " + cs.fontSize + " в «" + text.trim().slice(0, 40) + "»");
          }
        }
      }
    }
  }
  return { words, breaks, overflows, offenders };
}`;

/** Один прогон одной страницы. */
export async function measureWordBreaks(page: import("playwright").Page): Promise<WordBreakResult> {
  // конечные анимации доигрываем: иначе меряем середину перехода
  await page.evaluate(`Promise.all((document.getAnimations ? document.getAnimations() : [])
    .filter((a) => a.playState === "running" && (!a.effect || a.effect.getTiming().iterations !== Infinity) && a.timeline === document.timeline)
    .map((a) => a.finished.catch(() => {})))`);
  return await page.evaluate(`(${WORD_BREAK_FN})()`) as WordBreakResult;
}

export const contextFor = (width: number) => ({
  viewport: { width, height: width <= 390 ? 844 : width <= 768 ? 1024 : 900 },
  // как на телефоне: в десктопном контексте скроллбар съедает 15px
  isMobile: width <= 390,
  hasTouch: width <= 390,
  deviceScaleFactor: width <= 390 ? 3 : 1,
});

/** Все маршруты × все ширины. Ключ — `<путь>@<ширина>`. */
export async function collectWordBreaks(only?: string): Promise<Record<string, WordBreakResult>> {
  const browser = await chromium.launch({ headless: true });
  const { server, origin } = await startLocalServer();
  const out: Record<string, WordBreakResult> = {};
  try {
    for (const width of WORD_BREAK_WIDTHS) {
      const context = await browser.newContext(contextFor(width));
      const page = await context.newPage();
      for (const route of INDEXABLE_ROUTES) {
        if (only && route.path !== only) continue;
        const key = `${route.path}@${width}`;
        try {
          await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
          out[key] = await measureWordBreaks(page);
        } catch (error) {
          out[key] = { words: 0, breaks: 0, overflows: 0, offenders: [`НЕ ОТКРЫЛСЯ: ${String(error).slice(0, 80)}`] };
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  return out;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const only = process.argv.includes("--route") ? process.argv[process.argv.indexOf("--route") + 1] : undefined;
  const res = await collectWordBreaks(only);
  let total = 0;
  for (const [key, r] of Object.entries(res)) {
    total += r.breaks + r.overflows;
    if (r.breaks || r.overflows) console.log(`${key}  разрывов ${r.breaks}\n    ${r.offenders.join("\n    ")}`);
  }
  console.log(`\nмаршрутов×ширин: ${Object.keys(res).length}, разорванных или вылезших слов: ${total}`);
}
