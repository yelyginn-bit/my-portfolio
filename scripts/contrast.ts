// WCAG 2.1 relative luminance / contrast ratio — без зависимостей.
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/u, "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  if (!/^[0-9a-fA-F]{6}$/u.test(full)) throw new Error(`Bad hex color: ${hex}`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

export const BRAND = {
  INK: "#0A0A0A",
  PAPER: "#F2F1EC",
  GRAPHITE: "#171717",
  FOG: "#D9D7D1",
  VIOLET: "#8A5CF6",
  ORANGE: "#FF6422",
} as const;

const WHITE = "#FFFFFF";
const LEGACY_ACCENT_TEXT = "#C83227";
const CURRENT_ACCENT = "#EF3F32";

// Порог задаётся РОЛЬЮ пары, не нынешним значением цвета:
// "text"     — любой текст (в т.ч. мелкий) → AA требует 4.5.
// "large-ui" — только крупный текст (≥24px/≥18.66px bold), элементы интерфейса
//              (границы контролов, иконки) и индикаторы фокуса → AA требует 3.0.
type Role = "text" | "large-ui";
const THRESHOLD: Record<Role, number> = { text: 4.5, "large-ui": 3.0 };

// expect: "pass" — реально используется как заливка+текст, обязан пройти порог
//         своей роли (tests/palette.test.ts это проверяет).
//         "fail" — документирует, почему прямое использование запрещено (в коде
//         не встречается — роль занята заменой типа --ds-accent-text-legacy);
//         тест проверяет, что пара НЕ проходит, иначе документация лжёт.
type Expect = "pass" | "fail";
const PAIRS: Array<{ label: string; a: string; b: string; role: Role; expect: Expect }> = [
  // nav a[aria-current], .v3-button--orange, .calc-cta, .calc-type[data-active] —
  // все мелкий текст на заливке ORANGE. Было порог 3 — правило требует 4.5.
  { label: "ORANGE на INK", a: BRAND.ORANGE, b: BRAND.INK, role: "text", expect: "pass" },
  { label: "ORANGE на GRAPHITE", a: BRAND.ORANGE, b: BRAND.GRAPHITE, role: "text", expect: "pass" },
  { label: "INK на ORANGE", a: BRAND.INK, b: BRAND.ORANGE, role: "text", expect: "pass" },
  // ORANGE как текст на PAPER нигде не используется (роль занята accent-text-legacy) —
  // пара документирует, почему замена нужна; тот же класс, что и три выше.
  { label: "ORANGE на PAPER", a: BRAND.ORANGE, b: BRAND.PAPER, role: "text", expect: "fail" },
  // белый/PAPER текст на ORANGE — тот же класс (белый-на-заливке), в коде не
  // встречается (был баг, уже исправлен на INK-текст); оставлено как документация бага.
  { label: "белый на ORANGE", a: WHITE, b: BRAND.ORANGE, role: "text", expect: "fail" },
  { label: "PAPER на ORANGE", a: BRAND.PAPER, b: BRAND.ORANGE, role: "text", expect: "fail" },
  { label: "#C83227 на PAPER", a: LEGACY_ACCENT_TEXT, b: BRAND.PAPER, role: "text", expect: "pass" },
  { label: "INK на нынешнем #EF3F32", a: BRAND.INK, b: CURRENT_ACCENT, role: "text", expect: "pass" },
  { label: "VIOLET на INK", a: BRAND.VIOLET, b: BRAND.INK, role: "text", expect: "pass" },
  // VIOLET нигде не используется как заливка под текст (только акцентная левая
  // граница, .v32-hero__position) — реальная роль пока "large-ui", не текст.
  { label: "VIOLET на GRAPHITE", a: BRAND.VIOLET, b: BRAND.GRAPHITE, role: "large-ui", expect: "pass" },
  { label: "VIOLET на PAPER", a: BRAND.VIOLET, b: BRAND.PAPER, role: "large-ui", expect: "pass" },
  { label: "белый на VIOLET", a: WHITE, b: BRAND.VIOLET, role: "large-ui", expect: "pass" },
  { label: "FOG на INK", a: BRAND.FOG, b: BRAND.INK, role: "text", expect: "pass" },
  // FOG — линии/разделители (--ds-border), не текст.
  { label: "FOG на PAPER", a: BRAND.FOG, b: BRAND.PAPER, role: "large-ui", expect: "fail" },
];

export function printTable(): void {
  console.log("Пара".padEnd(28), "Контраст".padEnd(10), "Порог", "Проходит");
  for (const { label, a, b, role } of PAIRS) {
    const ratio = contrastRatio(a, b);
    const threshold = THRESHOLD[role];
    const pass = ratio >= threshold;
    console.log(
      label.padEnd(28),
      ratio.toFixed(2).padEnd(10),
      String(threshold).padEnd(6),
      pass ? "да" : "НЕТ",
    );
  }
}

export { PAIRS, THRESHOLD };

if (import.meta.url === `file://${process.argv[1]}`) {
  printTable();
}
