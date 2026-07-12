const CONSENT_KEY = "cookie_consent_v2";
const CONSENT_EVENT = "yelyginn:cookie-consent";
const PRIVATE_PATH = /^\/(?:account|admin|g)(?:\/|$)|\/(?:payment|checkout)(?:\/|$)/u;
const ALLOWED_EVENTS = new Set(["lead_submit", "telegram_click", "calculator_use", "portfolio_view", "discuss_project_click"]);
const ALLOWED_PARAMS = new Set(["page", "service", "source", "section", "total_min", "total_max"]);

let initialized = false;
let clickTrackingBound = false;

const appendScript = (src: string) => {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const safePath = () => window.location.pathname.replace(/\/{2,}/gu, "/").slice(0, 160);

const sanitizeParams = (params: Record<string, string | number | boolean>) => Object.fromEntries(
  Object.entries(params)
    .filter(([key]) => ALLOWED_PARAMS.has(key))
    .map(([key, value]) => {
      if (key === "page") return [key, safePath()];
      if (typeof value === "number") return [key, Number.isFinite(value) ? Math.round(value) : 0];
      const text = String(value).replace(/[\r\n]/gu, " ").slice(0, 80);
      return [key, /@|https?:|\+?\d[\d\s()-]{8,}/u.test(text) ? "redacted" : text];
    }),
);

const stopAnalytics = () => {
  document.querySelectorAll<HTMLScriptElement>('script[src*="googletagmanager.com"],script[src*="mc.yandex.ru/metrika"]')
    .forEach((script) => script.remove());
  initialized = false;
};

const startAnalytics = () => {
  let consent: { analytics?: boolean } | null = null;
  try { consent = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || "null"); } catch { consent = null; }
  if (initialized || !consent?.analytics || PRIVATE_PATH.test(window.location.pathname)) return;
  initialized = true;

  const gaId = (import.meta.env.VITE_GA_ID || "").trim();
  if (gaId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", gaId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: `${window.location.origin}${safePath()}`,
      page_path: safePath(),
    });
    appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
  }

  const metrikaId = Number.parseInt((import.meta.env.VITE_YANDEX_METRIKA_ID || "").trim(), 10);
  if (Number.isFinite(metrikaId) && metrikaId > 0) {
    window.ym = window.ym || function ym(...args: unknown[]) {
      (window.ym!.a = window.ym!.a || []).push(args);
    };
    window.ym.l = Date.now();
    window.ym(metrikaId, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: false,
    });
    appendScript("https://mc.yandex.ru/metrika/tag.js");
  }
};

export const trackAnalyticsEvent = (
  eventName: string,
  params: Record<string, string | number | boolean> = {},
) => {
  if (typeof window === "undefined" || !ALLOWED_EVENTS.has(eventName) || PRIVATE_PATH.test(window.location.pathname)) return;
  let consent: { analytics?: boolean } | null = null;
  try { consent = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || "null"); } catch { consent = null; }
  if (!consent?.analytics) return;

  const safeParams = sanitizeParams(params);
  window.gtag?.("event", eventName, safeParams);

  const metrikaId = Number.parseInt((import.meta.env.VITE_YANDEX_METRIKA_ID || "").trim(), 10);
  if (Number.isFinite(metrikaId) && metrikaId > 0) {
    window.ym?.(metrikaId, "reachGoal", eventName, safeParams);
  }
};

const bindClickTracking = () => {
  if (clickTrackingBound) return;
  clickTrackingBound = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (!link) return;

    const href = link.href;
    if (href.includes("t.me/")) {
      trackAnalyticsEvent("telegram_click", { page: safePath() });
    }
    if (/\/portfolio(?:\/|$)/u.test(new URL(href, window.location.href).pathname)) {
      trackAnalyticsEvent("portfolio_view", { section: "portfolio" });
    }
    const label = (link.textContent || "").trim().replace(/\s+/gu, " ").slice(0, 120);
    if (/обсудить (?:похожий )?проект/iu.test(label)) {
      trackAnalyticsEvent("discuss_project_click", { page: window.location.pathname });
    }
  });
};

export const initAnalytics = () => {
  if (typeof window === "undefined") return;
  bindClickTracking();
  startAnalytics();
  window.addEventListener(CONSENT_EVENT, (event) => {
    const analytics = (event as CustomEvent<{ analytics?: boolean }>).detail?.analytics;
    if (analytics) startAnalytics();
    else stopAnalytics();
  });
};

export const grantAnalyticsConsent = () => {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ necessary: true, analytics: true, version: "1.0", updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { analytics: true } }));
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  }
}
