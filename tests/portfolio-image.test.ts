import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioImage } from "../src/components/media/PortfolioImage";
import manifest from "../src/lib/portfolio-photos.manifest.json" with { type: "json" };

const SAMPLE_ID = "korona-01-color";

test("renders an <img> with a webp srcset and no jpg fallback for a known id", () => {
  const html = renderToStaticMarkup(createElement(PortfolioImage, { id: SAMPLE_ID, alt: "KORONA, кадр после цвета" }));
  assert.match(html, /<img[^>]*src="\/portfolio-photos\/korona-01-color\.webp"/u);
  assert.match(html, /srcset="[^"]*korona-01-color-480w\.webp 480w[^"]*korona-01-color-960w\.webp 960w[^"]*korona-01-color\.webp 1600w"/iu);
  assert.doesNotMatch(html, /\.jpg/u);
  assert.doesNotMatch(html, /<picture>/u);
  assert.match(html, /alt="KORONA, кадр после цвета"/u);
});

test("sets width/height from the manifest so the layout does not shift", () => {
  const entry = (manifest as Record<string, { width: number; height: number }>)[SAMPLE_ID];
  const html = renderToStaticMarkup(createElement(PortfolioImage, { id: SAMPLE_ID, alt: "x" }));
  assert.match(html, new RegExp(`width="${entry.width}"`, "u"));
  assert.match(html, new RegExp(`height="${entry.height}"`, "u"));
});

test("uses native lazy loading, not an eager fetch", () => {
  const html = renderToStaticMarkup(createElement(PortfolioImage, { id: SAMPLE_ID, alt: "x" }));
  assert.match(html, /loading="lazy"/u);
});

test("a narrower source (below all srcset steps) only lists the widths it actually has", () => {
  // portraits-03 источник — 720px шириной, 960/1600 в манифесте для него быть не должно.
  const html = renderToStaticMarkup(createElement(PortfolioImage, { id: "portraits-03", alt: "x" }));
  assert.doesNotMatch(html, /960w/u);
  assert.doesNotMatch(html, /1600w/u);
  assert.match(html, /480w/u);
});

test("throws a clear error for an id that was never processed", () => {
  assert.throws(
    () => renderToStaticMarkup(createElement(PortfolioImage, { id: "does-not-exist", alt: "x" })),
    /unknown photo id "does-not-exist"/u,
  );
});

// Validate browser descriptors against the actual files, not a second list of expected widths.
test("responsive candidates preserve source aspect ratio and declare their real pixel widths", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const sharp = (await import("sharp")).default;
  const data = JSON.parse(await fs.readFile("src/lib/responsive-images.manifest.json", "utf8")) as Record<string, {width: number; height: number; srcSet: string}>;
  assert.ok(Object.keys(data).length > 0);
  for (const [source, entry] of Object.entries(data)) {
    const original = await sharp(path.join(process.cwd(), "public", source)).metadata();
    assert.equal(entry.width, original.width, source);
    assert.equal(entry.height, original.height, source);
    const widths = new Set<number>();
    for (const candidate of entry.srcSet.split(",")) {
      const match = candidate.trim().match(/^(\/\S+) (\d+)w$/u);
      assert.ok(match, `invalid responsive candidate: ${candidate}`);
      const width = Number(match[2]);
      assert.ok(!widths.has(width), `duplicate width in ${source}`);
      widths.add(width);
      const file = await sharp(path.join(process.cwd(), "public", match[1])).metadata();
      assert.equal(file.width, width, candidate);
      assert.ok(width <= entry.width, `upscaled candidate: ${candidate}`);
      assert.ok(Math.abs((file.height ?? 0) - width * entry.height / entry.width) <= 1, `changed crop: ${candidate}`);
    }
  }
});

test("built image width descriptors match real files; auto-sizes is restricted to dimensioned lazy images", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const sharp = (await import("sharp")).default;
  const {INDEXABLE_ROUTES} = await import("../src/public/routeManifest");
  const widthCache = new Map<string, number | undefined>();
  for (const route of INDEXABLE_ROUTES) {
    const html = await fs.readFile(path.join(process.cwd(), "dist/prerender", route.path === "/" ? "index.html" : route.path.slice(1) + "/index.html"), "utf8");
    for (const match of html.matchAll(/<img\b[^>]*>/giu)) {
      const tag = match[0], sizes = /\bsizes="([^"]+)"/iu.exec(tag)?.[1];
      if (sizes?.startsWith("auto")) {
        assert.match(tag, /\bloading="lazy"/iu, route.path);
        assert.match(tag, /\bwidth="\d+"/iu, route.path);
        assert.match(tag, /\bheight="\d+"/iu, route.path);
      }
      const srcset = /\bsrcset="([^"]+)"/iu.exec(tag)?.[1];
      const declaredWidths = new Set<number>();
      for (const candidate of srcset?.split(",") ?? []) {
        const item = candidate.trim().match(/^(\/[^\s]+)\s+(\d+)w$/u);
        if (!item) continue; // Remote/density candidates are not local width descriptors.
        assert.ok(!declaredWidths.has(Number(item[2])), `${route.path}: duplicate width ${item[2]}`);
        declaredWidths.add(Number(item[2]));
        if (!widthCache.has(item[1])) widthCache.set(item[1], (await sharp(path.join(process.cwd(), "public", decodeURIComponent(item[1]))).metadata()).width);
        assert.equal(widthCache.get(item[1]), Number(item[2]), `${route.path}: ${candidate}`);
      }
    }
  }
});

test("small portrait thumbnail opens a full-resolution lightbox at mobile and desktop widths", async () => {
  const {chromium} = await import("playwright");
  const {startLocalServer} = await import("../scripts/computed-style-audit.ts");
  const fsPath = await import("node:path");
  const sharp = (await import("sharp")).default;
  const local = await startLocalServer(), browser = await chromium.launch();
  const id = "oksana-02";
  const original = (manifest as Record<string, {width: number; height: number}>)[id];
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({viewport: {width, height: 900}, deviceScaleFactor: width === 390 ? 3 : 1});
      const page = await context.newPage();
      await page.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
      await page.goto(local.origin + "/photo", {waitUntil: "domcontentloaded"});
      const cookie = page.getByRole("button", {name: "Только необходимые", exact: true});
      if (await cookie.isVisible()) await cookie.click();
      const thumbnail = page.locator(`.gallery-item:has(img[src="/portfolio-photos/${id}.webp"])`).first();
      await thumbnail.scrollIntoViewIfNeeded();
      await thumbnail.locator("img").evaluate((element) => (element as HTMLImageElement).decode());
      await thumbnail.click();
      const lightbox = page.locator("#lightboxImg");
      await page.waitForFunction((minimum) => {
        const image = document.getElementById("lightboxImg") as HTMLImageElement;
        return image.srcset.split(",").some((candidate) => {
          const [url, width] = candidate.trim().split(/\s+/u);
          return new URL(url, location.href).href === image.currentSrc && Number(width?.replace(/w$/u, "")) >= minimum;
        });
      }, original.width);
      await lightbox.evaluate((element) => (element as HTMLImageElement).decode());
      const actual = await lightbox.evaluate((element) => {
        const image = element as HTMLImageElement;
        return {url: image.currentSrc, width: Number(image.getAttribute("width")), height: Number(image.getAttribute("height")), sizes: image.sizes};
      });
      assert.equal(new URL(actual.url).origin, local.origin);
      const file = fsPath.join(process.cwd(), "public", new URL(actual.url).pathname);
      const dimensions = await sharp(file).metadata();
      assert.ok((dimensions.width ?? 0) >= original.width, `lightbox reused a reduced thumbnail at ${width}px`);
      assert.equal(actual.width, original.width);
      assert.equal(actual.height, original.height);
      assert.equal(actual.sizes, "100vw");
      await context.close();
    }
  } finally {
    await browser.close();
    local.server.closeAllConnections();
    local.server.close();
  }
});

test("activating a video keeps its pending poster request alive", async () => {
  const {chromium} = await import("playwright");
  const {startLocalServer} = await import("../scripts/computed-style-audit.ts");
  const local = await startLocalServer(), browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      const failed: string[] = [];
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      page.on("requestfailed", (request) => {
        if (request.url().includes("/posters/yango-campaign-2026-10-03")) failed.push(request.failure()?.errorText ?? "failed");
      });
      await page.route("**/v3-assets/posters/yango-campaign-2026-10-03*.webp", async (route) => {
        const response = await route.fetch();
        await gate;
        await route.fulfill({response}).catch(() => {});
      });
      await page.route("https://kinescope.io/**", (route) => route.fulfill({contentType: "text/html", body: "<!doctype html><title>Local player fixture</title>"}));
      await page.route("**/api/**", (route) => route.fulfill({contentType: "application/json", body: "{}"}));
      try {
        await page.goto(local.origin + "/portfolio/yango-campaign", {waitUntil: "domcontentloaded"});
        const player = page.locator(".kinescope-embed").first();
        await player.scrollIntoViewIfNeeded();
        await player.locator("iframe").waitFor({state: "visible"});
        const poster = player.locator("img.kinescope-embed-poster");
        assert.equal(await poster.count(), 1, `activation removed the poster at ${width}px`);
        const handle = await poster.elementHandle();
        assert.ok(handle);
        release();
        await poster.evaluate((element) => (element as HTMLImageElement).decode());
        assert.equal(await handle.evaluate((element) => element.isConnected), true);
        assert.deepEqual(failed, [], `poster request cancelled at ${width}px`);
      } finally {
        release();
        await page.close();
      }
    }
  } finally {
    await browser.close();
    local.server.closeAllConnections();
    local.server.close();
  }
});
