/**
 * QWEN-04 §3 — тёмная тема не должна прятать текст в теле статических страниц.
 *
 * Что сторожит: слой `!important` в `public/site-skin.css` исторически красил
 * текст литералами светлой палитры (`section { color:#111 }`, `.card p {#595953}`,
 * `td {rgba(10,10,10,.7)}` …). Пока это так, перевод статической страницы на
 * `data-theme="dark"` даёт невидимые места — замер ночной смены: 28 узлов ниже
 * порога на `/pryamye-translyacii` сразу после метки. Проверено на двух
 * страницах из десяти: `/pryamye-translyacii` (обычная) и `/reels` (с услугами
 * и прайсом). Метку в HTML тест НЕ ставит — подменяет тему на лету, чтобы
 * страница в репозитории оставалась светлой до решения владельца.
 *
 * Шапку и подвал статических страниц не считаем: это фиксированный хром, его
 * заменят `bb-nav` / `bb-footer` после одобрения владельца (QWEN-04 §2.2).
 *
 * Отрицательный контроль (низ файла): та же мерка после возврата
 * `section { color:#111 !important }` обязана находить провалы — иначе тест
 * ничего не сторожит, и «зелёный» значит только «не измерено».
 *
 * Браузер опционален и не устанавливается отсюда: нет Playwright или нет
 * chromium — тест скипается с внятным сообщением.
 *   npm run build && npx tsx --test tests/dark-static-contrast.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES = ["/pryamye-translyacii", "/reels"];
const THRESHOLD_TEXT = 4.5;
const THRESHOLD_LARGE = 3;

async function loadPlaywright() {
  const name = "playwright";
  try {
    // имя не литералом: без этого tsc падает на опциональном модуле
    return await import(name) as { chromium: { launch(o: Record<string, unknown>): Promise<any> } };
  } catch {
    return null;
  }
}

/** Мерка контраста каждого текстового узла внутри `main`: цвет/фон с
 * компаундом полупрозрачности по цепочке предков; фон-картинка или градиент
 * считаются «не определено», а не провалом. */
const AUDIT = `(function(){
  const rgba = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const v = c.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const main = document.querySelector("main");
  if (!main) return { total: 0, fails: [], note: "нет <main>" };
  const fails = [];
  let total = 0, indeterminate = 0, worst = 99;
  for (const el of main.querySelectorAll("*")) {
    const text = (el.textContent || "").trim();
    if (!text || text.length > 200 || el.children.length) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.opacity === "0" || s.display === "none") continue;
    const fg = rgba(s.color);
    if (!fg || fg[3] === 0) continue;
    const layers = [];
    let bg = null, node = el, paintedByImage = false;
    while (node && node !== document.documentElement.parentNode) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") { paintedByImage = true; break; }
      const c = rgba(cs.backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      if (c && c[3] >= 1) break;
      node = node.parentElement;
    }
    if (paintedByImage) { indeterminate++; continue; }
    let o = [255, 255, 255];
    for (const [cr, cg, cb, ca] of layers.slice().reverse()) o = [cr * ca + o[0] * (1 - ca), cg * ca + o[1] * (1 - ca), cb * ca + o[2] * (1 - ca)];
    bg = o.map(Math.round);
    const px = parseFloat(s.fontSize), bold = parseInt(s.fontWeight, 10) >= 700;
    const need = (px >= 24 || (px >= 18.66 && bold)) ? ${THRESHOLD_LARGE} : ${THRESHOLD_TEXT};
    const got = ratio([fg[0], fg[1], fg[2]], bg);
    total++;
    worst = Math.min(worst, got);
    if (got < need && fails.length < 40) {
      fails.push(el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "") + " «" + text.slice(0, 24) + "» " +
        s.color + " на rgb(" + bg.join(",") + ") = " + got.toFixed(2));
    }
  }
  return { total, indeterminate, fails, worst: Number(worst.toFixed(2)) };
})()`;

test("статическая страница в тёмной теме: текст в main читается", async (t) => {
  const pw = await loadPlaywright();
  if (!pw) { t.skip("Playwright не установлен — мерка вычисленных стилей недоступна"); return; }
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
  } catch {
    t.skip("chromium не установлен (`npx playwright install chromium`) — тест ничего не проверил");
    return;
  }
  const { startLocalServer } = await import("../scripts/computed-style-audit.ts");
  const { server, origin } = await startLocalServer();
  // try/finally обязателен: без него упавшее утверждение оставляет chromium
  // висеть, и `node --test` не завершается — провал выглядит как вечный застой
  // (на этом месте тест впервые «висел» 7 минут).
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const seen: string[] = [];
    for (const route of ROUTES) {
      await page.goto(`${origin}${route}`, { waitUntil: "load" });
      // Метку темы ставит тест, а не HTML: страница в репозитории остаётся
      // светлой до решения владельца. Через addInitScript метка не прижилась
      // (после load атрибут читался null), поэтому ставим после навигации и
      // ждём завершения переходов — CSS-токены пересчитываются сразу.
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await page.waitForFunction(
        () => (document.getAnimations ? document.getAnimations() : []).every(
          (a: Animation) => a.playState !== "running" || a.timeline !== document.timeline ||
            (a.effect && a.effect.getTiming().iterations === Infinity)),
        null, { timeout: 2500 },
      ).catch(() => {});
      await page.waitForTimeout(250);
      const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
      assert.equal(theme, "dark", `${route}: тест не смог включить тёмную тему — мерка бессмысленна`);
      // Отдельно верим, что токены именно тёмной темы доехали до корпуса:
      // иначе «ноль провалов» могло дать светлое состояние страницы.
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      assert.match(bodyBg, /rgb\(10, 10, 10\)/, `${route}: корпус не перекрасился (${bodyBg}) — тема не применилась`);
      const res = await page.evaluate(AUDIT) as { total: number; indeterminate?: number; fails: string[]; note?: string };
      assert.ok(res.total >= 20, `${route}: найдено всего ${res.total} текстовых узлов в main (${res.note ?? ""}) — тест не должен проходить «впустую»`);
      seen.push(`${route}: узлов ${res.total}, неопределённого фона ${res.indeterminate ?? 0}, ниже порога ${res.fails.length}`);
      assert.deepEqual(res.fails, [], `${route}: в тёмной теме текст ниже порога AA:\n  ${res.fails.join("\n  ")}`);
    }
    t.diagnostic(seen.join(" | "));

    // Отрицательный контроль: возвращаем правило слоя и требуем, чтобы тест
    // покраснел. Если после возврата литерала провалов нет — мерка слепая, и
    // зелёный результат выше означает только «не измерено».
    await page.goto(`${origin}${ROUTES[0]}`, { waitUntil: "load" });
    const back = await page.evaluate(`(async function(){
      document.documentElement.setAttribute("data-theme","dark");
      const st=document.createElement("style");
      st.textContent="body,header,main,footer,section{color:#111 !important}";
      document.head.appendChild(st);
      await new Promise(r=>setTimeout(r,250));
      return ${AUDIT};
    })()`) as { fails: string[]; total: number; worst: number };
    assert.ok(back.fails.length > 0,
      "отрицательный контроль не сработал: с возвращённым `section {color:#111 !important}` провалов нет — " +
      "мерка слепая, тест ложно зелёный");
    // Худший случай при возвращённом литерале обязан быть невидимым
    // (< 1.5 = чернила почти совпадают с фоном), иначе контроль поймал
    // побочную тусклость вроде оранжевого на PAPER, а не возвращённый #111.
    assert.ok(back.worst < 1.5,
      `отрицательный контроль сработал косо: худший контраст ${back.worst}, а не <1.5 — значит возвращённое ` +
      "правило #111 перестало быть невидимым в тёмной теме, и тест сторожит не его");
    t.diagnostic(`отрицательный контроль: с литералом #111 слой даёт ${back.fails.length}+ провалов, худший ${back.worst} (${back.fails[0]})`);
  } finally {
    await browser.close();
    server.close();
  }
});
