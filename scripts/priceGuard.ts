import { readFileSync } from "node:fs";
import path from "node:path";
import { PUBLIC_PRICE_BY_ID } from "../src/lib/pricing.data.ts";

/**
 * Достаёт числа похожие на цену (₽): группы цифр (пробел/nbsp — разделитель
 * тысяч), 4–6 значащих цифр — от 1 500 до 999 999. Диапазон отсекает длинные
 * ID (например, цифры в ссылках на соцсети), которые не могут быть ценой.
 */
export function extractPriceLikeNumbers(text: string): number[] {
  const matches = text.match(/(?<!\d)\d[\d  ]*\d(?!\d)/gu) ?? [];
  return matches
    .map((m) => m.replace(/[\s ]/gu, ""))
    .filter((digits) => digits.length >= 4 && digits.length <= 6)
    .map(Number);
}

function extractJsonLdBlocks(html: string): string[] {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gu)].map((m) => m[1]);
}

/**
 * Проверяет, что каждое число похожее на цену в JSON-LD этих файлов
 * присутствует где-то в src/lib/pricing.data.ts — второго источника цен
 * в разметке быть не должно.
 */
export function checkJsonLdPrices(rootDir: string, htmlFiles: string[]): string[] {
  const pricingSource = readFileSync(path.join(rootDir, "src/lib/pricing.data.ts"), "utf8");
  const known = new Set(extractPriceLikeNumbers(pricingSource));
  const problems: string[] = [];
  for (const file of htmlFiles) {
    const html = readFileSync(path.join(rootDir, file), "utf8");
    for (const block of extractJsonLdBlocks(html)) {
      for (const n of extractPriceLikeNumbers(block)) {
        if (!known.has(n)) problems.push(`${file}: число ${n} в JSON-LD отсутствует в pricing.data.ts`);
      }
    }
  }
  return problems;
}

const SAJTY_PRICE_REFERENCES = ["sajty-start", "sajty-pro", "sajty-premium", "sajty-support"] as const;

/** Replace template references with the sole public-price source at build time. */
export function renderSajtyPriceReferences(html: string): string {
  let result = html;
  for (const id of SAJTY_PRICE_REFERENCES) {
    const marker = `<span data-price-reference="${id}"></span>`;
    const occurrences = result.split(marker).length - 1;
    if (occurrences !== 1) throw new Error(`sajty.html: expected one ${id} price reference, found ${occurrences}`);
    const item = PUBLIC_PRICE_BY_ID[id];
    if (!item || item.category !== "Сайты" || item.showOnCatalog !== false) {
      throw new Error(`sajty.html: ${id} must exist in the hidden-from-catalog Сайты price data`);
    }
    result = result.replace(marker, item.price);
  }
  if (/data-price-reference=/u.test(result)) throw new Error("sajty.html: unknown public price reference");
  return result;
}
