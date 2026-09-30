/**
 * Открытое мобильное меню на ТРЁХ типах страниц (QWEN-09 §1.5).
 *
 * Почему отдельный файл, а не расширение mobile-menu-contrast.test.ts: тот тест
 * принадлежит Claude Code (параллельная работа в main), и он проверяет только
 * главную. А поломка ровно там, где главная её не показывает: на статике
 * (`/photo`, `/reels`) пункты белые на светлой панели, потому что
 * `.site-static a:not([class*="bb-"]) { color: inherit }` специфичнее
 * `.v3-mobile-menu a { color: #0a0a0a }` и тянет белый базовый цвет тёмной
 * панели. На главной того правила нет — поэтому главная зелёная.
 *
 * Второй пропуск того же теста: он меряет текст, но не саму панель. Владелец
 * жаловался, что сквозь меню просвечивает подвал, — это alpha 0.98 у фона, и
 * контраст против «rgb(237,236,231)» это не ловит: цифры сходятся, а на экране
 * каша. Здесь панель проверяется на непрозрачность явно.
 *
 *   npm run build && npx tsx --test tests/mobile-menu-pages.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

const ROUTES = ["/", "/photo", "/reels", "/portfolio/sber-arhitektura"];

const PROBE = String.raw`async () => {
  const btn = document.querySelector("button[aria-controls='v3-mobile-menu']");
  if (btn) btn.click();
  await new Promise((r) => setTimeout(r, 700));
  const m = document.getElementById("v3-mobile-menu");
  if (!m) return { error: "нет #v3-mobile-menu" };
  const rgba = (c) => {
    let x = String(c).match(/rgba?\(([^)]+)\)/u);
    if (x) { const p = x[1].split(/[\s,\/]+/u).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    x = String(c).match(/color\(srgb\s+([^)]+)\)/u);
    if (x) { const p = x[1].split(/[\s\/]+/u).filter(Boolean).map(Number); const q = (v) => Math.round(v > 1 ? v : v * 255); return [q(p[0]), q(p[1]), q(p[2]), p.length > 3 ? p[3] : 1]; }
    return null;
  };
  const lum = (c) => { const v = c.slice(0, 3).map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { const L = []; let n = el;
    while (n) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { L.push(c); if (c[3] === 1) break; } n = n.parentElement; }
    const R = L.slice().reverse(); let o = [255, 255, 255];
    for (const [r, g, b, a] of R) o = [Math.round(r * a + o[0] * (1 - a)), Math.round(g * a + o[1] * (1 - a)), Math.round(b * a + o[2] * (1 - a))];
    return o;
  };
  const panel = rgba(getComputedStyle(m).backgroundColor) || [0, 0, 0, 0];
  const items = [];
  for (const el of m.querySelectorAll("a, summary")) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const t = (el.textContent || "").trim();
    if (!t) continue;
    const s = getComputedStyle(el);
    const fg = rgba(s.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const px = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    const a = fg[3];
    const mix = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
    const got = ratio(mix, bg);
    items.push({ text: t.slice(0, 26), kind: el.tagName.toLowerCase(), ratio: Math.round(got * 100) / 100, need });
  }
  return { panelAlpha: panel[3], panelBg: panel.slice(0, 3).join(","), items };
}`;

test("открытое меню: панель непрозрачная и каждый пункт читается на всех типах страниц", async (t) => {
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
  } catch { t.skip("нет Playwright/chromium"); return; }
  const { startLocalServer } = await import("../scripts/computed-style-audit.ts");
  const { server, origin } = await startLocalServer();
  const problems: string[] = [];
  try {
    for (const route of ROUTES) {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
      await page.goto(`${origin}${route}`, { waitUntil: "load" });
      await page.waitForFunction(() => (document as any).fonts?.status === "loaded").catch(() => {});
      await page.waitForTimeout(300);
      const r = await page.evaluate(`(${PROBE})()`) as any;
      await page.context().close();
      if (r.error) { problems.push(`${route}: ${r.error}`); continue; }
      assert.ok(r.items.length >= 8, `${route}: в открытом меню найдлено только ${r.items.length} пунктов — меню не открылось`);
      if (r.panelAlpha < 1) problems.push(`${route}: панель меню полупрозрачная (alpha ${r.panelAlpha}, фон rgb(${r.panelBg})) — сквозь неё просвечивает страница`);
      for (const it of r.items) {
        if (it.ratio < it.need) problems.push(`${route}: «${it.text}» <${it.kind}> ${it.ratio} при пороге ${it.need} на rgb(${r.panelBg})`);
      }
    }
  } finally { await browser.close(); server.close(); }
  assert.deepEqual(problems, [], `открытое меню сломано:\n${problems.join("\n")}`);
});
