// Единая точка настройки экономики калькулятора и скидок.
// МЕНЯЙ ЗДЕСЬ — ядро (calc.ts, discounts.ts) и UI трогать не нужно.
import type { DiscountTier } from "./types";

/** Наценка за срочность (ускоренные сроки): +25% к итогу. */
export const URGENCY_SURCHARGE = 0.25;

/** Максимум съёмочных смен в слайдере калькулятора. */
export const MAX_DAYS = 10;

/**
 * Уровни скидки по числу ЗАВЕРШЁННЫХ заказов клиента.
 * Берётся наивысший уровень, для которого completedOrders >= minOrders.
 * Скидка применяется к СЛЕДУЮЩЕМУ заказу, т.е. зависит от прошлых, не от текущего.
 *
 * Пример прогрессии (легко изменить):
 *   0 завершённых (1-й заказ)  → 0%
 *   1 завершённый  (2-й заказ) → 5%
 *   2 завершённых  (3-й заказ) → 10%
 *   5+ завершённых (VIP)       → 15%
 */
export const DISCOUNT_TIERS: DiscountTier[] = [
  { id: "new", label: "Новый клиент", minOrders: 0, percent: 0 },
  { id: "repeat", label: "Повторный клиент", minOrders: 1, percent: 5 },
  { id: "regular", label: "Постоянный клиент", minOrders: 2, percent: 10 },
  { id: "vip", label: "VIP-клиент", minOrders: 5, percent: 15 },
];
