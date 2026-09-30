/**
 * Открытое мобильное меню (390px): каждый видимый текст читается на фоне
 * панели, контраст ≥ 4.5 (PROMPT-36c). Закрытое меню тесты контраста не видели —
 * так «Услуги» и «Портфолио» (summary) остались белыми на светлой панели.
 * Запуск: npm run build && npx tsx --test tests/mobile-menu-contrast.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

const PAGE_FN = `async () => {
  const b = document.querySelector("button[aria-controls='v3-mobile-menu']"); b.click();
  await new Promise((r) => setTimeout(r, 900));
  const m = document.getElementById("v3-mobile-menu");
  const parse = (c) => { const n = (c.match(/[\\d.]+/g) || []).map(Number); return c.startsWith("color(") ? [n[0]*255, n[1]*255, n[2]*255, n[3] ?? 1] : [n[0], n[1], n[2], n[3] ?? 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bg = parse(getComputedStyle(m).backgroundColor);
  const out = [];
  for (const el of m.querySelectorAll("*")) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const r = el.getBoundingClientRect();
    if (!own || r.width < 2 || r.height < 2) continue;
    const fg = parse(getComputedStyle(el).color);
    const a = fg[3], mix = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
    const L1 = lum(mix), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    out.push({ text: el.textContent.trim().slice(0, 24), ratio: Math.round(ratio * 100) / 100 });
  }
  return out;
}`;

test("мобильное меню: весь текст читается на панели (≥ 4.5)", async (t) => {
  let browser;
  try { const { chromium } = await import("playwright"); browser = await chromium.launch({ headless: true }); } catch { t.skip("нет Playwright/chromium"); return; }
  const { startLocalServer } = await import("../scripts/computed-style-audit.ts");
  const { server, origin } = await startLocalServer();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await page.goto(`${origin}/`, { waitUntil: "load" });
    const rows = await page.evaluate(`(${PAGE_FN})()`) as Array<{ text: string; ratio: number }>;
    assert.ok(rows.length >= 8, `в меню нашлось только ${rows.length} текстов — оно не открылось`);
    const bad = rows.filter((r) => r.ratio < 4.5).map((r) => `«${r.text}» ${r.ratio}`);
    assert.deepEqual(bad, [], `нечитаемый текст в мобильном меню: ${bad.join(", ")}`);
  } finally { await browser.close(); server.close(); }
});
