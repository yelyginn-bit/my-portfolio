import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// PROMPT-30 §3.3/§5.1: набор компонентов брендбука — только на токенах, без
// литералов цвета и радиуса. Радиус проверяется отдельно: 0/50%/999px — это
// геометрические идиомы (квадрат/круг/пилюля из правила 11), не значения из
// брендовой шкалы радиусов, поэтому не считаются находкой. Литералы размера
// (padding/gap/font-size в px/rem) сюда не входят — брендбук не заводит для
// них токенов, в отличие от палитры и радиуса.
test("bb-components.css uses only var(--ds-*) colors and radii, no brand literals", () => {
  const css = read("public/bb-components.css");
  const hexLiterals = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/gu)].map((m) => m[0]);
  assert.deepEqual(hexLiterals, [], "bb-components.css: hex-цвет вне токена");

  const rgbLiterals = [...css.matchAll(/rgba?\(\s*\d/gu)];
  assert.equal(rgbLiterals.length, 0, "bb-components.css: rgb()/rgba() c числовым литералом вне токена");

  const radii = [...css.matchAll(/border-radius:\s*([^;]+);/gu)].map((m) => m[1].trim());
  const allowedRadius = new Set(["0", "50%", "999px"]);
  const badRadii = radii.filter((value) => !allowedRadius.has(value) && !/^var\(--ds-radius/u.test(value));
  assert.deepEqual(badRadii, [], "bb-components.css: border-radius вне var(--ds-radius*) и вне 0/50%/999px");
});

test("bb-components.css is loaded before /site-skin.css on every static page that uses bb-* classes", () => {
  // Порядок как у tokens.css → site-skin.css (tests/seo.test.ts): страница
  // сначала получает компоненты брендбука, затем общий скин статических
  // страниц — иначе !important-слой site-skin.css (см. docs/audit/dark-theme-inventory.md §6.2)
  // может перебить их до рендера.
  for (const file of ["video-dlya-marketpleysov.html", "_kit.html"]) {
    const html = read(file);
    assert.ok(html.includes('href="/bb-components.css"'), `${file}: нет /bb-components.css`);
    if (html.includes('/site-skin.css')) {
      assert.ok(html.indexOf('/bb-components.css') < html.indexOf('/site-skin.css'), `${file}: bb-components.css должен идти до site-skin.css`);
    }
  }
});
