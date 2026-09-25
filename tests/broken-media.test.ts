/**
 * PROMPT-33 §В.1 — по всем 70 индексируемым маршрутам ни один <img>,
 * <video poster>, srcset-кандидат или background-image не должен грузиться
 * с ошибкой (404/5xx/сетевой сбой). Ловит тот же класс бага, что раньше уже
 * был найден вручную на пилотной странице (выдуманный путь постера
 * Kinescope) — здесь это автоматическая, повторяемая проверка по всему
 * сайту, а не разовый ручной осмотр.
 *
 * Работает через сетевые ответы (page.on("response"/"requestfailed")),
 * а не через naturalWidth: так ловятся и обычные <img>, и постеры <video>,
 * и background-image из CSS — любой ресурс, который браузер реально
 * запросил как картинку/видео.
 *
 * Запуск: npm run build && npx tsx --test tests/broken-media.test.ts
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

const MEDIA_TYPES = new Set(["image", "media"]);
const MEDIA_EXT = /\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|mov)(\?|$)/iu;

const run = async () => {
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const out: Record<string, string[]> = {};

  for (const route of INDEXABLE_ROUTES) {
    const broken: string[] = [];
    const onResponse = (response: import("playwright").Response) => {
      const req = response.request();
      const isMedia = MEDIA_TYPES.has(req.resourceType()) || MEDIA_EXT.test(response.url());
      if (isMedia && response.status() >= 400) broken.push(`${response.status()} ${response.url()}`);
    };
    const onRequestFailed = (req: import("playwright").Request) => {
      const isMedia = MEDIA_TYPES.has(req.resourceType()) || MEDIA_EXT.test(req.url());
      if (isMedia) broken.push(`FAILED ${req.failure()?.errorText ?? "?"} ${req.url()}`);
    };
    page.on("response", onResponse);
    page.on("requestfailed", onRequestFailed);
    try {
      await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);
    } catch (error) {
      broken.push(`НЕ ОТКРЫЛСЯ: ${String(error).slice(0, 80)}`);
    }
    page.off("response", onResponse);
    page.off("requestfailed", onRequestFailed);
    if (broken.length) out[route.path] = [...new Set(broken)];
  }
  await browser.close();
  server.close();
  return out;
};

test("ни один <img>/<video poster>/фон не грузится с ошибкой (все индексируемые маршруты)", async (t) => {
  const results = await run();
  if (!results) { t.skip("нет Playwright/chromium — пропустить нельзя, ставит тот, кто принимает работу: npx playwright install chromium"); return; }
  const routes = Object.keys(results);
  t.diagnostic(`сломанных медиа найдено на ${routes.length} маршрутах`);
  const lines = routes.flatMap((route) => results[route].map((o) => `  ${route}: ${o}`));
  assert.equal(routes.length, 0, `Битые изображения/видео/постеры:\n${lines.join("\n")}`);
});
