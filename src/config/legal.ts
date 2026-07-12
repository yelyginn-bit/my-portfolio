export type InfrastructureRegion = "ru" | "foreign" | "unknown" | "disabled";

export const LEGAL = {
  operator: "Елыгин Юрий Сергеевич",
  taxId: "526219298988",
  status: "Плательщик налога на профессиональный доход (самозанятый)",
  email: "y.elyginn@gmail.com",
  telegram: "@YuriElygin",
  telegramUrl: "https://t.me/YuriElygin",
  domain: "https://yelyginn.ru",
  policyVersion: "2.0",
  consentVersion: "1.0",
  cookieVersion: "1.0",
  effectiveDate: "11 июля 2026 года",
  activePolicyVersions: ["2.0"],
  activeConsentVersions: ["1.0"],
} as const;

export const SERVICES: Record<string, { title: string; region: InfrastructureRegion; production: boolean; optional: boolean }> = {
  regRu: { title: "REG.RU / Рег.облако", region: "ru", production: true, optional: false },
  supabase: { title: "Supabase", region: "unknown", production: true, optional: false },
  telegram: { title: "Telegram", region: "foreign", production: true, optional: false },
  vercel: { title: "Vercel relay", region: "foreign", production: true, optional: true },
  kinescope: { title: "Kinescope", region: "ru", production: true, optional: true },
  yandexMetrika: { title: "Яндекс Метрика", region: "ru", production: true, optional: true },
  googleAnalytics: { title: "Google Analytics", region: "disabled", production: false, optional: true },
  yookassa: { title: "ЮKassa", region: "disabled", production: false, optional: true },
  yandexDisk: { title: "Яндекс Диск", region: "ru", production: true, optional: true },
  cloudflare: { title: "Cloudflare", region: "disabled", production: false, optional: true },
};

export const LEGAL_PATHS = {
  privacy: "/privacy-policy",
  consent: "/personal-data-consent",
  cookies: "/cookie-policy",
  terms: "/terms",
  payment: "/payment-terms",
  refund: "/cancellation-refund",
  gallery: "/gallery-terms",
  dataRequest: "/data-request",
} as const;
