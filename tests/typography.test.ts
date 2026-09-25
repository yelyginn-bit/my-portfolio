import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// Шкала брендбука (PROMPT-28 §2, Figma p3IBlfFFdnA03s3U7UiarF, «02 / TYPOGRAPHY»):
// 104 / 72 / 48 / 32 / 20 / 16 / 12 / 11 — в rem при базе 16px.
const BRAND_SCALE_REM: Record<string, string> = {
  "--ds-fs-104": "6.5rem",
  "--ds-fs-72": "4.5rem",
  "--ds-fs-48": "3rem",
  "--ds-fs-32": "2rem",
  "--ds-fs-20": "1.25rem",
  "--ds-fs-16": "1rem",
  "--ds-fs-12": "0.75rem",
  "--ds-fs-11": "0.6875rem",
};

test("scale tokens in design-system.css match the brand book scale exactly", () => {
  const css = read("src/design-system.css");
  for (const [token, rem] of Object.entries(BRAND_SCALE_REM)) {
    const match = css.match(new RegExp(`${token}:\\s*([^;]+);`, "u"));
    assert.ok(match, `${token} is not declared in design-system.css`);
    assert.equal(match![1].trim(), rem, `${token} must equal brand book value ${rem}`);
  }
});

test("--ds-h1/--ds-h2 clamp between two of the scale's own steps, not arbitrary numbers", () => {
  const css = read("src/design-system.css");
  const h1 = css.match(/--ds-h1:\s*([^;]+);/u)?.[1] ?? "";
  const h2 = css.match(/--ds-h2:\s*([^;]+);/u)?.[1] ?? "";
  const display = css.match(/--ds-display:\s*([^;]+);/u)?.[1] ?? "";
  for (const [name, value] of [["--ds-display", display], ["--ds-h1", h1], ["--ds-h2", h2]] as const) {
    assert.match(value, /clamp\(var\(--ds-fs-\d+\),.*var\(--ds-fs-\d+\)\)/u, `${name} must clamp between two --ds-fs-* tokens, found: ${value}`);
  }
});

// Список растёт по мере перевода на токены (как было с цветом, PROMPT-20 §7.3).
const SCANNED_FILES = ["src/design-system.css", "src/v3-polish.css"];

// Не нарушение: сама декларация токенов (--ds-font-display/body/mono) и
// @font-face для self-hosted Inter — они и есть источник литералов. Плюс
// намеренные декоративные исключения из "одно семейство везде" (PROMPT-28
// §5.3 называет только Helvetica Neue и Times на удаление):
// — Georgia italic-акцент внутри <i> у заголовков — смысловой декоративный
//   курсив, не входит в Display/Body/Mono;
// — inherit/currentColor — не литерал шрифта.
function extractFontFamilyLiterals(css: string): string[] {
  const withoutRoot = css.replace(/:root\s*\{[\s\S]*?\n\}/u, "");
  const withoutFontFace = withoutRoot.replace(/@font-face\s*\{[^}]*\}/gu, "");
  const violations: string[] = [];
  for (const m of withoutFontFace.matchAll(/font-family:\s*([^;]+);/gu)) {
    const value = m[1].trim();
    if (value.startsWith("var(") || value === "inherit" || value === "Georgia, serif") continue;
    violations.push(value);
  }
  for (const m of withoutFontFace.matchAll(/font:\s*[^;]+;/gu)) {
    const decl = m[0];
    if (decl.includes("var(--ds-font") || decl.includes("var(--font-sans)")) continue;
    if (/font:\s*inherit;/u.test(decl)) continue;
    if (decl.includes("Georgia, serif")) continue;
    // A `font:` shorthand ends in a family list after the size/line-height —
    // only flag it if it actually names a family (contains a letter).
    if (/\/[0-9.]+(rem|px|em)?\s+[A-Za-z"]/u.test(decl) || /^font:\s*\d+\s+[0-9.]+(rem|px|em)\s+[A-Za-z"]/u.test(decl)) {
      violations.push(decl);
    }
  }
  return violations;
}

test("no font-family literals outside the shared tokens in the scanned files", () => {
  for (const file of SCANNED_FILES) {
    const css = read(file);
    const violations = extractFontFamilyLiterals(css);
    assert.deepEqual(violations, [], `${file}: font-family literals outside var(--ds-font-*)`);
  }
});

test("no ch-based max-width narrows H1/H2/H3 in the scanned files (PROMPT-28 §5.4)", () => {
  for (const file of SCANNED_FILES) {
    const css = read(file);
    const violations = [...css.matchAll(/(^|[\s,])(h1|h2|h3)[^{]*\{[^}]*max-width:\s*[0-9.]+ch/gmu)].map((m) => m[0]);
    assert.deepEqual(violations, [], `${file}: h1/h2/h3 still narrowed by a ch-based max-width — the container should limit the column, not the heading`);
  }
});

// PROMPT-29 §1: брендбук называет "Inter Bold" (=700), не "чем жирнее тем
// заметнее" — до этой правки H1/H2 несли на себе десяток разных хардкодов
// (750/760/800/820/850/860/900) плюс места, которые вообще не задавали свой
// вес и наследовали 400 от body через Tailwind Preflight (h1..h6 → inherit),
// это и было "/ceny съехал шрифт" в части веса.
test("every explicit H1/H2 font-weight in the scanned files is exactly 700 (PROMPT-29 §1)", () => {
  const files = [...SCANNED_FILES, "src/legal/legal.css"];
  for (const file of files) {
    const css = read(file);
    const violations: string[] = [];
    // Only match rules where h1/h2 is the LAST token of one of its
    // comma-separated selectors (immediately followed by "," or "{") — this
    // excludes child selectors like "h1 i" (the deliberate Georgia-italic
    // accent, kept at weight 400) which are a different element entirely.
    for (const m of css.matchAll(/(?:^|[\s,.>{])(h1|h2)\s*(?=[,{])[^{]*\{([^}]*)\}/gmu)) {
      const [, tag, body] = m;
      // PROMPT-32 §1.1.2: владелец явно попросил подзаголовок "Услуги видеосъёмки
      // в Нижнем Новгороде" — Inter Regular, а не Bold, это описательный текст
      // под H1, а не второй дисплейный заголовок. Точечное, задокументированное
      // исключение, не отмена правила PROMPT-29 §1.
      const context = css.slice(Math.max(0, m.index - 40), m.index);
      if (context.includes(".v32-services__head")) continue;
      const weightMatch = body.match(/font-weight:\s*(\d+)/u) ?? body.match(/font:\s*(\d+)\s/u);
      if (weightMatch && weightMatch[1] !== "700") violations.push(`${tag} { ${body.trim().slice(0, 80)} }`);
    }
    assert.deepEqual(violations, [], `${file}: h1/h2 with a non-700 font-weight`);
  }
});
