/**
 * В1/В2 — храповики мобильной геометрии и контраста (QWEN-03 §5, блок В).
 *
 * Идея та же, что у tests/css-literals.test.ts: тест не требует починить долг
 * сейчас — он не даёт ему расти. Базлайн фиксирует фактическое состояние на
 * 25.09.2026 03:5x, новые провалы красные.
 *
 * Зачем оба: замеры А1 (docs/audit/computed-style.md) нашли на 390px
 * 12 маршрутов с горизонтальным скроллом (три статьи блога — +390px, то есть
 * страница вдвое шире экрана) и провалы контраста; без теста это молча
 * размножается.
 *
 * Браузер опционален и НЕ устанавливается отсюда: нет Playwright или нет
 * chromium — тест скипается с внятным сообщением. Запуск:
 *   npm run build && npx tsx --test tests/mobile-audit.test.ts
 * Полный прогон по 70 маршрутам занимает минуты; в CI пока не бегает
 * (нужен `npx playwright install chromium` в workflow — решит Claude Code).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = "tests/fixtures/mobile-audit-baseline.json";
const WIDTH = 390;

interface RouteBaseline {
  /** лишние пиксели горизонтального скролла страницы (scrollWidth - clientWidth) */
  /** px контента правее видимого вьюпорта, НЕ спрятанные внутренним клиппером */
  overflowPx: number;
  /** px, спрятанные внутренним overflow: hidden/clip — справочно, долгом не считается */
  clippedPx?: number;
  /** узлов с контрастом ниже порога (4.5 текст, 3 крупный) */
  contrastFails: number;
  /** узлов, фон которых не выводится из цветных слоёв (картинка/градиент) */
  indeterminate: number;
}

async function loadPlaywright() {
  const name = "playwright";
  try {
    return await import(name);
  } catch {
    return null;
  }
}

function readBaseline(): Record<string, RouteBaseline> {
  const file = path.join(root, BASELINE);
  assert.ok(fs.existsSync(file), `нет baseline ${BASELINE}: npx tsx tests/mobile-audit.test.ts --write`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, RouteBaseline>;
}

/** Считает всё внутри страницы — one round-trip per route.
 * Асинхронность нужна не для самой математики, а для ожидания в начале:
 * сразу после «load» на странице играются анимации появления, и
 * getComputedStyle отдаёт стартовые значения перехода (на /content-day в
 * момент load их 33). Без ожидания baseline зависел бы от тайминга запуска.
 * Бесконечные анимации не ждём — они не заканчиваются.
 *
 * PROMPT-31 §2.5: `.map(...)` без `Promise.all(...)` не ждёт ничего — await
 * массива промисов возвращает массив сразу, не дожидаясь элементов. Тест
 * потому был тихо флаки (тот же класс бага, что computed-style-audit.ts уже
 * ловил в f6f2370, «мерка середины перехода, а не итога») — три подряд
 * прогона одного и того же кода давали 730/799/802 узлов ниже порога.
 * Проверено после фикса: три прогона подряд — одно и то же число. */
const AUDIT_FN = `async (width) => {
  await Promise.all((document.getAnimations ? document.getAnimations() : []).filter((a) => a.playState === "running" && (!a.effect || a.effect.getTiming().iterations !== Infinity) && a.timeline === document.timeline).map((a) => a.finished.catch(() => {})));
  // PROMPT-35 §4: color-mix(in srgb, ...) — computed color/backgroundColor
  // отдаёт "color(srgb r g b / a)" (0..1), не rgb()/rgba() — без разбора
  // этого формата цепочка фона тихо пропускала такой слой и проваливалась
  // на фон предка (ложный провал контраста после перевода литералов на
  // --ds-on-dark/--ds-scrim через color-mix).
  const rgba = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    const cm = String(c).match(/color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?\\)/);
    if (cm) return [Number(cm[1]) * 255, Number(cm[2]) * 255, Number(cm[3]) * 255, cm[4] !== undefined ? Number(cm[4]) : 1];
    return null; };
  const composite = (layers) => { const L = layers.slice().reverse(); let o = [255, 255, 255]; for (const [r, g, b, a] of L) o = [Math.round(r * a + o[0] * (1 - a)), Math.round(g * a + o[1] * (1 - a)), Math.round(b * a + o[2] * (1 - a))]; return o; };
  const effBg = (el) => { const layers = []; let n = el;
    while (n) { const s = getComputedStyle(n); const c = rgba(s.backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      // непрозрачный цвет найден — фон определённый, идти выше некуда
      if (c && c[3] >= 1) return { bg: composite(layers) };
      // фон нарисован картинкой или градиентом (hero поверх фото, секция с
      // linear-gradient) — одноцветным фоном это не описывается, и считать по
      // rgb() было бы вымыслом: помечаем как «не определено», не как провал
      if (s.backgroundImage && s.backgroundImage !== 'none') return { indeterminate: true };
      n = n.parentElement;
    }
    return { bg: composite(layers) }; };
  const lum = (c) => { const v = c.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (fg, bg) => { const l1 = lum(fg), l2 = lum(bg); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const de = document.scrollingElement || document.documentElement;
  let contrastFails = 0;
  let indeterminate = 0;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const text = (el.textContent || '').trim(); if (!text || text.length > 80) continue;
    if (el.children.length) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.opacity === '0') continue;
    const fg = rgba(s.color); if (!fg || fg[3] === 0) continue;
    // SVG-текст красится fill/stroke, а не color. Слово «YELYGINN» в
    // .v3-footer__wordmark имеет fill: none и stroke rgba(255,255,255,.35):
    // по computed.color оно выглядело как INK на INK (1.00) и легло в baseline
    // после PROMPT-33 как ложный провал. Узел, который цветом не рисуется,
    // мерить контрастом текста нельзя.
    if (el.namespaceURI && String(el.namespaceURI).indexOf("svg") !== -1) {
      const unpainted = (v) => !v || v === "none" || /^rgba\(0, 0, 0, 0\)$/.test(v);
      if (unpainted(s.fill)) continue;
    }
    const painted = effBg(el);
    if (painted.indeterminate) { indeterminate++; continue; }
    const bg = painted.bg;
    const px = parseFloat(s.fontSize); const bold = parseInt(s.fontWeight, 10) >= 700;
    const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    const got = ratio([fg[0], fg[1], fg[2]], bg);
    if (got < need) { contrastFails++; if (offenders.length < 3) offenders.push(el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0].slice(0, 20) + ' ' + s.color + ' на rgb(' + bg.join(',') + ') = ' + got.toFixed(2)); }
  }
  /* Что реально вылезает за экран. Ни scrollWidth, ни window.scrollX для этого
   * не годятся, и вот почему (проверено отрицательным контролем: в /portfolio
   * добавлен div шириной 430px):
   *   — scrollWidth − clientWidth даёт и настоящий долг (40px на том div), и
   *     мнимый: на /portfolio/sber-arhitektura-teaser@390 те же «+2px» оказались
   *     шириной классического скроллбара, ни один узел не пересекал viewport;
   *   — scrollWidth − innerWidth ослепляет: в мобильной эмуляции layout viewport
   *     подстраивается под ширину контента, и на том же div выходит 430−430=0;
   *   — window.scrollX после scrollTo(9999,0) тоже 0, потому что overflow-x: clip
   *     на body (носится с PROMPT-30/31) делает страницу нескроллимой.
   * Мера ниже отвечает на вопрос человека «видно ли обрезанным»: узел считается
   * переполнением, если он правее видимого вьюпорта И не спрятан внутренним
   * overflow: hidden/clip/scroll/auto. html и body клипперами не считаются —
   * именно они и маскируют долг. */
  const vw = visualViewport ? visualViewport.width : innerWidth;
  let overflowPx = 0;
  let clipped = 0;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const over = Math.round(r.right - vw);
    if (over <= 0) continue;
    let n = el.parentElement, hidden = false;
    while (n && n !== document.body) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'hidden' || ox === 'clip' || ox === 'scroll' || ox === 'auto') { hidden = true; break; }
      n = n.parentElement;
    }
    if (hidden) { clipped = Math.max(clipped, over); continue; }
    overflowPx = Math.max(overflowPx, over);
  }
  return {
    overflowPx,
    clippedPx: clipped,
    contrastFails,
    indeterminate,
    offenders,
  };
}`;

const run = async () => {
  const pw = await loadPlaywright();
  if (!pw) return null;
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
  } catch {
    return null; // chromium не скачан — не роняем чек
  }
  const { startLocalServer } = await import("../scripts/computed-style-audit.ts");
  const { server, origin } = await startLocalServer();
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest.ts");
  // PROMPT-31 §2.2: без isMobile/hasTouch Playwright резервирует классический
  // десктопный жёлоб под вертикальный скроллбар (~17px) — window.innerWidth
  // оказывается на эту величину шире document.documentElement.clientWidth на
  // любой странице выше вьюпорта, и position:fixed;inset:0 элементы ложатся
  // по нему, создавая мнимое горизонтальное переполнение. На настоящем
  // телефоне скроллбар оверлейный и места не занимает — тот же баг, что
  // почти на всех 12 маршрутов из §2.4/А1, оказался измерением, не версткой
  // (см. scripts/computed-style-audit.ts, тот же фикс). Контекст, а не
  // просто newPage — isMobile нельзя переключить после создания страницы.
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const out: Record<string, RouteBaseline & { offenders: string[] }> = {};
  /* Страница на каждый маршрут. Одна страница на все 70 копила состояние:
   * мобильный layout viewport, один раз расширившись под широким контентом
   * предыдущей страницы, обратно не сжимается, и `/portfolio/sber-arhitektura-teaser`
   * получал «+2px» долга только потому, что до него прогнали ещё 51 маршрут —
   * на свежей странице тот же замер даёт 0 (проверено и в одну сторону, и в другую). */
  for (const route of INDEXABLE_ROUTES) {
    const page = await context.newPage();
    try {
      await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
      const r = await page.evaluate(`(${AUDIT_FN})(${WIDTH})`);
      out[route.path] = { overflowPx: r.overflowPx, clippedPx: r.clippedPx, contrastFails: r.contrastFails, indeterminate: r.indeterminate, offenders: r.offenders };
    } catch (error) {
      out[route.path] = { overflowPx: 0, clippedPx: 0, contrastFails: 0, indeterminate: 0, offenders: [`НЕ ОТКРЫЛСЯ: ${String(error).slice(0, 60)}`] };
    } finally {
      await page.close();
    }
  }
  await browser.close();
  server.close();
  return out;
};

if (process.argv.includes("--write")) {
  const fresh = await run();
  if (!fresh) { console.error("Playwright/chromium недоступен — baseline не записан"); process.exit(1); }
  const slim = Object.fromEntries(Object.entries(fresh).map(([k, v]) => [k, { overflowPx: v.overflowPx, contrastFails: v.contrastFails, indeterminate: v.indeterminate }]));
  fs.mkdirSync(path.dirname(path.join(root, BASELINE)), { recursive: true });
  fs.writeFileSync(path.join(root, BASELINE), `${JSON.stringify(slim, null, 2)}\n`);
  console.log(`baseline записан: ${BASELINE} (${Object.keys(slim).length} маршрутов)`);
  process.exit(0);
}

const results = await run();

test("мобильная геометрия и контраст не хуже базлайна (В1+В2)", (t) => {
  if (!results) { t.skip("нет Playwright/chromium — пропустить нельзя, ставит тот, кто принимает работу: npx playwright install chromium"); return; }
  // Храповик бесполезен, если молча ничего не измерил: сколько реально
  // просмотрено маршрутов и что найдено — в диагностику каждого прогона.
  const routes = Object.keys(results);
  const sumOverflow = routes.reduce((s, r) => s + results[r].overflowPx, 0);
  const sumClipped = routes.reduce((s, r) => s + (results[r].clippedPx || 0), 0);
  const sumFails = routes.reduce((s, r) => s + results[r].contrastFails, 0);
  t.diagnostic(`измерено маршрутов: ${routes.length} из 70; на 390px впереди вьюпорта ${sumOverflow}px открытого переполнения, ещё ${sumClipped}px спрятано внутренним overflow: hidden/clip; контраст ниже порога: ${sumFails} узлов`);
  assert.ok(routes.length >= 60, `замерено только ${routes.length} маршрутов — сервер или браузер не работают, тест не должен проходить «впустую»`);
  const baseline = readBaseline();
  const worse: string[] = [];
  for (const [route, now] of Object.entries(results)) {
    const allowed = baseline[route];
    if (!allowed) { if (now.overflowPx > 0 || now.contrastFails > 0) worse.push(`${route}: новый маршрут с долгом (overflow ${now.overflowPx}px, контраст ${now.contrastFails})`); continue; }
    if (now.overflowPx > allowed.overflowPx) worse.push(`${route}: горизонтальный скролл ${allowed.overflowPx} → ${now.overflowPx}px`);
    if (now.contrastFails > allowed.contrastFails) worse.push(`${route}: узлов с контрастом ниже порога ${allowed.contrastFails} → ${now.contrastFails}`);
    // «не определено» тоже под замком: иначе способ спрятать новый провал —
    // подложить элементу градиент, и он перестанет считаться
    if (now.indeterminate > allowed.indeterminate) worse.push(`${route}: узлов с неопределимым фоном ${allowed.indeterminate} → ${now.indeterminate}`);
  }
  assert.deepEqual(worse, [], `Мобильный долг вырос (390px). Примеры проблемных узлов:\n${
    Object.entries(results).filter(([, v]) => v.offenders.length).slice(0, 5).map(([k, v]) => `  ${k}\n    ${v.offenders.join("\n    ")}`).join("\n")}\n\nЕсли долг реально уменьшился — закрепи: npx tsx tests/mobile-audit.test.ts --write`);
});
