/** /llms.txt (PROMPT-36 §5.1): генерируется на сборке, цены — из pricing.data.ts, без «ИП». */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PUBLIC_PRICES } from "../src/lib/pricing.data.ts";
import { SOCIALS } from "../src/config/socials.ts";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";

const file = path.join(process.cwd(), "dist", "llms.txt");

test("llms.txt собран и описывает владельца честно", () => {
  assert.ok(fs.existsSync(file), "нет dist/llms.txt — npm run build");
  const text = fs.readFileSync(file, "utf8");
  assert.match(text, /самозанятый/u);
  assert.ok(!/(^|[^А-Яа-яЁё])ИП([^А-Яа-яЁё]|$)/u.test(text), "«ИП» в llms.txt");
  assert.ok(!/лукойл|1xbet/iu.test(text));
});

test("llms.txt: все цены — из pricing.data.ts, все контакты — с /contact, ссылки ведут на реальные маршруты", () => {
  const text = fs.readFileSync(file, "utf8");
  for (const item of PUBLIC_PRICES) assert.ok(text.includes(`${item.title} — ${item.price}`), `нет позиции ${item.id}`);
  for (const social of SOCIALS) assert.ok(text.includes(social.href.replace(/^mailto:/u, "")), `нет контакта ${social.id}`);
  const known = new Set(INDEXABLE_ROUTES.map((r) => r.path));
  for (const m of text.matchAll(/\]\(https:\/\/yelyginn\.ru(\/[^)#]*)/gu)) assert.ok(known.has(m[1].replace(/\/$/u, "") || "/"), `ссылка на несуществующий маршрут ${m[1]}`);
});

const internalPaths = (text: string) => [...text.matchAll(/https:\/\/yelyginn\.ru(\/[^\s)#]*)?/gu)]
  .map((match) => new URL(match[0]).pathname.replace(/\/$/u, "") || "/");

test("llms.txt covers exactly the public manifest, including non-featured projects", () => {
  const actual = [...new Set(internalPaths(fs.readFileSync(file, "utf8")))].sort();
  assert.deepEqual(actual, INDEXABLE_ROUTES.map((route) => route.path).sort());
});

test("sitemap.xml has each public manifest route exactly once", () => {
  const text = fs.readFileSync(path.join(process.cwd(), "dist", "sitemap.xml"), "utf8");
  const actual = [...text.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => {
    const url = new URL(match[1]);
    assert.equal(url.origin, "https://yelyginn.ru");
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    return url.pathname;
  });
  assert.deepEqual(actual.sort(), INDEXABLE_ROUTES.map((route) => route.path).sort());
});

test("robots.txt allows all public routes with longest-match Allow precedence", () => {
  const text = fs.readFileSync(path.join(process.cwd(), "dist", "robots.txt"), "utf8");
  // This site's policy is one wildcard group. Fail if group semantics change,
  // rather than accidentally applying a named crawler's rules to everybody.
  const agents = [...text.matchAll(/^User-agent:\s*(\S+)\s*$/gmu)].map((match) => match[1]);
  assert.deepEqual(agents, ["*"]);
  const rules = text.split(/\r?\n/u).flatMap((line) => {
    const match = line.match(/^(Allow|Disallow):\s*(\S+)/u);
    if (!match) return [];
    const pattern = match[2];
    const end = pattern.endsWith("$");
    const body = end ? pattern.slice(0, -1) : pattern;
    const escaped = body.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join(".*");
    return [{allow: match[1] === "Allow", length: body.replaceAll("*", "").length, regex: new RegExp("^" + escaped + (end ? "$" : ""), "u")}];
  });
  const allowed = (route: string) => {
    const matches = rules.filter((rule) => rule.regex.test(route))
      .sort((a, b) => b.length - a.length || Number(b.allow) - Number(a.allow));
    return matches.length === 0 || matches[0].allow;
  };
  for (const route of INDEXABLE_ROUTES) assert.ok(allowed(route.path), `blocked public route ${route.path}`);
  for (const route of ["/api/send-form", "/admin", "/account", "/g/example", "/gallery/example", "/journal", "/photo/private", "/portfolio/photo"])
    assert.equal(allowed(route), false, `private route became crawlable: ${route}`);
});
