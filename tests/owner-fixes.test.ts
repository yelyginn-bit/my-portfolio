import test from "node:test";
import assert from "node:assert/strict";
import { chromium, webkit, type Page } from "playwright";
import { startLocalServer } from "../scripts/computed-style-audit";
import { ESTIMATE_DATA } from "../src/lib/pricing.data";
import { computeBreakdown, formatRubRange } from "../src/lib/calc";

const normalized = (text: string) => text.replace(/\s+/gu, " ").trim();
async function testMenu(page: Page, origin: string, route: string) {
  await page.goto(origin + route);
  const button = page.locator('.nav-dropdown > button').first();
  await button.hover();
  const menu = page.locator('.nav-dropdown-menu.is-open');
  assert.equal(await menu.count(), 1);
  const rect = await button.boundingBox();
  await page.mouse.move(rect!.x + 20, rect!.y + rect!.height + 3);
  await page.waitForTimeout(450);
  assert.equal(await button.getAttribute("aria-expanded"), "true", `${route}: hover bridge`);
  await menu.locator('a').last().hover();
  await page.waitForTimeout(450);
  assert.equal(await button.getAttribute("aria-expanded"), "true", `${route}: pointer inside menu`);
  const colors = await menu.locator('a').last().evaluate((a) => ({ color: getComputedStyle(a).color, background: getComputedStyle(a).backgroundColor }));
  assert.notEqual(colors.color, colors.background, `${route}: visible hover text`);
  await page.keyboard.press("Escape");
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  await button.focus(); await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(50);
  assert.equal(await menu.locator('a').first().evaluate((a) => a === document.activeElement), true, `${route}: ArrowDown focuses first item`);
  await page.keyboard.press("Escape");
}

test("negative control detects the old immediate-close menu defect", async () => {
  const { server, origin } = await startLocalServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport: {width:1440,height:900}});
    await page.addInitScript(() => {
      document.addEventListener('mouseout', (event) => {
        const button = (event.target as Element)?.closest('.nav-dropdown > button');
        if (button) {
          button.setAttribute('aria-expanded', 'false');
          document.querySelector('.nav-dropdown-menu.is-open')?.classList.remove('is-open');
        }
      }, true);
    });
    await assert.rejects(() => testMenu(page, origin, '/'), /hover bridge/u);
  } finally { await browser.close(); server.close(); }
});

test("owner fixes: menu, media, marquee and every estimate control in Chromium/WebKit", async () => {
  const { server, origin } = await startLocalServer();
  try {
    for (const engine of [chromium, webkit]) {
      const browser = await engine.launch();
      try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.route('**/api/**', (route) => route.fulfill({ contentType: "application/json", body: '{"available":false}' }));
        for (const route of ["/", "/reklamnye-roliki", "/reels", "/calculator"]) {
          await testMenu(page, origin, route);
          const frame = await page.evaluate(() => {
            const nav = document.querySelector('.v3-nav')!.getBoundingClientRect();
            const word = document.querySelector('.v3-footer__wordmark')!.getBoundingClientRect();
            const cta = getComputedStyle(document.querySelector('.v3-nav__cta')!);
            return {left: Math.abs(nav.left-word.left), right: Math.abs(nav.right-word.right), border: cta.borderRightWidth};
          });
          assert.ok(frame.left < 1 && frame.right < 1, `${route}: footer/nav equal insets`);
          assert.equal(frame.border, '1px', `${route}: CTA right frame`);
        }
        await page.goto(origin + "/");
        const cards = page.locator('a.v32-services__card'); assert.equal(await cards.count(), 6);
        await cards.first().hover(); await page.waitForTimeout(250);
        const border = await cards.first().evaluate((el) => getComputedStyle(el).borderTopColor);
        assert.match(border, /255.*100.*34/u);
        const track = page.locator('.v3-marquee__track');
        const before = await track.evaluate((el) => el.getBoundingClientRect().x);
        await page.waitForTimeout(500);
        const after = await track.evaluate((el) => el.getBoundingClientRect().x);
        assert.ok(Math.abs(after - before) > 2, `${engine.name()}: client tape moves`);
        await page.getByRole('button', { name: "Остановить ленту клиентов" }).click();
        await page.locator('.v3-marquee[data-motion="false"]').waitFor();
        // Wait for the browser's pending pause and font layout, not a fixed 50 ms.
        await track.evaluate(async (el) => {
          await document.fonts.ready;
          const animations = el.getAnimations();
          await Promise.all(animations.map((animation) => animation.ready));
          await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        });
        const paused = await track.evaluate((el) => ({
          x: el.getBoundingClientRect().x,
          animations: el.getAnimations().map((animation) => ({ state: animation.playState, time: animation.currentTime })),
        }));
        assert.ok(paused.animations.length > 0, `${engine.name()}: pause preserves animation`);
        assert.ok(paused.animations.every((animation) => animation.state === "paused"), `${engine.name()}: animation is paused`);
        await page.waitForTimeout(250);
        const still = await track.evaluate((el) => ({
          x: el.getBoundingClientRect().x,
          times: el.getAnimations().map((animation) => animation.currentTime),
        }));
        assert.deepEqual(still.times, paused.animations.map((animation) => animation.time), `${engine.name()}: paused timeline does not advance`);
        assert.ok(Math.abs(still.x - paused.x) < 1, `${engine.name()}: paused client tape does not move`);
        const video = page.locator('video');
        await video.evaluate((v: HTMLVideoElement) => v.pause());
        await page.getByRole('button', { name: "Воспроизвести шоурил", exact: true }).click();
        await page.waitForTimeout(500);
        assert.ok(await video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0));
        await page.getByRole('button', { name: "Включить звук", exact: true }).click();
        assert.equal(await video.evaluate((v: HTMLVideoElement) => v.muted), false);
        await page.getByRole('button', { name: "Выключить звук", exact: true }).click();
        assert.equal(await video.evaluate((v: HTMLVideoElement) => v.muted), true);
        await page.getByRole('button', { name: "Поставить шоурил на паузу" }).click();
        assert.equal(await video.evaluate((v: HTMLVideoElement) => v.paused), true);
        await page.goto(origin + "/calculator");
        await page.goto(origin + "/photo");
        assert.equal(await page.getByRole('link', { name: 'Рассчитать стоимость фотосъёмки' }).first().getAttribute('href'), '/calculator?service=photo-studio');
        await page.goto(origin + "/calculator?service=photo-reportage");
        await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Репортажная фотосъёмка'));
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 6 000 ₽');
        await page.goto(origin + "/calculator?service=photo-studio");
        await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Студийная фотосъёмка'));
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 8 000 ₽');
        await page.goto(origin + "/calculator");
        const range = page.locator('.calc-range'); assert.equal(await range.isDisabled(), true);
        for (const [shootType, data] of Object.entries(ESTIMATE_DATA)) {
          await page.getByRole('button', { name: shootType, exact: true }).click();
          const base = data.base.map((i) => i.name); const options: string[] = [];
          const checkTotal = async (days = 1, urgent = false) => {
            const b = computeBreakdown({shootType, days, urgent, baseItems: base, optionItems: options}, 0, ESTIMATE_DATA);
            const expected = normalized(formatRubRange(b.totalMin, b.totalMax));
            await page.waitForFunction((value) => document.querySelector('.calc-total-val')?.textContent?.replace(/\s+/gu, " ").trim() === value, expected, { timeout: 1500 });
            assert.equal(normalized(await page.locator('.calc-total-val').innerText()), expected, `${engine.name()}: ${shootType}`);
          };
          await checkTotal();
          for (const item of data.base) {
            const button = page.getByRole('checkbox', { name: new RegExp(item.name) });
            await button.focus(); await page.keyboard.press('Space'); base.splice(base.indexOf(item.name), 1); await checkTotal();
            await button.click(); base.push(item.name); await checkTotal();
          }
          for (const item of data.options) {
            const button = page.getByRole('checkbox', { name: new RegExp(item.name) });
            await button.click(); options.push(item.name); await checkTotal();
            await button.click(); options.splice(options.indexOf(item.name), 1); await checkTotal();
          }
          const dayItem = data.base.find((i) => i.unit === 'day') || data.options.find((i) => i.unit === 'day');
          if (dayItem) {
            if (!base.includes(dayItem.name)) { await page.getByRole('checkbox', { name: new RegExp(dayItem.name) }).click(); options.push(dayItem.name); }
            assert.equal(await range.isEnabled(), true);
            await range.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
            await checkTotal(3);
          }
          await page.getByRole('switch').click(); await checkTotal(dayItem ? 3 : 1, true);
          await page.getByRole('switch').click();
        }
        // A real failed media request must offer the embedded fallback player.
        await page.route('**/hero-showreel.mp4', (route) => route.fulfill({ status: 404, body: 'not found' }));
        await page.goto(origin + '/');
        await page.getByRole('button', { name: 'ШОУРИЛ // СМОТРЕТЬ' }).click();
        assert.equal(await page.getByRole('dialog', { name: 'Шоурил YELYGINN' }).isVisible(), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        await context.close();
        const reduced = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
        const rp = await reduced.newPage();await rp.goto(origin+'/');
        await rp.waitForTimeout(250);
        assert.equal(await rp.locator('video').evaluate((v:HTMLVideoElement)=>v.paused),true);
        await rp.getByRole('button',{name:'Воспроизвести шоурил',exact:true}).click();await rp.waitForTimeout(500);
        assert.equal(await rp.locator('video').evaluate((v:HTMLVideoElement)=>v.paused),false);
        await rp.getByRole('button',{name:'Запустить ленту клиентов'}).click();
        assert.notEqual(await rp.locator('.v3-marquee__track').evaluate(e=>getComputedStyle(e).animationName),'none');
        for (const route of ['/', '/reklamnye-roliki', '/account', '/calculator']) {
          await rp.goto(origin + route);
          await rp.getByRole('button', { name: 'Открыть меню', exact: true }).click();
          const mobile = rp.locator('#v3-mobile-menu');
          assert.equal(await mobile.isVisible(), true);
          await mobile.locator('summary').filter({ hasText: 'УСЛУГИ' }).click();
          const link = mobile.getByRole('link', { name: 'Рекламные ролики', exact: true });
          assert.equal(await link.isVisible(), true);
          await link.click();
          await rp.waitForURL(origin + '/reklamnye-roliki');
        }
        await reduced.close();
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
});
