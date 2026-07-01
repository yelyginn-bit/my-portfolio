// Движок скидок. Чистые функции, конфиг — в pricing.config.ts.
// Принцип: уровень определяется числом ОФОРМЛЕННЫХ (не отменённых) заказов клиента
// — см. completedOrderCount; скидка применяется к новому заказу. Без двойного начисления.
import type { DiscountTier } from "./types";
import { DISCOUNT_TIERS } from "./pricing.config";
import { getStore } from "./store";

// Редактируемое переопределение уровней (Этап G): загружается из настроек на
// старте островов через setTiersOverride(); по умолчанию — DISCOUNT_TIERS из конфига.
let _override: DiscountTier[] | null = null;

/** Установить уровни из админки/настроек (null — вернуться к конфигу). */
export function setTiersOverride(tiers: DiscountTier[] | null): void {
  _override = tiers && tiers.length ? tiers : null;
}

/** Текущие действующие уровни (override или конфиг). */
export function getActiveTiers(): DiscountTier[] {
  return _override ?? DISCOUNT_TIERS;
}

/** Загрузить уровни из настроек (вызывать на старте островов). */
export async function hydrateTiers(): Promise<void> {
  try {
    const t = await getStore().getSetting<DiscountTier[]>("discount_tiers");
    if (t && t.length) setTiersOverride(t);
  } catch {
    /* настройки недоступны — используем конфиг */
  }
}

function sortedTiers(tiers: DiscountTier[]): DiscountTier[] {
  return [...tiers].sort((a, b) => a.minOrders - b.minOrders);
}

/** Действующий уровень клиента по числу завершённых заказов. */
export function resolveTier(
  completedOrders: number,
  tiers: DiscountTier[] = getActiveTiers(),
): DiscountTier {
  const sorted = sortedTiers(tiers.length ? tiers : DISCOUNT_TIERS);
  // Фолбэк на случай пустого набора (тип обещает non-null).
  let current: DiscountTier = sorted[0] ?? { id: "base", label: "Базовый", minOrders: 0, percent: 0 };
  for (const t of sorted) {
    if (completedOrders >= t.minOrders) current = t;
  }
  return current;
}

/** Процент скидки для клиента. */
export function discountPercentFor(
  completedOrders: number,
  tiers: DiscountTier[] = getActiveTiers(),
): number {
  return resolveTier(completedOrders, tiers).percent;
}

/** Применить процент к сумме, вернуть целые рубли. Процент клампится в [0..100]
 *  (уровни редактируются из админки/БД — защищаемся от мусора, ухода цены в минус). */
export function applyDiscount(amount: number, percent: number): number {
  const p = Math.min(100, Math.max(0, percent || 0));
  if (!p) return amount;
  return Math.round(amount * (1 - p / 100));
}

/** Следующий уровень и сколько заказов до него — для мотивации в кабинете. */
export function nextTier(
  completedOrders: number,
  tiers: DiscountTier[] = getActiveTiers(),
): { tier: DiscountTier; ordersLeft: number } | null {
  const next = sortedTiers(tiers).find((t) => t.minOrders > completedOrders);
  if (!next) return null;
  return { tier: next, ordersLeft: next.minOrders - completedOrders };
}
