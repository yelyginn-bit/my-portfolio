(() => {
  const consentKey = "cookie_consent_v2";
  const currentScript = document.currentScript;
  const metrikaId = Number.parseInt(currentScript?.dataset.metrikaId || "", 10);
  const gaId = currentScript?.dataset.gaId || "";
  const allowedEvents = new Set(["lead_submit", "telegram_click", "calculator_use", "portfolio_view", "discuss_project_click"]);
  const allowedParams = new Set(["page", "service", "source", "section", "total_min", "total_max"]);
  let started = false;

  const appendScript = (src) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  };

  const privatePath = /^\/(?:account|admin|g)(?:\/|$)|\/(?:payment|checkout)(?:\/|$)/u;
  const hasConsent = () => {
    try { return Boolean(JSON.parse(localStorage.getItem(consentKey) || "null")?.analytics); } catch { return false; }
  };
  const safePath = () => location.pathname.replace(/\/{2,}/gu, "/").slice(0, 160);
  const sanitize = (params) => Object.fromEntries(Object.entries(params)
    .filter(([key]) => allowedParams.has(key))
    .map(([key, value]) => {
      if (key === "page") return [key, safePath()];
      if (typeof value === "number") return [key, Number.isFinite(value) ? Math.round(value) : 0];
      const text = String(value).replace(/[\r\n]/gu, " ").slice(0, 80);
      return [key, /@|https?:|\+?\d[\d\s()-]{8,}/u.test(text) ? "redacted" : text];
    }));
  const start = () => {
    if (started || !hasConsent() || privatePath.test(location.pathname)) return;
    started = true;

    if (/^G-[A-Z0-9]+$/u.test(gaId)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", gaId, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: `${location.origin}${safePath()}`,
        page_path: safePath(),
      });
      appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
    }

    if (Number.isFinite(metrikaId) && metrikaId > 0) {
      window.ym = window.ym || function ym() {
        (window.ym.a = window.ym.a || []).push(arguments);
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

  const track = (name, params = {}) => {
    if (!allowedEvents.has(name) || !hasConsent() || privatePath.test(location.pathname)) return;
    const safeParams = sanitize(params);
    window.gtag?.("event", name, safeParams);
    if (Number.isFinite(metrikaId) && metrikaId > 0) {
      window.ym?.(metrikaId, "reachGoal", name, safeParams);
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link) return;
    const href = link.href;
    const label = (link.textContent || "").trim().replace(/\s+/gu, " ").slice(0, 120);
    if (href.includes("t.me/")) track("telegram_click", { page: safePath() });
    if (/\/portfolio(?:\/|$)/u.test(new URL(href, location.href).pathname)) {
      track("portfolio_view", { section: "portfolio" });
    }
    if (/обсудить (?:похожий )?проект/iu.test(label)) {
      track("discuss_project_click", { page: location.pathname });
    }
  });

  start();
  window.addEventListener("yelyginn:cookie-consent", (event) => {
    if (event.detail?.analytics) start();
    else {
      document.querySelectorAll('script[src*="googletagmanager.com"],script[src*="mc.yandex.ru/metrika"]').forEach((script) => script.remove());
      started = false;
    }
  });
})();
