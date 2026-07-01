// Runtime-слой прайса калькулятора (v2): даёт редактируемый из админки/БД прайс
// поверх статичного конфига `pricing.data.ts`. Паттерн как у discounts-override:
// при наличии правил в БД (price_rules) — используем их; иначе — конфиг (fallback).
import type { EstimateData, PriceItem, PriceRule, PriceUnit } from "./types";
import { ESTIMATE_DATA } from "./pricing.data";
import { getStore } from "./store";

let _override: EstimateData | null = null;

/** Установить прайс из БД/админки (null — вернуться к конфигу). */
export function setPriceOverride(data: EstimateData | null): void {
  _override = data && Object.keys(data).length ? data : null;
}

/** Действующий прайс (override из БД или конфиг). */
export function getActiveEstimateData(): EstimateData {
  return _override ?? ESTIMATE_DATA;
}

/** Действующие типы съёмки (ключи активного прайса). */
export function getActiveShootTypes(): string[] {
  return Object.keys(getActiveEstimateData());
}

/** price_rules (плоские) → EstimateData (для калькулятора). */
export function rulesToEstimateData(rules: PriceRule[]): EstimateData {
  const data: EstimateData = {};
  for (const r of [...rules].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!data[r.shootType]) data[r.shootType] = { base: [], options: [] };
    const item: PriceItem = { name: r.name, priceMin: r.priceMin, priceMax: r.priceMax, unit: r.unit as PriceUnit };
    (r.kind === "option" ? data[r.shootType].options : data[r.shootType].base).push(item);
  }
  return data;
}

/** EstimateData → плоские price_rules (для сидирования БД из конфига). */
export function estimateDataToRules(data: EstimateData): Omit<PriceRule, "id">[] {
  const out: Omit<PriceRule, "id">[] = [];
  for (const [shootType, group] of Object.entries(data)) {
    group.base.forEach((it, i) =>
      out.push({ shootType, kind: "base", name: it.name, unit: it.unit, priceMin: it.priceMin, priceMax: it.priceMax, sortOrder: i, active: true }),
    );
    group.options.forEach((it, i) =>
      out.push({ shootType, kind: "option", name: it.name, unit: it.unit, priceMin: it.priceMin, priceMax: it.priceMax, sortOrder: 100 + i, active: true }),
    );
  }
  return out;
}

/** Подтянуть прайс из БД на старте острова. Если правил нет — остаётся конфиг. */
export async function hydratePriceRules(): Promise<void> {
  try {
    const rules = await getStore().listPriceRules({ activeOnly: true });
    if (rules.length) setPriceOverride(rulesToEstimateData(rules));
  } catch {
    /* нет БД — используем конфиг */
  }
}

/** Засеять price_rules из конфига, если таблица пуста (для админки). Возвращает число созданных. */
export async function seedPriceRulesFromConfig(): Promise<number> {
  const store = getStore();
  const existing = await store.listPriceRules();
  if (existing.length) return 0;
  const rules = estimateDataToRules(ESTIMATE_DATA);
  for (const r of rules) await store.createPriceRule(r);
  return rules.length;
}
