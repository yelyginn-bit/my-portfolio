import test from "node:test";
import assert from "node:assert/strict";
import { chromium, webkit, type Page } from "playwright";
import { startLocalServer } from "../scripts/computed-style-audit";

async function readableNav(page: Page) {
  const data = await page.evaluate(() => {
    const nav = document.querySelector(".v3-nav")!;
    const bounds = nav.getBoundingClientRect();
    const items = [...nav.querySelectorAll<HTMLElement>("a, button")].filter((el) => el.getClientRects().length);
    return {
      fonts: items.filter((el) => !el.classList.contains("v3-nav__brand") && el.textContent!.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize)),
      outside: items.some((el) => { const r = el.getBoundingClientRect(); return r.left < bounds.left || r.right > bounds.right; }),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  assert.ok(data.fonts.length > 0 && data.fonts.every((size) => size >= 11), "navigation text must stay readable");
  assert.equal(data.outside, false, "navigation controls stay inside the frame");
  assert.equal(data.overflow, 0, "no horizontal page overflow");
}

test("negative control detects unreadable navigation from the handoff", async () => {
  const { server, origin } = await startLocalServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(origin);
    await page.addStyleTag({ content: ".v3-nav .v3-nav__links a, .v3-nav .nav-dropdown > button { font-size: 8.32px !important; }" });
    await assert.rejects(() => readableNav(page), /navigation text must stay readable/u);
  } finally { await browser.close(); server.close(); }
});

test("negative control detects fixed-size poster words expanding a 320px page", async () => {
  const { server, origin } = await startLocalServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 740 } });
    await page.goto(origin + "/portfolio");
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: ".portfolio-posters > div { grid-template-columns: repeat(2,minmax(0,1fr)) !important; } .portfolio-posters h3 { font-size: 1.15rem !important; }" });
    await assert.rejects(() => readableNav(page), /no horizontal page overflow/u);
  } finally { await browser.close(); server.close(); }
});

async function mosaicTitlesFit(page: Page) {
  const overflow = await page.locator(".portfolio-mosaic__item h3").evaluateAll((titles) => titles.some((title) => {
    const card = title.closest(".portfolio-mosaic__item")!.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(title);
    return [...range.getClientRects()].some((r) => r.left < card.left || r.right > card.right);
  }));
  assert.equal(overflow, false, "mosaic titles stay inside their cards");
}

test("negative control detects cropped mosaic titles on an intermediate viewport", async () => {
  const { server, origin } = await startLocalServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(origin + "/portfolio"); await page.evaluate(() => document.fonts.ready);
    await mosaicTitlesFit(page);
    await page.addStyleTag({ content: ".portfolio-mosaic__item > div { grid-template-columns: auto 1fr !important; } .portfolio-mosaic__item h3 { min-width: auto !important; font-size: 1.45rem !important; }" });
    await assert.rejects(() => mosaicTitlesFit(page), /mosaic titles stay inside their cards/u);
  } finally { await browser.close(); server.close(); }
});

test("shared navigation: readable labels, low-window scroll, cookie choice and keyboard", async () => {
  const { server, origin } = await startLocalServer();
  try {
    for (const engine of [chromium, webkit]) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage();
        await page.route("**/api/**", (route) => route.fulfill({ contentType: "application/json", body: '{"available":false}' }));
        for (const route of ["/", "/portfolio", "/reklamnye-roliki", "/calculator", "/portfolio/hoff-product-cards"]) {
          for (const [width, height] of [[320, 740], [600, 800], [640, 360], [667, 375], [844, 390], [1199, 900], [1200, 900], [1440, 900], [1440, 450]]) {
            await page.setViewportSize({ width, height });
            await page.goto(origin + route);
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(300);
            await readableNav(page);
            await mosaicTitlesFit(page);
            const toggle = page.locator(".v3-nav__menu");
            if (!await toggle.isVisible()) continue;
            const cookie = page.locator(".yel-cookie");
            assert.equal(await cookie.isVisible(), true);
            assert.equal(await cookie.evaluate(el=>getComputedStyle(el).transitionDuration), "0s", "cookie visibility never waits for a reduced-motion transition");
            await toggle.click();
            const panel = page.getByRole("dialog", { name: "Меню сайта" });
            await panel.waitFor();
            assert.equal(await cookie.isVisible(), false, "cookie panel does not cover the menu");
            assert.equal(await page.evaluate(() => localStorage.getItem("cookie_consent_v2")), null, "opening the menu does not accept cookies");
            for (const summary of await panel.locator("summary").all()) await summary.click();
            const geometry = await panel.evaluate((el) => ({ bottom: el.getBoundingClientRect().bottom, height: innerHeight, scroll: el.scrollHeight, client: el.clientHeight }));
            assert.ok(geometry.bottom <= geometry.height - 8, "expanded menu remains inside the viewport");
            if (height <= 450) assert.ok(geometry.scroll > geometry.client, "low viewport has a scrollable menu");
            const last = panel.locator("a").last();
            await last.focus();
            await page.keyboard.press("Tab");
            assert.equal(await toggle.evaluate((el) => el === document.activeElement), true, "Tab stays in the open menu");
            await page.keyboard.press("Escape");
            await panel.waitFor({ state: "hidden" });
            assert.equal(await toggle.evaluate((el) => el === document.activeElement), true, "Escape restores focus");
            assert.equal(await cookie.isVisible(), true, "unanswered consent returns");
            assert.equal(await page.evaluate(() => document.querySelector("main")?.inert), false, "background becomes interactive again");
            await toggle.click();
            await page.setViewportSize({ width: 1440, height: 900 });
            await panel.waitFor({ state: "hidden" });
            assert.equal(await page.evaluate(() => document.body.classList.contains("v3-menu-open")), false, "resize clears scroll lock");
          }
        }
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
});


test("static photo layout survives a delayed shell without moving the hero", async () => {
  const { server, origin } = await startLocalServer();
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      let releaseShell!: () => void;
      const shellGate = new Promise<void>(resolve => { releaseShell = resolve; });
      await page.route("**/site-shell.js", async route => { await shellGate; await route.continue(); });
      await page.goto(origin + "/photo", { waitUntil: "commit" });
      await page.locator(".service-hero-layout").waitFor({ state: "visible" });
      await page.evaluate(() => document.fonts.ready);
      const geometry = () => page.evaluate(() => ({
        staticClass: document.body.classList.contains("site-static"),
        hero: document.querySelector(".service-hero-layout")!.getBoundingClientRect().toJSON(),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      const before = await geometry();
      assert.equal(before.staticClass, true, "static layout is in the initial HTML before shell execution");
      releaseShell();
      await page.waitForLoadState("domcontentloaded");
      const after = await geometry();
      assert.deepEqual(after.hero, before.hero, "deferred shell cannot switch the hero layout");
      assert.equal(after.overflow, 0);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
