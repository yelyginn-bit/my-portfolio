import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, contrastRatio, PAIRS, THRESHOLD } from "../scripts/contrast.ts";

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

// Порог и ожидание берутся из scripts/contrast.ts — единственного источника.
// Раньше этот список дублировался здесь с собственными (заниженными) порогами,
// что и было найдено расхождение фазы 2 §0.1: тест хранил порог 3 для пар,
// которые по роли "любой текст" обязаны проходить 4.5.
test("every allowed pair from the brand book contrast table clears its role's threshold", () => {
  for (const { label, a, b, role, expect } of PAIRS) {
    if (expect !== "pass") continue;
    const ratio = contrastRatio(a, b);
    const threshold = THRESHOLD[role];
    assert.ok(ratio >= threshold, `${label}: ${ratio.toFixed(2)} < ${threshold} (role: ${role})`);
  }
});

test("forbidden pairs are documented as failing, not silently used as text/border/focus", () => {
  for (const { label, a, b, role, expect } of PAIRS) {
    if (expect !== "fail") continue;
    const ratio = contrastRatio(a, b);
    const threshold = THRESHOLD[role];
    assert.ok(ratio < threshold, `${label}: ${ratio.toFixed(2)} >= ${threshold} — no longer fails, update its "expect" in contrast.ts`);
  }
});

// Список файлов растёт вместе с фазой 5: страница переведена на тёмное —
// добавляется сюда. Пока только design-system.css (см. PROMPT-20 §7.3).
const SCANNED_FILES = ["src/design-system.css"];

// Не нарушение: шесть цветов брендбука, легаси-акцент, альфа-белый/чёрный
// (стекло брендбука), transparent/currentColor/inherit.
//
// Категория «статусные цвета формы» (PROMPT-21 §0.4) — успех/ошибка формы,
// это смысл, а не раскраска, брендбук их не запрещает: --ds-success,
// --ds-error, #176229.
//
// #176229 (.v3-form__status, успех формы) — измерено на реальном фоне формы
// (.v3-form, живой белый #fff, не PAPER — отдельная находка) перед решением
// заменить на var(--ds-success), как просили. #176229 на #fff даёт 7.46 (AA
// с запасом). --ds-success (#4ade80) на том же фоне даёт 1.74 — замена была бы
// регрессом, а не починкой. Условие «если на фоне от 4.5» не выполняется —
// не менял, оставил #176229 как есть.
//
// #a58cff (.v3-catalog .v3-contact__intro a) — просили сначала замерить фон
// перед заменой на var(--ds-violet). Измерение показало: селектор не
// совпадает ни с одним элементом на живом сайте — ContactSection везде
// рендерится с классом v3-contact--unified, не вложенным в .v3-catalog
// (тот же .v3-catalog контейнер, что и .v3-catalog .v3-contact, там нет).
// Правило мёртвое, фона для замера не существует — не трогал, добавил в
// список мёртвого кода на отдельную чистку (вместе с --ds-surface).
//
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
