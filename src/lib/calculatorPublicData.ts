import type { EstimateData } from "./types";
import { ESTIMATE_DATA, PUBLIC_PRICE_BY_ID } from "./pricing.data";

// Keep the existing estimate intact; this public package derives its price and scope
// from the catalogue instead of inventing separately priced components or add-ons.
export const MARKETPLACE_PACKAGE = PUBLIC_PRICE_BY_ID.marketplace;
const amountText = MARKETPLACE_PACKAGE.price.match(/^от\s+([\d\s\u00a0]+)\s*₽$/u)?.[1];
const amount = Number(amountText?.replace(/\s/gu, ""));
if (!amountText || !Number.isSafeInteger(amount) || amount <= 0) {
  throw new Error("Marketplace catalogue price must contain one positive starting amount");
}

export const PUBLIC_CALCULATOR_DATA: EstimateData = {
  ...ESTIMATE_DATA,
  [MARKETPLACE_PACKAGE.title]: {
    base: [{ name: MARKETPLACE_PACKAGE.description.replace(/\.$/u, ""), priceMin: amount, priceMax: amount, unit: "project" }],
    options: [],
  },
};
