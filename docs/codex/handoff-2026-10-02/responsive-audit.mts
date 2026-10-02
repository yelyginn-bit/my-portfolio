import { chromium, webkit } from "playwright";
import fs from "node:fs/promises";
import { INDEXABLE_ROUTES } from "../../../src/public/routeManifest.ts";
import { startLocalServer } from "../../../scripts/computed-style-audit.ts";
const dest = process.cwd() + "/docs/codex/handoff-2026-10-02";
const mode = process.argv[2] ?? "sample";
const matrix = JSON.parse(await fs.readFile(dest + "/viewport-tests.json", "utf8"));
const profiles = ["full","photo"].includes(mode) ? matrix.profiles : [{width:320,height:740},{width:844,height:390},{width:1200,height:900},{width:1440,height:900}];
const routes = INDEXABLE_ROUTES.map((r) => r.path).concat("/account");
const secondary = ["/", "/portfolio", "/portfolio/hoff-product-cards", "/reklamnye-roliki", "/event-video", "/reels", "/content-day", "/video-dlya-marketpleysov", "/pryamye-translyacii", "/photo", "/cvetokorrekciya", "/calculator", "/account", "/about", "/blog", "/contact", "/privacy-policy"];
const {server, origin} = await startLocalServer();
const results = [];
const retries = mode === "repair" ? JSON.parse(await fs.readFile(dest + "/full-issues.json", "utf8")) : [];
await fs.mkdir(dest + "/after", {recursive:true});
try {
 for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  const paths = mode === "photo" ? ["/photo"] : engine === chromium ? routes : secondary;
  const jobs = mode === "repair" ? [...new Map([...retries.filter(r=>r.engine===engine.name()), ...matrix.profiles.map(({width,height})=>({width,height,route:"/"}))].map(r=>[`${r.width}:${r.height}:${r.route}`, {width:r.width,height:r.height,route:r.route}])).values()] : profiles.flatMap(({width,height}) => paths.map(route => ({width,height,route})));
  let cursor = 0, completed = 0;
  try {
   await Promise.all(Array.from({length:8}, async () => {
    const page = await browser.newPage({reducedMotion:"reduce"});
    await page.addInitScript("window.__name = (fn) => fn");
    await page.route("**/api/**", r => r.fulfill({contentType:"application/json",body:'{"available":false}'}));
    await page.route("https://kinescope.io/embed/**", r => r.fulfill({contentType:"text/html",body:"<html><body>Local layout test</body></html>"}));
    while (cursor < jobs.length) {
     const job = jobs[cursor++];
     await page.setViewportSize({width:job.width,height:job.height});
     await page.goto(origin + job.route, {waitUntil:"domcontentloaded"});
     await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250); await page.evaluate(() => document.fonts.ready);
     const row = await page.evaluate(() => {
      const nav = document.querySelector(".v3-nav"), word = document.querySelector(".v3-footer__wordmark");
      const n = nav?.getBoundingClientRect(), w = word?.getBoundingClientRect();
      const controls = [...nav?.querySelectorAll<HTMLElement>("a,button") ?? []].filter(el => el.getClientRects().length);
      const fonts = controls.filter(el => !el.classList.contains("v3-nav__brand") && el.textContent?.trim()).map(el => parseFloat(getComputedStyle(el).fontSize));
      const outside = [...document.querySelectorAll<HTMLElement>("h1,h2,h3,main button,main input,main textarea")].filter(el => {
       const r = el.getBoundingClientRect();return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden" && !el.closest('[aria-hidden="true"]') && (r.left < -1 || r.right > innerWidth + 1);
      }).map(el => ({text:el.textContent?.trim().slice(0,70),class:el.className}));
      const media = [...document.querySelectorAll<HTMLImageElement>(".service-hero-media img,.service-product-media img")].map(el => {
       const r = el.getBoundingClientRect(), ratio = Number(el.width) / Number(el.height);
       const expected = Number(el.getAttribute("width")) / Number(el.getAttribute("height"));
       return {src:el.getAttribute("src"), distortion:Math.abs(r.width/r.height-expected)/expected, sourceMismatch:el.naturalWidth ? Math.abs(el.naturalWidth/el.naturalHeight-expected)/expected : null};
      });
      return {overflow:document.documentElement.scrollWidth-innerWidth,navFits:controls.every(el=>{const r=el.getBoundingClientRect();return !n || (r.left>=n.left&&r.right<=n.right);}),minNavFont:Math.min(...fonts),footerMatches:!n||!w||(Math.abs(n.left-w.left)<1&&Math.abs(n.right-w.right)<1),outside,media};
     });
     const toggle=page.locator(".v3-nav__menu");
     let menu=null;
     if (await toggle.isVisible()) {
      await toggle.click();await page.locator("#v3-mobile-menu").waitFor({state:"visible"});
      await page.waitForFunction(()=>document.body.classList.contains("v3-menu-open"), undefined, {timeout:2000});
      await page.locator("#v3-mobile-menu").evaluate(el=>el.querySelectorAll("details").forEach(d=>{d.open=true;}));
      menu=await page.locator("#v3-mobile-menu").evaluate(el=>{const r=el.getBoundingClientRect();return {fits:r.top>=0&&r.bottom<=innerHeight-8,overflow:document.documentElement.scrollWidth-innerWidth,cookieHidden:getComputedStyle(document.querySelector(".yel-cookie")!).visibility==="hidden",scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};});
      await page.keyboard.press("Escape");
     }
     results.push({engine:engine.name(),...job,...row,menu});
     completed++;
     if (completed % 100 === 0) console.log(engine.name(),completed,"/",jobs.length,"checked");
    }
    await page.close();
   }));
  } finally {await browser.close();}
  await fs.writeFile(dest + "/" + mode + "-audit.json", JSON.stringify(results,null,2));
 }
} finally {server.close();}
const bad = results.filter(r => r.overflow>0 || !r.navFits || !Number.isFinite(r.minNavFont) || r.minNavFont<11 || !r.footerMatches || r.outside.length || r.media.some(m=>m.distortion>.02||m.sourceMismatch>.02) || r.menu&&(!r.menu.fits||r.menu.overflow>0||!r.menu.cookieHidden));
await fs.writeFile(dest + "/" + mode + "-issues.json",JSON.stringify(bad,null,2));
console.log("TOTAL",results.length,"ISSUES",bad.length);
console.log(JSON.stringify(bad.slice(0,12)));
process.exitCode = bad.length ? 1 : 0;
