/**
 * Храповик «литералы не растут» (QWEN-02 §2). Числа в baseline — это долг
 * фазы 5 на 24.09.2026; тест не требует убрать его сейчас, он требует не добавить.
 * Обновить baseline: `npx tsx scripts/css-literals.ts --write` (только когда литералов стало меньше).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASELINE_PATH, collectLiteralCounts, type LiteralCounts } from "../scripts/css-literals.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zero: LiteralCounts = { color: 0, radius: 0, fontFamily: 0, total: 0 };

function readBaseline(): Record<string, LiteralCounts> {
  const file = path.join(root, BASELINE_PATH);
  assert.ok(fs.existsSync(file), `нет baseline-файла ${BASELINE_PATH} — создай его: npx tsx scripts/css-literals.ts --write`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, LiteralCounts>;
}

const baseline = readBaseline();
const current = await collectLiteralCounts(root);

test("ни один файл не содержит больше литералов, чем в baseline", () => {
  const grown: string[] = [];
  for (const [file, now] of Object.entries(current)) {
    const allowed = baseline[file];
    if (!allowed) {
      // Новый файл защищён по-настоящему: ноль литералов, иначе — красный.
      if (now.total > 0) grown.push(`${file}: новый файл с ${now.total} литералами, в baseline его нет`);
      continue;
    }
    for (const key of ["color", "radius", "fontFamily", "total"] as const) {
      if (now[key] > allowed[key]) {
        grown.push(`${file}: ${key} ${allowed[key]} → ${now[key]}`);
      }
    }
  }
  assert.deepEqual(grown, [], `Добавились цветовые литералы / скругления / шрифты мимо токенов:\n  ${grown.join("\n  ")}\n\nФаза 5 переводит сайт на тёмную тему правилами вне токенов (см. docs/audit/dark-theme-inventory.md). Новая правка должна брать цвет из --ds-*, а не числом.`);
});

test("уменьшение литералов подтверждается подсказкой обновить baseline", (t) => {
  const shrunk: string[] = [];
  for (const [file, now] of Object.entries(current)) {
    const allowed = baseline[file];
    if (!allowed) continue;
    if (now.total < allowed.total) shrunk.push(`${file}: ${allowed.total} → ${now.total}`);
  }
  if (shrunk.length) t.diagnostic(`Долг сократился — закрепи это в baseline (npx tsx scripts/css-literals.ts --write):\n  ${shrunk.join("\n  ")}`);
  assert.ok(true);
});

test("baseline не содержит лишних категорий и все счётчики согласованы", () => {
  for (const [file, counts] of Object.entries(baseline)) {
    assert.equal(
      counts.total,
      (counts.color ?? zero.color) + (counts.radius ?? zero.radius) + (counts.fontFamily ?? zero.fontFamily),
      `${file}: total не равна сумме составляющих — baseline повреждён`,
    );
  }
});
