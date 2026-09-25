// PROMPT-33 §0.3: скриншоты до/после в .review-shots/ (не в git).
// Использование: npx tsx scripts/review-shot.mjs <label> <route1> [route2 ...]
// Снимает каждый маршрут на 1440 и 390, полной страницей.
import { startLocalServer } from "./computed-style-audit.ts";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const [label, ...routes] = process.argv.slice(2);
if (!label || routes.length === 0) {
  console.error("usage: review-shot.mjs <label> <route1> [route2 ...]");
  process.exit(1);
}

const { server, origin } = await startLocalServer();
const browser = await chromium.launch();
const outDir = ".review-shots";
await mkdir(outDir, { recursive: true });

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
server.close();
