/**
 * Ни одного разорванного слова (PROMPT-36 §1, правило владельца).
 *
 * Слово либо помещается на строке целиком, либо переносится целиком. Ни
 * `hyphens: auto`, ни `overflow-wrap: anywhere / break-word` не спасают
 * положение — кегль подбирается так, чтобы самое длинное слово влезло.
 * Мерка и её описание — scripts/word-breaks.ts.
 *
 * Тест сначала ловит заведомо сломанное (отрицательный контроль: слово из
 * 40 букв в узкой колонке), потом требует ноль на всех маршрутах × четырёх
 * ширинах: 1440 / 1200 / 768 / 390.
 *
 *   npm run build && npx tsx --test tests/word-breaks.test.ts
 *
 * Браузер опционален: нет Playwright или chromium — тест скипается.
 */
import test from "node:test";
import assert from "node:assert/strict";

async function tryBrowser() {
  try {
    const { chromium } = await import("playwright");
    return await chromium.launch({ headless: true });
  } catch {
    return null;
  }
}

const SKIP = "нет Playwright/chromium — ставит тот, кто принимает работу: npx playwright install chromium";

test("отрицательный контроль: слово из 40 букв в узкой колонке ловится", async (t) => {
  const browser = await tryBrowser();
  if (!browser) { t.skip(SKIP); return; }
  try {
    const { measureWordBreaks } = await import("../scripts/word-breaks.ts");
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    // overflow-wrap:anywhere — ровно то, чем слова рвались на сайте раньше
    await page.setContent(`<!doctype html><html lang="ru"><body style="margin:0">
      <h1 id="a" style="width:200px;font:700 40px Arial;overflow-wrap:anywhere">Электроэнцефалографическиеисследованияпрофилактики и ещё слова</h1>
      <h1 id="b" style="width:200px;font:700 40px Arial;hyphens:auto" lang="ru">Примечательнейшая инфраструктура</h1>
    </body></html>`);
    const broken = await measureWordBreaks(page);
    assert.ok(broken.breaks >= 1, "40-буквенное слово в колонке 200px обязано считаться разорванным");
    assert.ok(broken.offenders.some((o) => o.includes("Электроэнцефалографические")), `нарушитель не назван: ${broken.offenders.join(" | ")}`);

    // и обратное: то же слово, которому дали влезть, разрывом не считается
    await page.setContent(`<!doctype html><html lang="ru"><body style="margin:0">
      <h1 style="width:2000px;font:700 40px Arial;">Электроэнцефалографическиеисследованияпрофилактики и ещё слова</h1>
      <p style="width:200px;font:16px Arial">Санкт-Петербург и ₽/час переносятся по своим знакам</p>
    </body></html>`);
    const fine = await measureWordBreaks(page);
    assert.equal(fine.breaks, 0, `ложное срабатывание: ${fine.offenders.join(" | ")}`);
    assert.ok(fine.words > 5, "мерка вообще не увидела слов");
  } finally {
    await browser.close();
  }
});

test("ни одного разорванного слова: все маршруты × 1440 / 1200 / 768 / 390", async (t) => {
  const browser = await tryBrowser();
  if (!browser) { t.skip(SKIP); return; }
  await browser.close();
  const { collectWordBreaks, WORD_BREAK_WIDTHS } = await import("../scripts/word-breaks.ts");
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest.ts");
  const result = await collectWordBreaks();
  const keys = Object.keys(result);
  assert.equal(keys.length, INDEXABLE_ROUTES.length * WORD_BREAK_WIDTHS.length, "замерены не все маршруты × ширины");
  const words = keys.reduce((sum, key) => sum + result[key].words, 0);
  assert.ok(words > 10_000, `мерка увидела только ${words} слов — сервер или страницы не работают`);
  const bad = keys.filter((key) => result[key].breaks > 0).map((key) => `${key}\n    ${result[key].offenders.join("\n    ")}`);
  t.diagnostic(`маршрутов×ширин: ${keys.length}, слов: ${words}, разорванных: ${bad.length}`);
  assert.deepEqual(bad, [], `разорванные слова:\n  ${bad.join("\n  ")}`);
});
