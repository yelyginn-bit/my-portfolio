import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, contrastRatio } from "../scripts/contrast.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("the six brand tokens in design-system.css match the Figma brand book exactly", () => {
  const css = read("src/design-system.css");
  const tokenToHex: Record<string, string> = {
    "--ds-text": BRAND.INK,
    "--ds-bg": BRAND.PAPER,
    "--ds-charcoal": BRAND.GRAPHITE,
    "--ds-fog": BRAND.FOG,
    "--ds-violet": BRAND.VIOLET,
    "--ds-orange": BRAND.ORANGE,
  };
  for (const [token, hex] of Object.entries(tokenToHex)) {
    const match = css.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{3,8})`, "u"));
    assert.ok(match, `${token} is not declared in design-system.css`);
    assert.equal(match![1].toLowerCase(), hex.toLowerCase(), `${token} must equal brand book ${hex}`);
  }
});

test("every allowed pair from the brand book contrast table clears its threshold", () => {
  const pairs: Array<[string, string, string, number]> = [
    ["ORANGE на INK", BRAND.ORANGE, BRAND.INK, 3.0],
    ["ORANGE на GRAPHITE", BRAND.ORANGE, BRAND.GRAPHITE, 3.0],
    ["INK на ORANGE", BRAND.INK, BRAND.ORANGE, 3.0],
    ["#C83227 на PAPER", "#C83227", BRAND.PAPER, 4.5],
    ["VIOLET на INK", BRAND.VIOLET, BRAND.INK, 4.5],
    ["VIOLET на GRAPHITE", BRAND.VIOLET, BRAND.GRAPHITE, 3.0],
    ["VIOLET на PAPER", BRAND.VIOLET, BRAND.PAPER, 3.0],
    ["белый на VIOLET", "#FFFFFF", BRAND.VIOLET, 3.0],
    ["FOG на INK", BRAND.FOG, BRAND.INK, 4.5],
  ];
  for (const [label, a, b, threshold] of pairs) {
    const ratio = contrastRatio(a, b);
    assert.ok(ratio >= threshold, `${label}: ${ratio.toFixed(2)} < ${threshold}`);
  }
});

test("forbidden pairs are documented as failing, not silently used as text/border/focus on light", () => {
  assert.ok(contrastRatio(BRAND.ORANGE, BRAND.PAPER) < 3.0, "ORANGE на PAPER should fail — guards against reintroducing it as light-page text/border/focus");
  assert.ok(contrastRatio("#FFFFFF", BRAND.ORANGE) < 3.0, "белый на ORANGE should fail — guards against white labels on orange fills");
});

// Список файлов растёт вместе с фазой 5: страница переведена на тёмное —
// добавляется сюда. Пока только design-system.css (см. PROMPT-20 §7.3).
const SCANNED_FILES = ["src/design-system.css"];

// Не нарушение: шесть цветов брендбука, легаси-акцент, альфа-белый/чёрный
// (стекло брендбука), transparent/currentColor/inherit, --ds-success/--ds-error
// (семантические статусы — вне темы этой фазы, см. отчёт фазы 2 "не сделано").
//
// Три находки аудита, оставлены как есть до отдельного решения (PROMPT-20
// §5 правило 6 — новый оттенок не заводить и не менять без «ок»):
// #176229 — .v3-form__status (успех формы), отдельный от --ds-success токен,
//   тот же класс «второй источник», что и остальные — не трогал, не просили;
// #a58cff — .v3-contact__intro a, светлее --ds-violet, для читаемости ссылки
//   на тёмном тексте — не консолидировал без «ок» (см. отчёт «ховеры»);
// #211712 — .portfolio-row:nth-of-type(4n), тёплый почти-нейтральный фон
//   чередования строк, за порогом isNeutral (15 против 12) на волосок.
const ALLOWED_HEX = new Set(
  [BRAND.INK, BRAND.PAPER, BRAND.GRAPHITE, BRAND.FOG, BRAND.VIOLET, BRAND.ORANGE, "#C83227", "#4ade80", "#ff6b5e", "#176229", "#a58cff", "#211712"]
    .map((h) => h.toLowerCase()),
);

function extractHexLiterals(css: string): string[] {
  return [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/gu)].map((m) => m[0].toLowerCase());
}

function normalizeHex(hex: string): string {
  const body = hex.slice(1);
  if (body.length === 3 || body.length === 4) {
    return `#${[...body].map((c) => c + c).join("").slice(0, 6)}`;
  }
  return `#${body.slice(0, 6)}`;
}

// Нейтральный (низкая насыщенность) hex не проверяется в этой фазе — это
// вопрос серых/тёмных поверхностей, а не брендовых акцентов (см. PROMPT-20
// §10.4: "не трогать нейтральные серые"). Порог — тот же, что в замерах
// цвета живых страниц этого захода: разница между каналами < 12.
function isNeutral(hex: string): boolean {
  const full = normalizeHex(hex);
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) < 12;
}

test("no stray saturated hex color literals outside the brand whitelist in the scanned files", () => {
  for (const file of SCANNED_FILES) {
    const css = read(file);
    const found = extractHexLiterals(css);
    const violations = found.filter((hex) => {
      if (isNeutral(hex)) return false;
      const normalized = normalizeHex(hex);
      return !ALLOWED_HEX.has(normalized) && !ALLOWED_HEX.has(hex);
    });
    assert.deepEqual([...new Set(violations)], [], `${file}: saturated hex literals outside the brand whitelist`);
  }
});
