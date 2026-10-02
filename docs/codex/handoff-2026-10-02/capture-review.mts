import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs/promises";
import { startLocalServer } from "../../../scripts/computed-style-audit.ts";
const root = process.cwd() + "/docs/codex/handoff-2026-10-02";
const routes = ["content-day","reklamnye-roliki","event-video","reels","video-dlya-marketpleysov","pryamye-translyacii","photo","cvetokorrekciya","blog"];
const {server, origin} = await startLocalServer();
const browser = await chromium.launch();
try {
 const page = await browser.newPage({reducedMotion:"reduce"});
 await page.route("**/api/**", r => r.fulfill({contentType:"application/json",body:'{"available":false}'}));
 for (const width of [390,1440]) {
  await page.setViewportSize({width,height:900});
  for (const route of routes) {
   await page.goto(origin + "/" + route); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(350);
   await page.addStyleTag({content:".yel-cookie { display: none !important; }"});
   await page.screenshot({path:root+"/after/"+route+"-"+width+".png"});
  }
  const cols=3, tw=width===1440?480:260, th=Math.round(900/width*tw);
  const layers=await Promise.all(routes.map(async(route,i)=>({input:await sharp(root+"/after/"+route+"-"+width+".png").resize(tw,th).toBuffer(),left:(i%cols)*tw,top:Math.floor(i/cols)*th})));
  await sharp({create:{width:tw*3,height:th*3,channels:3,background:"#0a0a0a"}}).composite(layers).webp({quality:85}).toFile(root+"/after/overview-"+width+".webp");
 }
 for (const [width,height] of [[390,900],[1440,900],[844,390]]) {
  await page.setViewportSize({width,height});
  for (const route of ["/","/reklamnye-roliki","/portfolio/hoff-product-cards"]) {
   await page.goto(origin+route); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(350);
   const toggle=page.locator(".v3-nav__menu");
   if(await toggle.isVisible()) {await toggle.click(); await page.locator("#v3-mobile-menu").evaluate(el=>el.querySelectorAll("details").forEach(d=>{d.open=true;}));}
   else {await page.locator(".v3-nav .nav-dropdown > button").first().click();}
   await page.waitForTimeout(100);
   const name=(route==="/"?"home":route.split("/").pop())+"-menu-"+width;
   await page.screenshot({path:root+"/after/"+name+".png"});
  }
 }
 for(const folder of ["before","after"]){
  for(const name of await fs.readdir(root+"/"+folder)){
   if(name.endsWith(".png")&&!name.startsWith("overview"))await sharp(root+"/"+folder+"/"+name).webp({quality:85}).toFile(root+"/"+folder+"/"+name.replace(/\.png$/,".webp"));
  }
 }
} finally {await browser.close();server.close();}
console.log("Review captures refreshed");
