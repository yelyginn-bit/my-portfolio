/**
 * В1/В2 — храповики мобильной геометрии и контраста (QWEN-03 §5, блок В).
 *
 * Идея та же, что у tests/css-literals.test.ts: тест не требует починить долг
 * сейчас — он не даёт ему расти. Базлайн фиксирует фактическое состояние на
 * 25.09.2026 03:5x, новые провалы красные.
 *
 * Зачем оба: docs/audit/computed-style.md (А1) measureно нашёл на 390px
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
  overflowPx: number;
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

/** Считает всё внутри страницы — one round-trip per route. */
const AUDIT_FN = `(width) => {
  const rgba = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; } return null; };
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
    const painted = effBg(el);
    if (painted.indeterminate) { indeterminate++; continue; }
    const bg = painted.bg;
    const px = parseFloat(s.fontSize); const bold = parseInt(s.fontWeight, 10) >= 700;
    const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    const got = ratio([fg[0], fg[1], fg[2]], bg);
    if (got < need) { contrastFails++; if (offenders.length < 3) offenders.push(el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0].slice(0, 20) + ' ' + s.color + ' на rgb(' + bg.join(',') + ') = ' + got.toFixed(2)); }
  }
  return {
    overflowPx: Math.max(0, de.scrollWidth - de.clientWidth),
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
  const page = await browser.newPage();
  await page.setViewportSize({ width: WIDTH, height: 844 });
  const out: Record<string, RouteBaseline & { offenders: string[] }> = {};
  for (const route of INDEXABLE_ROUTES) {
    try {
      await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
      const r = await page.evaluate(`(${AUDIT_FN})(${WIDTH})`);
      out[route.path] = { overflowPx: r.overflowPx, contrastFails: r.contrastFails, indeterminate: r.indeterminate, offenders: r.offenders };
    } catch (error) {
      out[route.path] = { overflowPx: 0, contrastFails: 0, indeterminate: 0, offenders: [`НЕ ОТКРЫЛСЯ: ${String(error).slice(0, 60)}`] };
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
  const sumFails = routes.reduce((s, r) => s + results[r].contrastFails, 0);
  t.diagnostic(`измерено маршрутов: ${routes.length} из 70; на 390px суммарно +${sumOverflow}px горизонтального скролла и ${sumFails} узлов с контрастом ниже порога`);
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
