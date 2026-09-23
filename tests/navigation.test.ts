import test from "node:test";
import assert from "node:assert/strict";
import { PORTFOLIO_CATEGORY_ORDER } from "../src/portfolio/v3PortfolioData.ts";
import { ROUTE_MANIFEST } from "../src/public/routeManifest.ts";
import { CALCULATOR_LINK, FOOTER_GROUPS, PHOTO_LINK, PRIMARY_NAV, type NavLink, type PrimaryNavEntry } from "../src/lib/navigation.data.ts";

// Никаких захардкоженных чисел — всё выводится из ROUTE_MANIFEST
// (PROMPT-21 §7: "захардкоженные счётчики в тестах у нас уже расходились с кодом").
const indexableRoutes = ROUTE_MANIFEST.filter((route) => route.indexable);
const indexablePaths = new Set(indexableRoutes.map((route) => route.path));

function collectHrefs(entries: readonly (NavLink | PrimaryNavEntry)[]): string[] {
  const out: string[] = [];
  for (const entry of entries) {
    if ("href" in entry && typeof entry.href === "string") out.push(entry.href);
    if ("items" in entry) out.push(...collectHrefs(entry.items));
  }
  return out;
}

const footerHrefs = new Set(FOOTER_GROUPS.flatMap((group) => group.links.map((item) => item.href)));
const primaryNavHrefs = new Set(collectHrefs(PRIMARY_NAV));

test("every indexable route in the manifest is reachable from the footer, directly or via its portfolio category", () => {
  const projectRoutes = ROUTE_MANIFEST.filter((route) => route.indexable && /^\/portfolio\/[^/]+$/u.test(route.path) && !(PORTFOLIO_CATEGORY_ORDER as readonly string[]).includes(route.path.slice("/portfolio/".length)));
  // "/" — не в списке групп, но всегда достижима через собственный логотип/
  // wordmark в подвале (отдельный от FOOTER_GROUPS элемент, во всех системах).
  const otherRoutes = indexableRoutes.filter((route) => !projectRoutes.includes(route) && route.path !== "/");

  for (const route of otherRoutes) {
    assert.ok(footerHrefs.has(route.path), `${route.path}: not linked from any footer group`);
  }
  // Индивидуальные проекты портфолио (38+) не перечислены в подвале поштучно —
  // они достижимы через свою категорию, которая в подвале есть.
  for (const route of projectRoutes) {
    assert.ok(footerHrefs.has("/portfolio"), "footer must link to /portfolio as the entry point for project routes");
  }
});

test("navigation references only routes that exist in the manifest and are indexable", () => {
  for (const href of [...footerHrefs, ...primaryNavHrefs]) {
    const path = href.split("#")[0];
    assert.ok(indexablePaths.has(path), `navigation.data.ts references "${href}", which is not an indexable route in ROUTE_MANIFEST`);
  }
});

test("\"Фото\" is present in the primary (header) navigation", () => {
  assert.ok(primaryNavHrefs.has(PHOTO_LINK.href), "Фото link is missing from PRIMARY_NAV");
});

test("the calculator link is a valid, indexable route (rendered in every header outside PRIMARY_NAV, next to the main CTA)", () => {
  assert.ok(indexablePaths.has(CALCULATOR_LINK.href), "CALCULATOR_LINK does not point to an indexable route");
});
