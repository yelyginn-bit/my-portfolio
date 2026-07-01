const CONSENT_KEY = "cookie_consent_v1";
const CONSENT_EVENT = "yelyginn:analytics-consent";

let initialized = false;
let clickTrackingBound = false;

const appendScript = (src: string) => {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const startAnalytics = () => {
  if (initialized || window.localStorage.getItem(CONSENT_KEY) !== "accepted") return;
  initialized = true;

  const gaId = (import.meta.env.VITE_GA_ID || "").trim();
  if (gaId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", gaId, { anonymize_ip: true });
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
  if (typeof window === "undefined" || window.localStorage.getItem(CONSENT_KEY) !== "accepted") return;

  window.gtag?.("event", eventName, params);

  const metrikaId = Number.parseInt((import.meta.env.VITE_YANDEX_METRIKA_ID || "").trim(), 10);
  if (Number.isFinite(metrikaId) && metrikaId > 0) {
    window.ym?.(metrikaId, "reachGoal", eventName, params);
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
    const label = (link.textContent || "").trim().replace(/\s+/gu, " ").slice(0, 120);

    if (href.includes("t.me/")) {
      trackAnalyticsEvent("telegram_click", { label, page: window.location.pathname });
    }
    if (/\/portfolio(?:\/|$)/u.test(new URL(href, window.location.href).pathname)) {
      trackAnalyticsEvent("portfolio_view", { label, destination: href });
    }
    if (/обсудить (?:похожий )?проект/iu.test(label)) {
      trackAnalyticsEvent("discuss_project_click", { page: window.location.pathname });
    }
  });
};

export const initAnalytics = () => {
  if (typeof window === "undefined") return;
  bindClickTracking();
  startAnalytics();
  window.addEventListener(CONSENT_EVENT, startAnalytics, { once: true });
};

export const grantAnalyticsConsent = () => {
  window.localStorage.setItem(CONSENT_KEY, "accepted");
  window.dispatchEvent(new Event(CONSENT_EVENT));
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  }
}
