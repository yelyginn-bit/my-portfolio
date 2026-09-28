/**
 * QWEN-04 §3 — тёмная тема не должна прятать текст в теле статических страниц.
 *
 * Что сторожит: слой `!important` в `public/site-skin.css` исторически красил
 * текст литералами светлой палитры (`section { color:#111 }`, `.card p {#595953}`,
 * `td {rgba(10,10,10,.7)}` …). Пока это так, перевод статической страницы на
 * `data-theme="dark"` даёт невидимые места — замер ночной смены: 28 узлов ниже
 * порога на `/pryamye-translyacii` сразу после метки. Проверено на трёх
 * страницах: `/pryamye-translyacii`, `/reels` и `/calculator` (у последнего
 * нет `<main>`, поэтому мерка падает на `body`, и именно на нём видны поля
 * формы). Метку в HTML тест НЕ ставит — подменяет тему на лету, чтобы
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
/* PROMPT-35 §1.3: весь публичный сайт тёмный теперь, не 24 отобранных
 * страницы — список берётся из INDEXABLE_ROUTES (единственный источник
 * маршрутов, см. src/public/routeManifest.ts), плюс `/404` и `/_kit`
 * (не indexable, но публично открываются и уже помечены theme: "dark").
 * Явных исключений с "принципиально светлым" содержимым нет — если такие
 * появятся, они перечисляются здесь по имени с причиной в комментарии, а
 * не пропускаются молча.
 *
 * Пилот /video-dlya-marketpleysov был первой тёмной страницей сайта — на
 * нём было видно, что заголовок внутри .bb-signal (оранжевая заливка,
 * color: var(--ds-on-accent) в bb-components.css:313) перебивался
 * типографикой корпуса и давал PAPER на ORANGE = 2.62. Слой skin-правил
 * обходит классы bb-* (тот же приём, что PROMPT-31 применил к
 * .site-static a) — сам файл bb-components.css не тронут. */
const ROUTES = await (async () => {
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest.ts");
  const extra = ["/404", "/_kit"];
  return [...INDEXABLE_ROUTES.map((r: { path: string }) => r.path), ...extra];
})();
const THRESHOLD_TEXT = 4.5;
const THRESHOLD_LARGE = 3;
/* Минимум измеренных узлов по коротким страницам — см. использование. */
const MIN_NODES: Record<string, number> = { "/contact": 12 };

async function loadPlaywright() {
  const name = "playwright";
  try {
    // имя не литералом: без этого tsc падает на опциональном модуле
    return await import(name) as { chromium: { launch(o: Record<string, unknown>): Promise<any> } };
  } catch {
    return null;
  }
}

/** Мерка контраста каждого текстового узла содержимого (main, а где его нет —
 * body) плюс отдельно узлов формы: цвет/фон с компаундом полупрозрачности по
 * цепочке предков; фон-картинка или градиент считаются «не определено». */
const AUDIT = `(function(){
  const rgba = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const v = c.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  /** Фон элемента — компаунд полупрозрачности по цепочке предков. null = фон
   * рисованный (картинка/градиент), одноцветным не описывается. */
  const bgOf = (el) => {
    const layers = [];
    let node = el;
    while (node && node !== document.documentElement.parentNode) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = rgba(cs.backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      if (c && c[3] >= 1) break;
      node = node.parentElement;
    }
    let o = [255, 255, 255];
    for (const [cr, cg, cb, ca] of layers.slice().reverse()) o = [cr * ca + o[0] * (1 - ca), cg * ca + o[1] * (1 - ca), cb * ca + o[2] * (1 - ca)];
    return o.map(Math.round);
  };
  // <main> есть не на всех проверяемых страницах (у калькулятора его нет) —
  // тогда меряем body целиком: поля и текст относятся к содержимому.
  const main = document.querySelector("main") || document.body;
  if (!main) return { total: 0, fields: 0, fails: [], worst: 99, note: "нет ни <main>, ни <body>" };
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
    const bg = bgOf(el);
    if (!bg) { indeterminate++; continue; }
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
  /** Узлы формы проверяются отдельно: у input/textarea нет textContent, и
   * текстовый обход их не видит, а именно поля (color:#111 в слое) при тёмной
   * теме становились невидимыми на /calculator. */
  let fields = 0;
  for (const el of document.querySelectorAll("input, textarea, select")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") continue;
    const fg = rgba(s.color);
    const bg = bgOf(el);
    if (!fg || !bg) continue;
    fields++;
    const got = ratio(fg.slice(0, 3), bg);
    worst = Math.min(worst, got);
    if (got < ${THRESHOLD_TEXT} && fails.length < 40) {
      fails.push("поле " + el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "") +
        " " + s.color + " на rgb(" + bg.join(",") + ") = " + got.toFixed(2));
    }
  }
  return { total: total + fields, fields, indeterminate, fails, worst: Number(worst.toFixed(2)) };
})()`;

test("тёмная тема: текст и поля содержимого читаются", async (t) => {
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
      /* Переходы гасятся, а не «ждём дольше»: у body на /ceny и
       /cvetokorrekciya стоит `transition-colors duration-700` из @layer base
       в index.css, и мерка через 250 мс снимала середину перехода — фон
       rgb(62,62,61) вместо rgb(10,10,10), а вместе с ним и «5 провалов» там,
       где их нет. Отрицательный контроль в конце файла от этого не страдает:
       он подменяет цвет слоем, а не ждёт анимации. */
      await page.evaluate(() => {
        const st = document.createElement("style");
        st.textContent = "*,*::before,*::after{transition:none !important;animation:none !important}";
        document.head.appendChild(st);
      });
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
      const res = await page.evaluate(AUDIT) as { total: number; fields?: number; indeterminate?: number; fails: string[]; worst?: number; note?: string };
      /* Пол «сколько узлов измерено» не может быть один на всех: он обязан быть
       ниже фактического числа на каждой странице, иначе тест краснеет на
       короткой странице вместо того, чтобы краснеть на поломке. PROMPT-35 §1.3
       расширил список с 24 отобранных (в основном длинных) страниц до всех
       публичных ~80 маршрутов — среди них короткие карточки портфолио
       (13-19 узлов) и категории; общий пол снижен с 20 до 10, отдельные
       страницы — точечно через MIN_NODES (форма на /contact считается одним
       полем на метку, поэтому у неё свой порог 12). 10 — это «не прошёл
       впустую» (страница реально не отрендерилась), а не «прошёл». */
      const minNodes = MIN_NODES[route] ?? 10;
      assert.ok(res.total >= minNodes, `${route}: измерено всего ${res.total} узлов (ожидание ≥${minNodes}, ${res.note ?? ""}) — тест не должен проходить «впустую»`);
      seen.push(`${route}: узлов ${res.total} (полей ${res.fields ?? 0}), неопределённого фона ${res.indeterminate ?? 0}, ниже порога ${res.fails.length}`);
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
    t.diagnostic(`отрицательный контроль: с литералом #111 слой даёт ${back.fails.length} провалов, худший ${back.worst} (${back.fails[0]})`);
  } finally {
    await browser.close();
    server.close();
  }
});
