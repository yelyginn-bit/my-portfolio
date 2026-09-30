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
