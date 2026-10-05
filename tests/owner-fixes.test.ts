import test from "node:test";
import assert from "node:assert/strict";
import { chromium, webkit, type Page } from "playwright";
import { startLocalServer } from "../scripts/computed-style-audit";
import { ESTIMATE_DATA } from "../src/lib/pricing.data";
import { computeBreakdown, formatRubRange } from "../src/lib/calc";
import { estimateDataToRules, rulesToEstimateData } from "../src/lib/pricing.runtime";

const normalized = (text: string) => text.replace(/\s+/gu, " ").trim();
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const contrastRatio = (foreground: string, background: string) => {
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
    assert.ok(channels?.length === 3, `expected an rgb() color, got ${color}`);
    const [r, g, b] = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const checkboxFor = (page: Page, item: (typeof ESTIMATE_DATA)[keyof typeof ESTIMATE_DATA]["base"][number]) => {
  const unit = item.unit === "day" ? "за смену" : item.unit === "hour" ? "за час" : item.unit === "person" ? "за чел." : item.unit === "frame" ? "за кадр" : "за проект";
  return page.getByRole("checkbox", { name: new RegExp(`^${escapeRegex(item.name)} · ${unit} `, "u") });
};

test("approved color tiers replace the base price and photo retouch is priced per frame", () => {
  const color = ESTIMATE_DATA["Цветокоррекция"];
  const base = color.base[0]!;
  const extended = color.options[0]!;
  const complex = color.options[1]!;
  const total = (optionItems: string[], baseItems = [base.name]) => computeBreakdown({
    shootType: "Цветокоррекция", days: 1, hours: 1, urgent: false,
    baseItems, optionItems,
  }, 0, ESTIMATE_DATA).subtotalMin;

  assert.equal(total([]), 5000);
  assert.equal(total([extended.name]), 9000, "a tier remains full price even when stale UI state still includes the base");
  assert.equal(total([extended.name], []), 9000, "the extended tier stands alone");
  assert.equal(total([complex.name]), 15000);
  assert.equal(total([complex.name], []), 15000);
  assert.equal(ESTIMATE_DATA["Студийная фотосъёмка"].options[0]?.unit, "frame");
  assert.equal(ESTIMATE_DATA["Репортажная фотосъёмка"].options[0]?.unit, "frame");

  const activeRules = estimateDataToRules(ESTIMATE_DATA).map((rule, index) => ({ ...rule, id: String(index) }));
  const hydrated = rulesToEstimateData(activeRules);
  assert.equal(hydrated["Цветокоррекция"].options[0]?.replaces, "Цветокоррекция — базовый формат");
  assert.equal(hydrated["Студийная фотосъёмка"].options[0]?.unit, "frame");
});
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
        const marqueeColors = await page.locator('.v3-marquee__track span, .v3-marquee__track b').evaluateAll((els) => els.map((el) => ({
          foreground: getComputedStyle(el).color,
          background: getComputedStyle(el.closest('.v3-marquee')!).backgroundColor,
        })));
        assert.ok(marqueeColors.length > 0, `${engine.name()}: marquee labels exist`);
        for (const colors of marqueeColors) {
          assert.ok(contrastRatio(colors.foreground, colors.background) >= 4.5, `${engine.name()}: marquee contrast is below WCAG AA`);
        }
        assert.equal(await page.locator('.v3-marquee__toggle').count(), 0, `${engine.name()}: no pause control inside the marquee`);
        const motionToggle = page.getByRole('button', { name: 'Отключить движение', exact: true });
        await motionToggle.click();
        assert.equal(await page.locator('.v3-marquee__track').evaluate((el) => getComputedStyle(el).animationName), 'none');
        assert.equal(await page.getByRole('button', { name: 'Включить движение', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.getByRole('button', { name: 'Включить движение', exact: true }).click();
        // Moving through unrelated controls must not pause the continuously moving client tape.
        await page.locator('.v3-nav__cta').first().click();
        await page.goto(origin + '/');
        const afterNavigation = await track.evaluate((el) => el.getBoundingClientRect().x);
        await page.waitForTimeout(350);
        const stillMoving = await track.evaluate((el) => el.getBoundingClientRect().x);
        assert.ok(Math.abs(stillMoving - afterNavigation) > 1, `${engine.name()}: client tape resumes after navigation`);
        const video = page.locator('video');
        await video.evaluate((v: HTMLVideoElement) => v.pause());
        await page.getByRole('button', { name: "Воспроизвести шоурил", exact: true }).click();
        await page.waitForTimeout(500);
        assert.ok(await video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0));
        await page.getByRole('button', { name: "Поставить шоурил на паузу" }).click();
        assert.equal(await video.evaluate((v: HTMLVideoElement) => v.paused), true);
        await page.goto(origin + "/calculator");
        await page.goto(origin + "/photo");
        assert.equal(await page.getByRole('link', { name: 'Рассчитать стоимость фотосъёмки' }).first().getAttribute('href'), '/calculator?service=photo-studio&from=%2Fphoto');
        await page.goto(origin + "/calculator?service=photo-reportage");
        await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Репортажная фотосъёмка'));
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 12 000 ₽');
        await page.locator('#estimate-hours').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 18 000 ₽');
        await page.goto(origin + "/calculator?service=photo-studio");
        await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Студийная фотосъёмка'));
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 8 000 ₽');
        await page.locator('#estimate-hours').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 16 000 ₽');
        await page.goto(origin + "/calculator?service=content-day&from=%2Fcontent-day");
        await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Контент для бизнеса'));
        const contentDayTotal = normalized(await page.locator('.calc-total-val').innerText());
        assert.equal(contentDayTotal, 'от 45 000 ₽');
        await page.goto(origin + "/calculator?service=color");
        await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Цветокоррекция'));
        const color = ESTIMATE_DATA["Цветокоррекция"];
        const colorBase = checkboxFor(page, color.base[0]!);
        const colorExtended = checkboxFor(page, color.options[0]!);
        const colorComplex = checkboxFor(page, color.options[1]!);
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 5 000 ₽');
        await colorExtended.click();
        assert.equal(await colorBase.getAttribute('aria-checked'), 'false');
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 9 000 ₽');
        await colorBase.click();
        assert.equal(await colorExtended.getAttribute('aria-checked'), 'false');
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 5 000 ₽');
        await colorComplex.click();
        assert.equal(await colorBase.getAttribute('aria-checked'), 'false');
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 15 000 ₽');
        await page.getByRole('button', { name: 'Студийная фотосъёмка', exact: true }).click();
        const retouch = checkboxFor(page, ESTIMATE_DATA["Студийная фотосъёмка"].options[0]!);
        assert.match(await retouch.getAttribute('aria-label') ?? await retouch.innerText(), /за кадр/u);
        await retouch.click();
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), 'от 8 300 ₽');
        await page.goto(origin + "/calculator");
        const range = page.locator('.calc-range'); assert.equal(await range.isDisabled(), true);
        for (const [shootType, data] of Object.entries(ESTIMATE_DATA)) {
          await page.getByRole('button', { name: shootType, exact: true }).click();
          const base = data.base.map((i) => i.name); const options: string[] = [];
          const checkTotal = async (days = 1, urgent = false) => {
            const hours = shootType === 'Репортажная фотосъёмка' ? 2 : 1;
            const b = computeBreakdown({shootType, days, hours, urgent, baseItems: base, optionItems: options}, 0, ESTIMATE_DATA);
            const expected = normalized(formatRubRange(b.totalMin, b.totalMax));
            await page.waitForFunction((value) => document.querySelector('.calc-total-val')?.textContent?.replace(/\s+/gu, " ").trim() === value, expected, { timeout: 1500 });
            assert.equal(normalized(await page.locator('.calc-total-val').innerText()), expected, `${engine.name()}: ${shootType}`);
          };
          await checkTotal();
          for (const item of data.base) {
            const button = checkboxFor(page, item);
            await button.focus(); await page.keyboard.press('Space'); base.splice(base.indexOf(item.name), 1); await checkTotal();
            await button.click(); base.push(item.name); await checkTotal();
          }
          for (const item of data.options) {
            const button = checkboxFor(page, item);
            await button.click(); options.push(item.name); await checkTotal();
            await button.click(); options.splice(options.indexOf(item.name), 1); await checkTotal();
          }
          const dayItem = data.base.find((i) => i.unit === 'day') || data.options.find((i) => i.unit === 'day');
          if (dayItem) {
            if (!base.includes(dayItem.name)) { await checkboxFor(page, dayItem).click(); options.push(dayItem.name); }
            assert.equal(await range.isEnabled(), true);
            await range.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
            await checkTotal(3);
          }
          const rushSwitch = page.getByRole('switch');
          const rushEligible = [...data.base, ...data.options].some((item) => item.rushEligible && (base.includes(item.name) || options.includes(item.name)));
          if (rushEligible) {
            await rushSwitch.click(); await checkTotal(dayItem ? 3 : 1, true);
            await rushSwitch.click();
          } else {
            assert.equal(await rushSwitch.isDisabled(), true, `${shootType}: express edit not available for this selection`);
          }
        }
        await page.getByRole('button', { name: 'Монтаж Reels', exact: true }).click();
        const rushSwitch = page.getByRole('switch');
        await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Монтаж Reels') && !document.querySelector('[role="switch"]')?.hasAttribute('disabled'));
        assert.equal(await rushSwitch.isEnabled(), true);
        await rushSwitch.click();
        assert.equal(normalized(await page.locator('.calc-total-val').innerText()), '3 000 ₽ – 13 500 ₽');
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
        assert.equal(await rp.locator('.v3-marquee__toggle').count(), 0);
        assert.equal(await rp.locator('.v3-marquee__track').evaluate(e=>getComputedStyle(e).animationName),'none');
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
        await rp.goto(origin + '/photo');
        const necessaryCookies = rp.getByRole('button', { name: 'Только необходимые', exact: true });
        if (await necessaryCookies.isVisible()) await necessaryCookies.click();
        await rp.getByRole('button', { name: 'Включить движение', exact: true }).click();
        assert.equal(await rp.locator('html').getAttribute('data-motion-preference'), 'full', 'static footer enables motion in one click');
        await rp.goto(origin + '/');
        await rp.waitForFunction(() => document.querySelector('.v3-marquee')?.getAttribute('data-motion') === 'true');
        assert.notEqual(await rp.locator('.v3-marquee__track').evaluate(e => getComputedStyle(e).animationName), 'none', 'static footer preference reaches React marquee');
        await reduced.close();
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
});

test("hero autoplays muted on mobile and desktop, and defers for reduced motion/saveData", async () => {
  const { server, origin } = await startLocalServer();
  const browser = await chromium.launch();
  try {
    for (const mode of ['mobile', 'reduced', 'save-data', 'desktop', 'explicit-on']) {
      const context = await browser.newContext({
        viewport: { width: mode === 'mobile' ? 390 : 1440, height: 844 },
        reducedMotion: mode === 'reduced' || mode === 'explicit-on' ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      if (mode === 'explicit-on') await page.addInitScript(() => localStorage.setItem('yelyginn-motion', 'on'));
      if (mode === 'save-data') await page.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
      });
      await page.route('**/api/**', r => r.fulfill({ contentType: 'application/json', body: '{"available":false}' }));
      let mp4Requests = 0;
      page.on('request', r => { if (r.url().includes('hero-showreel.mp4')) mp4Requests++; });
      await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
      const video = page.locator('video');
      assert.equal(await video.evaluate((v: HTMLVideoElement) => v.muted && v.playsInline), true, mode + ': muted inline video');
      if (mode === 'mobile' || mode === 'desktop' || mode === 'explicit-on') {
        await page.waitForFunction(() => {
          const v = document.querySelector('video');
          return !!v?.getAttribute('src') && !v.paused && v.currentTime > 0;
        });
        assert.ok(mp4Requests > 0, mode + ': autoplay loads and advances video');
      } else {
        await page.waitForTimeout(1800);
        assert.equal(mp4Requests, 0, mode + ': remains poster only without gesture');
        assert.equal(await video.getAttribute('src'), null);
        await page.getByRole('button', { name: 'Воспроизвести шоурил', exact: true }).click();
        await page.waitForFunction(() => {
          const v = document.querySelector('video');
          return !!v && !v.paused && v.currentTime > 0;
        });
      }
      assert.ok(mp4Requests > 0, mode + ': genuine playback after request');
      await page.getByRole('button', { name: 'Поставить шоурил на паузу', exact: true }).click();
      await page.waitForTimeout(1400);
      assert.equal(await page.locator('video').evaluate((v: HTMLVideoElement) => v.paused), true, mode + ': manual pause is preserved');
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
});

test("color divider follows the clip boundary during drag, hover and scrolling in Chromium/WebKit", async () => {
  const { server, origin } = await startLocalServer();
  try {
    for (const engine of [chromium, webkit]) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        await page.goto(origin + '/');
        await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
        const frame = page.locator('.color-compare-frame').first();
        const handle = frame.getByRole('slider');
        const checkBoundary = async (expected: number) => {
          const value = await frame.evaluate((element) => {
            const image = element.querySelector('.color-compare-img--before')!;
            const divider = element.querySelector('.color-compare-handle')!;
            const rect = image.getBoundingClientRect(), grip = divider.getBoundingClientRect();
            const clip = getComputedStyle(image).clipPath;
            const right = Number(clip.match(/([\d.]+)%/u)?.[1]);
            return { boundary: rect.left + rect.width * (1 - right / 100), center: grip.left + grip.width / 2, position: Number(divider.getAttribute('aria-valuenow')), transform: getComputedStyle(image).transform };
          });
          assert.ok(Math.abs(value.boundary - value.center) <= 2, `${engine.name()}: clip/divider drift at ${expected}%`);
          assert.ok(Math.abs(value.position - expected) <= 1, `${engine.name()}: slider reaches ${expected}%`);
          assert.equal(value.transform, 'none', 'hover does not move the comparison image');
        };
        for (const position of [20, 50, 80]) {
          await frame.scrollIntoViewIfNeeded();
          const rect = (await frame.boundingBox())!;
          await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
          await page.mouse.down();
          await page.mouse.move(rect.x + rect.width * position / 100, rect.y + rect.height / 2, { steps: 4 });
          await page.mouse.up();
          await checkBoundary(position);
          await frame.hover();
          await page.waitForTimeout(200);
          await page.evaluate(() => window.scrollBy(0, 120));
          await checkBoundary(position);
        }
        await handle.focus();
        await page.keyboard.press('Home'); await checkBoundary(0);
        await page.keyboard.press('End'); await checkBoundary(100);
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
});

test("desktop navigation highlights orange, contact opens, and five raster AI logos load on React/static pages", async () => {
  const { server, origin } = await startLocalServer();
  try {
    for (const engine of [chromium, webkit]) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        await page.route('**/api/**', r => r.fulfill({ contentType: 'application/json', body: '{"available":false}' }));
        for (const path of ['/photo', '/ceny', '/calculator', '/video-dlya-marketpleysov']) {
          await page.goto(origin + path);
          for (const link of [page.locator('.v3-nav__links a[href="/photo"]').first(), page.locator('.v3-nav__links a[href="/ceny"]').first(), page.locator('.v3-nav__cta')]) {
            await link.hover(); await page.waitForTimeout(250);
            const colors = await link.evaluate(a => ({ color: getComputedStyle(a).color, background: getComputedStyle(a).backgroundColor }));
            assert.equal(colors.background, 'rgb(255, 100, 34)', `${engine.name()} ${path}: orange hover`);
            assert.equal(colors.color, 'rgb(10, 10, 10)', `${engine.name()} ${path}: dark hover text`);
          }
          const logos = page.locator('.v3-ai-ask__actions nav img');
          assert.equal(await logos.count(), 5);
          await logos.first().scrollIntoViewIfNeeded();
          await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.v3-ai-ask__actions nav img')].every(i => i.complete && i.naturalWidth > 0));
          assert.ok((await logos.evaluateAll(images => images.map(i => i.getAttribute('src')))).every(src => /\.(png|webp)$/u.test(src!)));
          const contact = page.locator('.v3-nav__cta');
          const destination = new URL((await contact.getAttribute('href'))!, origin);
          assert.ok(destination.pathname === '/contact' || (destination.pathname === '/' && destination.hash === '#contact'), 'CTA targets a contact form');
          await contact.click();
          await page.waitForURL(destination.href);
          assert.equal(await page.locator('#contact').isVisible(), true);
        }
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
});
