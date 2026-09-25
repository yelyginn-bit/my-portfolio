// Тот же снимок, но с живого продакшна (для "до" в .review-shots/).
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const [label, ...routes] = process.argv.slice(2);
const origin = "https://yelyginn.ru";
const outDir = ".review-shots";
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

for (const route of routes) {
  const safe = route.replace(/\//g, "_") || "_root";
  for (const [tag, width, isMobile] of [["1440", 1440, false], ["390", 390, true]]) {
    const context = await browser.newContext(
      isMobile
        ? { viewport: { width, height: 900 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
        : { viewport: { width, height: 900 } },
    );
    const page = await context.newPage();
    await page.goto(origin + route, { waitUntil: "load" });
    await page.waitForTimeout(300);
    const file = `${outDir}/${label}${safe}-${tag}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`saved ${file}`);
    await context.close();
  }
}
await browser.close();
