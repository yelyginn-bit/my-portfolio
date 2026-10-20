import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "playwright";
import { startLocalServer } from "../scripts/computed-style-audit";

/**
 * PROMPT-40 §1: hero video and marquee run even with the system "reduce motion"
 * setting; only the visitor's own footer switch (localStorage yelyginn-motion=off) stops them.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = fs.readFileSync(path.join(root, "dist/prerender/index.html"), "utf8");

test("home prerender has a Safari-autoplayable hero video with the source in the markup", () => {
  const video = home.match(/<video[^>]*>/u)?.[0] ?? "";
  assert.match(video, /\bautoplay\b/iu);
  assert.match(video, /\bmuted\b/u);
  assert.match(video, /\bloop\b/u);
  assert.match(video, /playsinline/iu);
  assert.match(video, /preload="(metadata|auto)"/u);
  assert.match(video, /poster="\/v3-assets\/hero-showreel-poster\.webp"/u);
  assert.match(home, /<video[^>]*>\s*<source src="\/v3-assets\/hero-showreel\.mp4" type="video\/mp4"/u);
  assert.match(home, /class="v3-marquee"[^>]*data-motion="true"/u, "marquee is already moving in the server HTML");
});

const trackTransform = (page: import("playwright").Page) =>
  page.locator(".v3-marquee__track").evaluate((el) => getComputedStyle(el).transform);

/**
 * Playwright's WebKit refuses `autoplay` after a fresh navigation until some user gesture
 * (probe: the same muted/playsinline markup autoplays in `setContent` but not after `goto`),
 * unlike Safari. So in WebKit one neutral tap on the hero edge stands in for "Safari allowed
 * it"; what is under test is that nothing in our code, including reduced motion, blocks it.
 */
const needsGesture = (name: string) => name === "webkit";
const tapHeroEdge = (page: import("playwright").Page) => page.locator(".v32-hero").click({ position: { x: 2, y: 400 } });

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]] as const) {
  test(`${name}: reduced motion keeps the hero video and the marquee running`, async () => {
    const { server, origin } = await startLocalServer();
    const browser = await engine.launch();
    try {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
        const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
        const page = await context.newPage();
        await page.route("**/api/**", (r) => r.fulfill({ contentType: "application/json", body: '{"available":false}' }));
        await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
        if (needsGesture(name)) await tapHeroEdge(page);
        await page.waitForTimeout(3000);
        const label = `${name} ${viewport.width}`;
        assert.equal(await page.locator("video").evaluate((v: HTMLVideoElement) => v.paused), false, `${label}: video plays by itself`);
        assert.ok(await page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime > 0), `${label}: video advances`);
        const animation = await page.locator(".v3-marquee__track").evaluate((el) => getComputedStyle(el).animationName);
        assert.notEqual(animation, "none", `${label}: marquee has an animation`);
        const first = await trackTransform(page);
        await page.waitForTimeout(600);
        const second = await trackTransform(page);
        assert.notEqual(first, second, `${label}: marquee transform changes between samples`);
        assert.equal(await page.locator("html").getAttribute("data-motion-preference"), "full");
        await context.close();
      }
    } finally { await browser.close(); server.close(); }
  });

  test(`${name}: the visitor's own "Отключить движение" choice stops everything`, async () => {
    const { server, origin } = await startLocalServer();
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      await context.addInitScript(() => localStorage.setItem("yelyginn-motion", "off"));
      const page = await context.newPage();
      await page.route("**/api/**", (r) => r.fulfill({ contentType: "application/json", body: '{"available":false}' }));
      await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
      if (needsGesture(name)) await tapHeroEdge(page);
      await page.waitForTimeout(3000);
      assert.equal(await page.locator("video").evaluate((v: HTMLVideoElement) => v.paused), true, `${name}: video stays paused`);
      assert.equal(await page.locator(".v3-marquee__track").evaluate((el) => getComputedStyle(el).animationName), "none", `${name}: marquee stands`);
      const first = await trackTransform(page);
      await page.waitForTimeout(600);
      assert.equal(first, await trackTransform(page), `${name}: marquee does not move`);
      assert.equal(await page.locator("html").getAttribute("data-motion-preference"), "reduce");
      await page.getByRole("button", { name: "Включить движение", exact: true }).click();
      await page.waitForFunction(() => document.querySelector(".v3-marquee")?.getAttribute("data-motion") === "true");
      assert.notEqual(await page.locator(".v3-marquee__track").evaluate((el) => getComputedStyle(el).animationName), "none", `${name}: marquee runs again after the visitor turns motion on`);
      await context.close();
    } finally { await browser.close(); server.close(); }
  });

  test(`${name}: static pages follow only the visitor's choice, not the system setting`, async () => {
    const { server, origin } = await startLocalServer();
    const browser = await engine.launch();
    try {
      for (const route of ["/photo", "/reels"]) {
        const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
        const page = await reduced.newPage();
        await page.goto(origin + route, { waitUntil: "domcontentloaded" });
        assert.equal(await page.locator("html").getAttribute("data-motion-preference"), "full", `${name} ${route}: system reduce does not stop motion`);
        await page.getByRole("button", { name: "Отключить движение", exact: true }).first().click();
        assert.equal(await page.locator("html").getAttribute("data-motion-preference"), "reduce", `${name} ${route}: own choice stops motion`);
        await reduced.close();
      }
    } finally { await browser.close(); server.close(); }
  });
}
