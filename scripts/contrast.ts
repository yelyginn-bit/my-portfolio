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

const PAIRS: Array<{ label: string; a: string; b: string; threshold: number }> = [
  { label: "ORANGE на INK", a: BRAND.ORANGE, b: BRAND.INK, threshold: 3.0 },
  { label: "ORANGE на GRAPHITE", a: BRAND.ORANGE, b: BRAND.GRAPHITE, threshold: 3.0 },
  { label: "ORANGE на PAPER", a: BRAND.ORANGE, b: BRAND.PAPER, threshold: 3.0 },
  { label: "INK на ORANGE", a: BRAND.INK, b: BRAND.ORANGE, threshold: 3.0 },
  { label: "белый на ORANGE", a: WHITE, b: BRAND.ORANGE, threshold: 3.0 },
  { label: "PAPER на ORANGE", a: BRAND.PAPER, b: BRAND.ORANGE, threshold: 3.0 },
  { label: "#C83227 на PAPER", a: LEGACY_ACCENT_TEXT, b: BRAND.PAPER, threshold: 4.5 },
  { label: "INK на нынешнем #EF3F32", a: BRAND.INK, b: CURRENT_ACCENT, threshold: 4.5 },
  { label: "VIOLET на INK", a: BRAND.VIOLET, b: BRAND.INK, threshold: 4.5 },
  { label: "VIOLET на GRAPHITE", a: BRAND.VIOLET, b: BRAND.GRAPHITE, threshold: 3.0 },
  { label: "VIOLET на PAPER", a: BRAND.VIOLET, b: BRAND.PAPER, threshold: 3.0 },
  { label: "белый на VIOLET", a: WHITE, b: BRAND.VIOLET, threshold: 3.0 },
  { label: "FOG на INK", a: BRAND.FOG, b: BRAND.INK, threshold: 4.5 },
  { label: "FOG на PAPER", a: BRAND.FOG, b: BRAND.PAPER, threshold: 3.0 },
];

export function printTable(): void {
  console.log("Пара".padEnd(28), "Контраст".padEnd(10), "Порог", "Проходит");
  for (const { label, a, b, threshold } of PAIRS) {
    const ratio = contrastRatio(a, b);
    const pass = ratio >= threshold;
    console.log(
      label.padEnd(28),
      ratio.toFixed(2).padEnd(10),
      String(threshold).padEnd(6),
      pass ? "да" : "НЕТ",
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  printTable();
}
