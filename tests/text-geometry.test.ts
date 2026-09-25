/**
 * Д — «текст не обрезан и не налезает» (QWEN-05 §3 Д).
 *
 * Числовые проверки этой ночи (контраст, скролл, переполнение) пропустили то,
 * что владелец увидел глазами: заголовок «Концерты «Станции Метро Горьковска…»
 * с обрезанной строкой, налезшие друг на друга «ЕСТЬ ЗАДАЧА? / РАССКАЖИТЕ»,
 * заголовок за краем экрана. Причина — ни одна из тех проверок не смотрит на
 * геометрию самих строк текста.
 *
 * Что меряется на всех 70 маршрутах, 1440 и 390:
 *   lines    — строки одного элемента (Range.getClientRects) пересекаются по
 *              вертикали: leadership отрицательный, текст рисуется внахлёст;
 *   overlap  — два соседних текстовых блока перекрываются больше чем на треть
 *              меньшего (тот самый «ЕСТЬ ЗАДАЧА? / РАССКАЖИТЕ»);
 *   clipX    — scrollWidth > clientWidth при overflow-x hidden/clip и без
 *              text-overflow (текст отрезан без многоточия);
 *   clipY    — то же по вертикали (обрезанная строка заголовка);
 *   offscreen— текстовый элемент выходит за вьюпорт (fixed исключён).
 *
 * Это храповик, а не «правильно/неправильно»: baseline фиксирует фактическое
 * состояние после `a53b2c4`, красным становится рост любого из пяти счётчиков.
 * Найденные сейчас нарушения перечислены в docs/audit/qwen-05-log.md — они
 * уходят Claude Code списком, а не чинятся молча, потому что каждая правка
 * вида «line-height заголовка» меняет вид сайта.
 *
 * Браузер опционален: нет Playwright или нет chromium — тест скипается с
 * внятным сообщением. Запуск:
 *   npm run build && npx tsx --test tests/text-geometry.test.ts
 *   npm run build && npx tsx tests/text-geometry.test.ts --write   — baseline
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = "tests/fixtures/text-geometry-baseline.json";
const WIDTHS = [1440, 390];

interface Geometry {
  lines: number;
  overlap: number;
  clipX: number;
  clipY: number;
  offscreen: number;
  checked: number;
}

async function loadPlaywright() {
  const name = "playwright";
  try {
    return await import(name) as { chromium: { launch(o: Record<string, unknown>): Promise<any> } };
  } catch {
    return null;
  }
}

/** Всё считается внутри страницы — один round-trip на маршруто-ширину.
 * Без ожидания покоя конечных анимаций мерка снимала бы середину перехода
 * (QWEN-04 f6f2370, PROMPT-31 §2.5: ждать надо Promise.all, а не .map). */
const AUDIT_FN = `async (width) => {
  await Promise.all((document.getAnimations ? document.getAnimations() : [])
    .filter((a) => a.playState === "running" && (!a.effect || a.effect.getTiming().iterations !== Infinity) && a.timeline === document.timeline)
    .map((a) => a.finished.catch(() => {})));

  const SKIP = /(marquee|ticker|scroll)/i;
  // строка бегущей строки: у внутренних span класса нет, поэтому «намеренное»
  // ищем по предкам, а не по самому элементу
  const inTicker = (el) => { for (let n = el; n; n = n.parentElement) if (SKIP.test(String(n.className || ""))) return true; return false; };
  const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
  // Рамки строк берём от всего содержимого элемента, а не от первого текстового
  // узла: заголовок вида «Концерты <span>«Станции…»</span>» из одного только
  // первого узла даёт одну строку, и налезание второй строки на первую не
  // видно. Блочные дети при этом исключены — иначе в рамки попадут дочерние
  // блоки, а не строки.
  const INLINE = /^(inline|contents)$/;
  const rectsOf = (el) => {
    for (const c of el.children) { const d = getComputedStyle(c).display; if (!INLINE.test(d) && d !== "none") return []; }
    const r = document.createRange();
    try { r.selectNodeContents(el); } catch (e) { return []; }
    try { return [...r.getClientRects()].filter((x) => x.width > 1 && x.height > 1); } catch (e) { return []; }
  };
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") return null;
    if (r.bottom < -2) return null;
    return { s, r };
  };

  const clippedByAncestor = (el, horizontal) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      const v = horizontal ? s.overflowX : s.overflowY;
      // считаем намеренным только настоящую прокрутку/маску: overflow: hidden
      // на секции или overflow-x: clip на body — это не «так задумано», а
      // обрезанный текст (именно жалобу владельца «заголовок за краем» прятал
      // как раз clip на предке)
      if (v === "auto" || v === "scroll") return true;
      if (s.maskImage && s.maskImage !== "none") return true;
    }
    return false;
  };
  let lines = 0, overlap = 0, clipX = 0, clipY = 0, offscreen = 0, checked = 0;
  const offenders = [];
  const note = (kind, el, detail) => { if (offenders.length < 25) offenders.push(kind + " · " + el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "") + " «" + (el.textContent || "").trim().slice(0, 26) + "» " + detail); };

  const all = [...document.querySelectorAll("body *")];
  for (const el of all) {
    if (!own(el) || SKIP.test(String(el.className))) continue;
    const v = vis(el);
    if (!v) continue;
    checked++;
    const { s, r } = v;

    // 1) строки одного элемента: группируем по top, соседние строки не должны
    //    пересекаться по вертикали больше чем на 1px
    const rs = rectsOf(el).sort((a, b) => a.top - b.top || a.left - b.left);
    // Группируем рамки по строкам: в одну строку попадают рамки с близким top.
    // Range по содержимому блока даёт дубли (один и тот же span два раза) и
    // рамки разной высоты на одной базовой линии, поэтому сравнивать строки
    // имеет смысл только если они ещё и пересекаются по горизонтали.
    const rows = [];
    for (const rect of rs) {
      const row = rows.find((x) => Math.abs(x.top - rect.top) <= 1);
      if (row) { row.bottom = Math.max(row.bottom, rect.bottom); row.right = Math.max(row.right, rect.right); row.left = Math.min(row.left, rect.left); }
      else rows.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
    }
    rows.sort((a, b) => a.top - b.top);
    for (let i = 1; i < rows.length; i++) {
      const hx = Math.min(rows[i - 1].right, rows[i].right) - Math.max(rows[i - 1].left, rows[i].left);
      if (hx <= 1) continue;
      const overlapPx = rows[i - 1].bottom - rows[i].top;
      const h = Math.min(rows[i - 1].bottom - rows[i - 1].top, rows[i].bottom - rows[i].top);
      if (overlapPx > 2 && overlapPx > h * 0.4) { lines++; note("строки внахлёст", el, overlapPx.toFixed(1) + "px из " + Math.round(h)); break; }
    }

    // 2) обрезание по горизонтали/вертикали
    const hiddenX = s.overflowX === "hidden" || s.overflowX === "clip";
    const hiddenY = s.overflowY === "hidden" || s.overflowY === "clip";
    const ellipsis = s.textOverflow === "ellipsis" || s.textOverflow === "clip";
    // -webkit-line-clamp — намеренная обрезка в N строк (PROMPT-34 §2.3), не
    // случайная: у неё тоже overflow-y:hidden + scrollHeight>clientHeight, но
    // это дизайн (.portfolio-mosaic__item p и т.п.), а не баг. computed
    // display у -webkit-box с line-clamp в текущем Chromium — "flow-root", не
    // "-webkit-box" (проверено вживую), поэтому единственный надёжный сигнал —
    // сам webkitLineClamp.
    const lineClamped = s.webkitLineClamp && s.webkitLineClamp !== "none";
    if (hiddenX && !ellipsis && el.scrollWidth > el.clientWidth + 1) { clipX++; note("обрезан по горизонтали", el, el.scrollWidth + "→" + el.clientWidth); }
    if (hiddenY && !lineClamped && el.scrollHeight > el.clientHeight + 1) { clipY++; note("обрезан по вертикали", el, el.scrollHeight + "→" + el.clientHeight); }

    // 3) за краем вьюпорта
    if (s.position !== "fixed" && (r.right > innerWidth + 1 || r.left < -1) && !inTicker(el) && !clippedByAncestor(el, r.right > innerWidth + 1)) { offscreen++; note("за краем экрана", el, Math.round(r.left) + ".." + Math.round(r.right)); }
  }

  // 4) соседние блоки текста не должны наползать друг на друга
  const inter = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w <= 1 || h <= 1) return 0;
    return (w * h) / Math.min(a.width * a.height, b.width * b.height);
  };
  const groups = new Map();
  for (const el of all) {
    if (!own(el) || SKIP.test(String(el.className))) continue;
    const v = vis(el);
    if (!v) continue;
    const parent = el.parentElement;
    if (!parent) continue;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push({ el, r: v.r, s: v.s });
  }
  for (const items of groups.values()) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (a.s.position === "absolute" || b.s.position === "absolute" || a.s.position === "fixed" || b.s.position === "fixed") continue;
        // строчные элементы (ссылки внутри одного абзаца) сравнивать рамками
        // нельзя: прямоугольник двухстрочной ссылки накрывает соседа, а глифов
        // не касается — первый же «находка» теста Д была именно такая пара
        if (a.s.display === "inline" || b.s.display === "inline") continue;
        if (a.r.bottom < b.r.top || b.r.bottom < a.r.top) continue;
        if (inter(a.r, b.r) > 0.34) { overlap++; if (offenders.length < 25) note("блоки налезли", b.el, "на " + Math.round(inter(a.r, b.r) * 100) + "% от " + a.el.tagName.toLowerCase()); }
      }
    }
  }
  return { lines, overlap, clipX, clipY, offscreen, checked, offenders };
}`;

const run = async (): Promise<Record<string, Geometry & { offenders: string[] }> | null> => {
  const pw = await loadPlaywright();
  if (!pw) return null;
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
  } catch {
    return null;
  }
  const { startLocalServer } = await import("../scripts/computed-style-audit.ts");
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest.ts");
  const { server, origin } = await startLocalServer();
  const out: Record<string, Geometry & { offenders: string[] }> = {};
  try {
    for (const width of WIDTHS) {
      // isMobile как на телефоне: в десктопном контексте скроллбар съедает
      // 15px и создаёт мнимое переполнение (PROMPT-31 §2.4 — тот же баг)
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        isMobile: width === 390,
        hasTouch: width === 390,
        deviceScaleFactor: width === 390 ? 3 : 1,
      });
      const page = await context.newPage();
      for (const route of INDEXABLE_ROUTES) {
        const key = `${route.path}@${width}`;
        try {
          await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
          const r = await page.evaluate(`(${AUDIT_FN})(${width})`) as Geometry & { offenders: string[] };
          out[key] = { ...out[key], ...r };
        } catch (error) {
          out[key] = { lines: 0, overlap: 0, clipX: 0, clipY: 0, offscreen: 0, checked: 0, offenders: [`НЕ ОТКРЫЛСЯ: ${String(error).slice(0, 60)}`] };
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  return out;
};

if (process.argv.includes("--write")) {
  const fresh = await run();
  if (!fresh) { console.error("Playwright/chromium недоступен — baseline не записан"); process.exit(1); }
  const slim = Object.fromEntries(Object.entries(fresh).map(([k, v]) => [k, {
    lines: v.lines, overlap: v.overlap, clipX: v.clipX, clipY: v.clipY, offscreen: v.offscreen, checked: v.checked,
  }]));
  fs.writeFileSync(path.join(root, BASELINE), `${JSON.stringify(slim, null, 2)}\n`);
  const sum = (f: keyof Geometry) => Object.values(fresh).reduce((s, x) => s + (x[f] || 0), 0);
  const dump = Object.entries(fresh).filter(([, v]) => v.offenders.length).map(([k, v]) => `${k}\n  ` + v.offenders.join("\n  ")).join("\n");
  fs.writeFileSync(path.join(root, ".night-shots/text-geometry-offenders.txt"), dump);
  console.log(`список нарушителей: .night-shots/text-geometry-offenders.txt (${dump.split("\n").length - 1} строк)`);
  console.log(`baseline записан: ${BASELINE} (${Object.keys(slim).length} замеров) · строк внахлёст ${sum("lines")}, налезаний ${sum("overlap")}, обрезаний X ${sum("clipX")}, Y ${sum("clipY")}, за краем ${sum("offscreen")}`);
  process.exit(0);
}

const results = await run();

test("текст не налезает, не обрезан и не уезжает за экран (Д)", (t) => {
  if (!results) { t.skip("нет Playwright/chromium — ставит тот, кто принимает работу: npx playwright install chromium"); return; }
  const keys = Object.keys(results);
  assert.ok(keys.length >= 120, `замерено ${keys.length} комбинаций — сервер или браузер не работают, тест не должен проходить «впустую»`);
  const sum = (f: keyof Geometry) => keys.reduce((s, k) => s + (results[k][f] || 0), 0);
  t.diagnostic(`замеров: ${keys.length}; строк внахлёст ${sum("lines")}, блоков налезли ${sum("overlap")}, обрезано X ${sum("clipX")}, Y ${sum("clipY")}, за краем ${sum("offscreen")}`);
  const baselineFile = path.join(root, BASELINE);
  assert.ok(fs.existsSync(baselineFile), `нет baseline ${BASELINE}: npx tsx tests/text-geometry.test.ts --write`);
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8")) as Record<string, Geometry>;
  const METRICS: Array<keyof Geometry> = ["lines", "overlap", "clipX", "clipY", "offscreen"];
  const worse: string[] = [];
  for (const k of keys) {
    const b = baseline[k];
    if (!b) { worse.push(`${k}: нет в baseline (новый маршрут? — перепишите baseline осознанно)`); continue; }
    for (const m of METRICS) if (results[k][m] > (b[m] || 0)) worse.push(`${k} ${m}: ${(b[m] || 0)} → ${results[k][m]}`);
  }
  assert.deepEqual(worse, [], `геометрия текста ухудшилась:\n  ${worse.join("\n  ")}`);
});
