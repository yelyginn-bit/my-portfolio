import test from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorType, resolveServiceContext, serviceContactHref } from "../src/lib/service-context";

test("service CTA context is limited to known services and public source pages", () => {
  assert.deepEqual(resolveServiceContext("?service=reels&from=%2Freels"), {
    service: "Reels",
    sourcePath: "/reels",
  });
  assert.deepEqual(resolveServiceContext("", "/cvetokorrekciya"), {
    service: "Цветокоррекция",
    sourcePath: "/cvetokorrekciya",
  });
  assert.deepEqual(resolveServiceContext("?service=unknown&from=https%3A%2F%2Fevil.invalid"), {
    service: "Съёмка // оператор",
    sourcePath: "/",
  });
  assert.deepEqual(resolveServiceContext("?service=event&from=%2Fnot-a-public-service"), {
    service: "Событие",
    sourcePath: "/",
  });
  assert.equal(serviceContactHref("photo", "/photo"), "/?service=photo&from=%2Fphoto#contact");
  assert.deepEqual(resolveServiceContext("?service=content-day&from=%2Fcontent-day"), {
    service: "Контент-съёмка // фото и видео",
    sourcePath: "/content-day",
  });
  assert.deepEqual(resolveServiceContext("?service=photo-reportage&from=%2Fphoto", "/calculator"), {
    service: "Фотосъёмка",
    sourcePath: "/photo",
  });
  const sourcePages = [
    ["/portretnaya-fotosessiya", "photo", "photo-studio"],
    ["/reportazhnaya-fotosemka", "photo", "photo-reportage"],
    ["/reels", "reels", "reels"],
    ["/reklamnye-roliki", "advertising", "advertising"],
    ["/event-video", "event", "event"],
    ["/cvetokorrekciya", "color", "color"],
    ["/pryamye-translyacii", "livestream", "livestream"],
  ] as const;
  for (const [path, service, calculatorService] of sourcePages) {
    assert.equal(resolveServiceContext(`?service=${service}&from=${encodeURIComponent(path)}`, "/").sourcePath, path);
    assert.equal(resolveServiceContext(`?service=${calculatorService}&from=${encodeURIComponent(path)}`, "/calculator").sourcePath, path);
    assert.equal(serviceContactHref(service, path), `/?service=${service}&from=${encodeURIComponent(path)}#contact`);
  }
});

test("calculator only preselects service types represented by its active estimate", () => {
  const available = ["Контент для бизнеса", "Цветокоррекция"];
  assert.equal(resolveCalculatorType("content-day", available), "Контент для бизнеса");
  assert.equal(resolveCalculatorType("color", available), "Цветокоррекция");
  assert.equal(resolveCalculatorType("livestream", available), undefined);
  assert.equal(resolveCalculatorType("not-a-service", available), undefined);
});


test("catalogue work links point directly to indexable public pages", async () => {
  const { PUBLIC_PRICES } = await import("../src/lib/pricing.data");
  const { SERVICE_SUMMARIES } = await import("../src/config/site");
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest");
  const canonical = new Set(INDEXABLE_ROUTES.map((route) => route.path));
  for (const item of [...PUBLIC_PRICES, ...SERVICE_SUMMARIES]) {
    const route = new URL(item.portfolioHref, "https://yelyginn.ru").pathname;
    assert.ok(canonical.has(route), `${item.id}: work link ${item.portfolioHref} must not use a private route or redirect`);
  }
});

test("marketplace public estimate derives one package from the catalogue without changing existing prices", async () => {
  const {PUBLIC_CALCULATOR_DATA} = await import("../src/lib/calculatorPublicData");
  const {ESTIMATE_DATA, PUBLIC_PRICE_BY_ID} = await import("../src/lib/pricing.data");
  const {computeBreakdown, formatRubRange} = await import("../src/lib/calc");
  const item = PUBLIC_PRICE_BY_ID.marketplace;
  const group = PUBLIC_CALCULATOR_DATA[item.title];
  assert.equal(Object.keys(PUBLIC_CALCULATOR_DATA).length, Object.keys(ESTIMATE_DATA).length + 1);
  for (const [type, value] of Object.entries(ESTIMATE_DATA)) assert.strictEqual(PUBLIC_CALCULATOR_DATA[type], value, type);
  assert.equal(group.base.length, 1);
  assert.equal(group.base[0].name, item.description.replace(/\.$/u, ""));
  assert.deepEqual(group.options, [], "there are no priced marketplace add-ons in the source");
  assert.equal(resolveCalculatorType("marketplace", Object.keys(PUBLIC_CALCULATOR_DATA)), item.title);
  const total = computeBreakdown({shootType:item.title,days:5,hours:8,baseItems:[group.base[0].name],optionItems:[],urgent:true},0,PUBLIC_CALCULATOR_DATA);
  assert.equal(formatRubRange(total.totalMin,total.totalMax).replace(/\s/gu," "),item.price.replace(/\s/gu," "));
});

test("marketplace logos load and the page calculator CTA preselects its published package on mobile and desktop", async () => {
  const {chromium,webkit}=await import("playwright");
  const {startLocalServer}=await import("../scripts/computed-style-audit.ts");
  const {PUBLIC_PRICE_BY_ID}=await import("../src/lib/pricing.data");
  const {readFile}=await import("node:fs/promises");
  for (const name of ["wildberries","ozon"]) {
    const svg=await readFile(`public/marketplace-logos/${name}.svg`,"utf8");
    assert.match(svg,/<svg\b/u);
    assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b|\bon\w+=|\b(?:href|xlink:href)=/iu,"logos are self-contained vectors");
  }
  const local=await startLocalServer();
  try {for(const engine of [chromium,webkit]) {
    const browser=await engine.launch();
    try {for(const width of [390,1440]) {
      const page=await browser.newPage({viewport:{width,height:900}});
      await page.route("**/*",r=>["GET","HEAD","OPTIONS"].includes(r.request().method())?r.continue():r.abort());
      await page.route("**/api/**",r=>r.fulfill({contentType:"application/json",body:JSON.stringify({available:false,csrfToken:"local-fixture"})}));
      await page.goto(local.origin+"/video-dlya-marketpleysov");
      const consent=page.getByRole("button",{name:"Только необходимые",exact:true});if(await consent.isVisible())await consent.click();
      const row=page.locator(".mk-platforms");
      assert.match(await row.innerText(),/Видео под требования Wildberries и Ozon/u);
      assert.doesNotMatch(await row.innerText(),/партнёр|официальный подрядчик/iu);
      for(const name of ["Wildberries","Ozon"]) {
        const image=row.getByAltText(name,{exact:true});
        assert.equal(await image.isVisible(),true);
        await image.evaluate(e=>(e as HTMLImageElement).decode());
        assert.equal(await image.evaluate(e=>(e as HTMLImageElement).naturalWidth>0),true);
      }
      const cta=page.locator(".bb-hero__ctas").getByRole("link",{name:"Рассчитать стоимость",exact:true});
      assert.equal(await cta.isVisible(),true);await cta.click();
      assert.equal(new URL(page.url()).searchParams.get("service"),"marketplace");
      await page.waitForFunction(()=>document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes("Видео для маркетплейса"));
      const item=PUBLIC_PRICE_BY_ID.marketplace;
      assert.equal((await page.locator(".calc-total-val").innerText()).replace(/\s/gu," "),item.price.replace(/\s/gu," "));
      assert.equal(await page.locator('.calc-row[aria-checked="true"]').count(),1);
      assert.equal(await page.locator('.calc-type[data-active="true"]').count(),1);
      assert.equal(await page.getByRole('switch',{name:/Срочный проект/u}).count(),0);
      assert.equal(await page.getByText(item.limitations,{exact:true}).isVisible(),true);
      assert.equal(await page.locator(".calc-label").filter({hasText:"Дополнительно"}).count(),0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
      await page.close();
    }} finally {await browser.close();}
  }} finally {local.server.closeAllConnections();local.server.close();}
});
