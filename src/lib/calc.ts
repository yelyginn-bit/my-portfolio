// Чистый расчёт стоимости из выбора пользователя. Без побочных эффектов.
import type {
  EstimateData,
  OrderSelection,
  PriceBreakdown,
  PriceItem,
} from "./types";
import { getActiveEstimateData } from "./pricing.runtime";
import { URGENCY_SURCHARGE } from "./pricing.config";
import { applyDiscount } from "./discounts";

/** Стоимость одной позиции с учётом числа смен (для unit==="day"). */
function itemCost(item: PriceItem, days: number): { min: number; max: number } {
  const mult = item.unit === "day" ? Math.max(1, days) : 1;
  return { min: item.priceMin * mult, max: item.priceMax * mult };
}

/**
 * Полный расчёт: суммирует выбранные базовые + доп-позиции,
 * добавляет срочность, применяет скидку. Возвращает вилку до и после.
 */
export function computeBreakdown(
  selection: OrderSelection,
  discountPercent: number,
  data: EstimateData = getActiveEstimateData(),
): PriceBreakdown {
  const typeData = data[selection.shootType];
  let subMin = 0;
  let subMax = 0;

  if (typeData) {
    const chosen: PriceItem[] = [
      ...typeData.base.filter((i) => selection.baseItems.includes(i.name)),
      ...typeData.options.filter((i) => selection.optionItems.includes(i.name)),
    ];
    for (const item of chosen) {
      const c = itemCost(item, selection.days);
      subMin += c.min;
      subMax += c.max;
    }
  }

  if (selection.urgent) {
    subMin = Math.round(subMin * (1 + URGENCY_SURCHARGE));
    subMax = Math.round(subMax * (1 + URGENCY_SURCHARGE));
  }

  return {
    subtotalMin: subMin,
    subtotalMax: subMax,
    discountPercent,
    totalMin: applyDiscount(subMin, discountPercent),
    totalMax: applyDiscount(subMax, discountPercent),
  };
}

/** Формат рублей: 30000 → "30 000 ₽". */
export function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}
