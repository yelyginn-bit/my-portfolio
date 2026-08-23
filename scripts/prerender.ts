import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import Calculator from "../src/calculator/Calculator";
import CasePage from "../src/case-detail/CasePage";
import ColorGrading from "../src/color/ColorGrading";
import LegalApp, { documents as legalDocuments } from "../src/legal/LegalApp";
import { PORTFOLIO_PROJECTS } from "../src/lib/portfolio.data";
import { validatePortfolioRegistry } from "../src/lib/portfolioValidation";
import V3App from "../src/public/V3App";
import {
  CASE_PROJECTS,
  INDEXABLE_ROUTES,
  PRERENDER_ROUTES,
  ROUTE_MANIFEST,
  V3_PRERENDER_ROUTES,
  resolveV3Route,
} from "../src/public/routeManifest";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const prerenderDir = path.join(distDir, "prerender");
const siteOrigin = "https://yelyginn.ru";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function replaceMeta(html: string, selector: "description" | "og:title" | "og:description" | "og:url", value: string) {
  const escaped = escapeHtml(value);
  const attribute = selector === "description" ? `name="${selector}"` : `property="${selector}"`;
  const pattern = new RegExp(`<meta\\s+${attribute}\\s+content="[^"]*"\\s*/?>`, "iu");
  const replacement = `<meta ${attribute} content="${escaped}" />`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", `    ${replacement}\n  </head>`);
}

function applySeo(html: string, title: string, description: string, canonicalPath: string) {
  const canonical = `${siteOrigin}${canonicalPath}`;
  let result = html.replace(/<title>.*?<\/title>/isu, `<title>${escapeHtml(title)}</title>`);
  result = replaceMeta(result, "description", description);
  result = replaceMeta(result, "og:title", title);
  result = replaceMeta(result, "og:description", description);
  result = replaceMeta(result, "og:url", canonical);
  const canonicalPattern = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/iu;
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  return canonicalPattern.test(result)
    ? result.replace(canonicalPattern, canonicalTag)
    : result.replace("</head>", `    ${canonicalTag}\n  </head>`);
}

function applyLegalMeta(html: string, title: string, description: string) {
  const titlePattern = /<title>.*?<\/title>/isu;
  const result = titlePattern.test(html) ? html.replace(titlePattern, `<title>${escapeHtml(title)}</title>`) : html;
  return replaceMeta(result, "description", description);
}

function injectRoot(html: string, markup: string) {
  const rootPattern = /<div\s+id="root"\s*><\/div>/iu;
  if (!rootPattern.test(html)) throw new Error("Build template does not contain an empty #root element");
  return html.replace(rootPattern, `<div id="root">${markup}</div>`);
}

function outputFileFor(route: string) {
  return route === "/"
    ? path.join(prerenderDir, "index.html")
    : path.join(prerenderDir, route.slice(1), "index.html");
}

function portfolioPhotoExists(photoId: string) {
  return existsSync(path.join(rootDir, "public", "portfolio-photos", `${photoId}.webp`));
}

function sitemapXml() {
  const urls = INDEXABLE_ROUTES.map((route) => [
    "  <url>",
    `    <loc>${siteOrigin}${route.path}</loc>`,
    "    <changefreq>monthly</changefreq>",
    `    <priority>${route.priority ?? 0.5}</priority>`,
    "  </url>",
  ].join("\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

async function main() {
  const duplicateRoutes = ROUTE_MANIFEST
    .map((route) => route.path)
    .filter((route, index, routes) => routes.indexOf(route) !== index);
  if (duplicateRoutes.length) throw new Error(`Duplicate routes in route manifest: ${duplicateRoutes.join(", ")}`);
  if (ROUTE_MANIFEST.some((route) => route.path === "/portfolio/photo" && route.render !== "private")) {
    throw new Error("/portfolio/photo must remain private and must not be prerendered");
  }

  const portfolioIssues = validatePortfolioRegistry(PORTFOLIO_PROJECTS, portfolioPhotoExists).errors;
  if (portfolioIssues.length) throw new Error(`Portfolio registry validation failed:\n${portfolioIssues.join("\n")}`);

  const [v3Template, calculatorTemplate, colorGradingTemplate, legalTemplate, caseTemplate] = await Promise.all([
    readFile(path.join(distDir, "index.html"), "utf8"),
    readFile(path.join(distDir, "calculator.html"), "utf8"),
    readFile(path.join(distDir, "cvetokorrekciya.html"), "utf8"),
    readFile(path.join(distDir, "legal.html"), "utf8"),
    readFile(path.join(distDir, "case.html"), "utf8"),
  ]);
  await mkdir(prerenderDir, { recursive: true });

  const generated: string[] = [];
  for (const routePath of V3_PRERENDER_ROUTES) {
    const resolution = resolveV3Route(routePath);
    const markup = renderToString(createElement(StrictMode, null, createElement(V3App, { initialPath: routePath })));
    if (!/<h1(?:\s|>)/iu.test(markup)) throw new Error(`Prerendered route has no H1: ${routePath}`);
    const html = injectRoot(
      applySeo(v3Template, resolution.seo.title, resolution.seo.description, resolution.seo.canonical),
      markup,
    );
    const outputFile = outputFileFor(routePath);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, html);
    generated.push(routePath);
  }

  const calculatorMarkup = renderToString(createElement(StrictMode, null, createElement(Calculator)));
  if (!/<h1(?:\s|>)/iu.test(calculatorMarkup)) throw new Error("Prerendered calculator has no H1");
  const calculatorOutput = outputFileFor("/calculator");
  await mkdir(path.dirname(calculatorOutput), { recursive: true });
  await writeFile(calculatorOutput, injectRoot(calculatorTemplate, calculatorMarkup));
  generated.push("/calculator");

  const colorGradingMarkup = renderToString(createElement(StrictMode, null, createElement(ColorGrading)));
  if (!/<h1(?:\s|>)/iu.test(colorGradingMarkup)) throw new Error("Prerendered cvetokorrekciya has no H1");
  const colorGradingOutput = outputFileFor("/cvetokorrekciya");
  await mkdir(path.dirname(colorGradingOutput), { recursive: true });
  await writeFile(colorGradingOutput, injectRoot(colorGradingTemplate, colorGradingMarkup));
  generated.push("/cvetokorrekciya");

  for (const [legalPath, page] of Object.entries(legalDocuments)) {
    const legalMarkup = renderToString(createElement(StrictMode, null, createElement(LegalApp, { pathname: legalPath })));
    if (!/<h1(?:\s|>)/iu.test(legalMarkup)) throw new Error(`Prerendered legal route has no H1: ${legalPath}`);
    const html = injectRoot(applyLegalMeta(legalTemplate, page.seo.title, page.seo.description), legalMarkup);
    const outputFile = outputFileFor(legalPath);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, html);
    generated.push(legalPath);
  }

  for (const project of CASE_PROJECTS) {
    const casePath = `/cases/${project.id}`;
    const caseMarkup = renderToString(createElement(StrictMode, null, createElement(CasePage, { project })));
    if (!/<h1(?:\s|>)/iu.test(caseMarkup)) throw new Error(`Prerendered case route has no H1: ${casePath}`);
    const html = injectRoot(
      applySeo(caseTemplate, `${project.title} | YELYGINN`, project.role, casePath),
      caseMarkup,
    );
    const outputFile = outputFileFor(casePath);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, html);
    generated.push(casePath);
  }

  const missing = PRERENDER_ROUTES.filter((route) => !generated.includes(route));
  if (missing.length) throw new Error(`Missing prerender output for manifest routes: ${missing.join(", ")}`);

  const sitemap = sitemapXml();
  await Promise.all([
    writeFile(path.join(distDir, "prerender-manifest.json"), `${JSON.stringify({ routes: generated }, null, 2)}\n`),
    writeFile(path.join(rootDir, "public", "sitemap.xml"), sitemap),
    writeFile(path.join(distDir, "sitemap.xml"), sitemap),
  ]);
  console.log(`Prerendered ${generated.length} routes from the shared route manifest.`);
}

await main();
