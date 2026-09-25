/**
 * PROMPT-33 §А.5 — ни один видимый <img> не показывается растянутым или
 * обрезанным без явного намерения. Пропорция на экране (getBoundingClientRect)
 * против пропорции исходника (width/height атрибуты, а если их нет —
 * naturalWidth/naturalHeight) не должна отличаться больше чем на 2%.
 *
 * object-fit: cover (или его эффект через фиксированный aspect-ratio рамки)
 * разрешён только там, где обрезка — часть дизайна: превью карточек
 * портфолио, обложки видео, hero-плитки. Список — COVER_ALLOWLIST ниже,
 * это CSS-селекторы; узел, попадающий под любой из них, не проверяется на
 * пропорцию вообще (там cover — задумка, а не баг).
 *
 * В отличие от tests/mobile-audit.test.ts (храповик против baseline) — это
 * жёсткая проверка без baseline: искажение пропорции не бывает "приемлемым
 * долгом", это всегда баг. Проверено, что тест краснеет на реальном баге:
 * см. отчёт PROMPT-33 §А (временный откат .gallery-item img{height:auto}
 * давал именно такое падение теста).
 *
 * Запуск: npm run build && npx tsx --test tests/photo-aspect-ratio.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return null;
  }
}

/** Селекторы, где обрезка (object-fit:cover или эквивалент через фиксированную
 * рамку) — часть дизайна, не баг. Каждый — реальное намеренное место,
 * найденное проверкой по всем 70 маршрутам (PROMPT-33 §А.5). */
const COVER_ALLOWLIST = [
  ".gallery-hero .gallery-item img", // /photo — hero-плитка 3:4, шесть разных кадров в одной сетке
  ".v3-media img", // V3 портфолио/кейсы — карточки и медиа-блоки фиксированного формата
  ".v3-project-card img",
  ".bb-project-card__media img", // bb-* карточки проектов (пилот, похожие работы)
  ".portfolio-mosaic__item img",
  ".portfolio-posters img",
  ".portfolio-media-cluster img", // портфолио-кластер (__main и вложенные) — фиксированный формат рамки
  ".portfolio-row__media img",
  ".v32-proof__grid img", // мозаика "проверка цвета"
  ".v32-camera img",
  ".v32-showreel img", // постер шоурила на главной
  ".v3-about-page figure img", // /about — портретная панель, min-height:600px + cover, задумано
  ".service-showcase-main img, .service-showcase-side img", // статические услуги — hero-обложка Kinescope
  ".kinescope-embed-poster", // постер видео — тот же формат, что рамка плеера
  ".editorial-service-media img",
  ".related-work-list .bb-project-card__media img",
];

const AUDIT_FN = `(coverSelectors) => {
  const covered = new Set();
  for (const sel of coverSelectors) {
    try { document.querySelectorAll(sel).forEach((el) => covered.add(el)); } catch {}
  }
  const out = [];
  document.querySelectorAll("img").forEach((img) => {
    if (covered.has(img)) return;
    const r = img.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return; // невидимые/нулевые — не мера
    const cs = getComputedStyle(img);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
    const wAttr = Number(img.getAttribute("width"));
    const hAttr = Number(img.getAttribute("height"));
    const fileW = wAttr > 0 ? wAttr : img.naturalWidth;
    const fileH = hAttr > 0 ? hAttr : img.naturalHeight;
    if (!fileW || !fileH) return; // пока не загрузилось и нет атрибутов — не мера
    const fileRatio = fileW / fileH;
    const screenRatio = r.width / r.height;
    const diffPct = Math.abs(screenRatio - fileRatio) / fileRatio * 100;
    if (diffPct > 2) {
      out.push({
        src: img.currentSrc || img.src,
        cls: String(img.className || "").slice(0, 40),
        fileRatio: Number(fileRatio.toFixed(3)),
        screenRatio: Number(screenRatio.toFixed(3)),
        diffPct: Number(diffPct.toFixed(1)),
        objectFit: cs.objectFit,
      });
    }
  });
  return out;
}`;

const run = async (width: number) => {
  const pw = await loadPlaywright();
  if (!pw) return null;
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
  } catch {
    return null;
  }
  const { startLocalServer } = await import("../scripts/computed-style-audit.ts");
  const { server, origin } = await startLocalServer();
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest.ts");
  const context = await browser.newContext(
    width <= 480
      ? { viewport: { width, height: 900 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
      : { viewport: { width, height: 900 } },
  );
  const page = await context.newPage();
  const out: Record<string, ReturnType<typeof Array>> = {};
  for (const route of INDEXABLE_ROUTES) {
    try {
      await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
      // изображения без loading=eager могут ещё не начать декодироваться —
      // прокрутка до конца форсирует lazy-загрузку всех, что уже в DOM.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(150);
      const offenders = await page.evaluate(`(${AUDIT_FN})(${JSON.stringify(COVER_ALLOWLIST)})`);
      if ((offenders as unknown[]).length) out[route.path] = offenders as never;
    } catch (error) {
      out[route.path] = [{ src: "N/A", cls: "", fileRatio: 0, screenRatio: 0, diffPct: 0, objectFit: `НЕ ОТКРЫЛСЯ: ${String(error).slice(0, 60)}` }] as never;
    }
  }
  await browser.close();
  server.close();
  return out;
};

for (const width of [1440, 390]) {
  test(`ни один <img> вне allowlist не искажён по пропорции больше чем на 2% (${width}px)`, async (t) => {
    const results = await run(width);
    if (!results) { t.skip("нет Playwright/chromium — пропустить нельзя, ставит тот, кто принимает работу: npx playwright install chromium"); return; }
    const routes = Object.keys(results);
    t.diagnostic(`найдено искажённых узлов на ${routes.length} маршрутах из 70 (${width}px)`);
    const lines = routes.slice(0, 8).flatMap((route) =>
      (results[route] as { src: string; diffPct: number; fileRatio: number; screenRatio: number; objectFit: string }[])
        .slice(0, 3)
        .map((o) => `  ${route}: ${o.src.split("/").pop()} — файл ${o.fileRatio}, на экране ${o.screenRatio} (${o.diffPct}%), object-fit:${o.objectFit}`),
    );
    assert.deepEqual(routes, [], `Растянутые/обрезанные без намерения картинки:\n${lines.join("\n")}`);
  });
}
