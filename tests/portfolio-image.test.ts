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
