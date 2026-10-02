import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { discoveryGraph, enrichPublicHtml } from "../scripts/aiDiscovery";
import { PUBLIC_PRICES } from "../src/lib/pricing.data";
import { projects } from "../src/portfolio/v3PortfolioData";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest";
import { AI_QUESTION, AI_SERVICES } from "../src/lib/aiDiscovery";
import { startLocalServer } from "../scripts/computed-style-audit";

test("Discovery uses public prices and actual project credits", () => {
  const catalog = discoveryGraph("/ceny")["@graph"].find((n) => n["@type"] === "OfferCatalog")!;
  const offers = catalog.itemListElement as { description: string; itemOffered: { name: string } }[];
  const prices = PUBLIC_PRICES.filter((p) => p.showOnCatalog !== false);
  assert.equal(offers.length, prices.length);
  for (const price of prices) assert.ok(offers.some((o) => o.itemOffered.name === price.title && o.description.startsWith(price.price)));
  for (const project of projects) {
    const work = discoveryGraph(`/portfolio/${project.slug}`)["@graph"].find((n) => n["@type"] === "CreativeWork")!;
    assert.equal(work.creditText, `Юрий Елыгин: ${project.responsibilities.join(", ")}`);
    assert.equal(work.author, undefined, "do not claim authorship of an entire team project");
  }
});

test("Public person entity uses one stable photo-and-video identity", () => {
  for (const route of ["/", "/about", "/contact", "/photo"]) {
    const graph = discoveryGraph(route)["@graph"];
    const person = graph.find((node) => node["@type"] === "Person")!;
    assert.equal(person["@id"], "https://yelyginn.ru/#person");
    assert.match(String(person.jobTitle), /фотограф/iu);
    assert.match(String(person.description), /семейн/iu);
    assert.ok(graph.some((node) => node["@type"] === "LocalBusiness" && node["@id"] === "https://yelyginn.ru/#business"));
  }
});

test("Every public output has generated parseable discovery; private paths remain excluded", () => {
  for (const route of INDEXABLE_ROUTES) {
    const rel = route.path === "/" ? "" : route.path.slice(1);
    const prerender = path.join("dist/prerender", rel, "index.html");
    const file = fs.existsSync(prerender) ? prerender : path.join("dist", `${rel}.html`);
    const html = fs.readFileSync(file, "utf8");
    const generated = [...html.matchAll(/<script type="application\/ld\+json" data-ai-discovery>(.*?)<\/script>/gs)];
    assert.equal(generated.length, 1, route.path);
    const graph = JSON.parse(generated[0][1]);
    assert.equal(graph["@graph"].find((n: any) => n["@type"] === "WebPage").url, `https://yelyginn.ru${route.path}`);
    assert.ok(html.includes('src="/ai-ask.js"'), route.path);
    assert.equal((html.match(/data-ai-ask(?:[ =>])/g) ?? []).length, 1, route.path);
  }
  for (const route of ["/account", "/admin", "/journal", "/portfolio/photo"]) assert.ok(!INDEXABLE_ROUTES.some((r) => r.path === route));
});

test("Dimension enrichment ignores external images and prevents path escape", async () => {
  const html = '<head></head><body><img src="https://example.com/x.jpg"><img src="/../outside.jpg"></body>';
  const output = await enrichPublicHtml(html, "/", path.resolve("dist"));
  assert.ok(!output.includes(' width='));
  assert.equal((output.match(/data-ai-discovery/g) ?? []).length, 1);
});

test("AI block opens services and copies the same question; denied clipboard has a usable fallback", async () => {
  const server = await startLocalServer();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/", "/reklamnye-roliki", "/calculator", "/video-dlya-marketpleysov"]) {
        await page.goto(server.origin + route);
        const cookie = page.getByRole("button", { name: "Только необходимые", exact: true });
        if (await cookie.isVisible()) await cookie.click();
        const block = page.locator("[data-ai-ask]");
        assert.equal(await block.count(), 1, route);
        for (const service of AI_SERVICES) {
          const link = block.getByRole("link", { name: service.label });
          assert.equal(await link.getAttribute("href"), service.href);
          assert.match((await link.getAttribute("rel"))!, /noopener/);
        }
        await block.locator("summary").click();
        await block.getByRole("button", { name: "Скопировать вопрос" }).click();
        await page.waitForFunction(() => document.querySelector("[data-ai-status]")?.textContent === "Вопрос скопирован");
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), AI_QUESTION);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route} ${width}`);
      }
    }
    await page.evaluate(`Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async () => { throw new Error("denied"); } })`);
    await page.locator("[data-ai-copy]").click();
    await page.waitForFunction(() => document.querySelector("[data-ai-status]")?.textContent?.includes("вручную"));
    const selection = await page.locator("[data-ai-question]").evaluate((element: HTMLTextAreaElement) => ({ start: element.selectionStart, end: element.selectionEnd, focused: element === document.activeElement }));
    assert.equal(selection.start, 0); assert.equal(selection.end, AI_QUESTION.length); assert.ok(selection.focused);
  } finally { await browser.close(); await new Promise<void>((resolve) => server.server.close(() => resolve())); }
});
