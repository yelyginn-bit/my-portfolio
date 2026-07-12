(() => {
  const consentKey = "cookie_consent_v2";
  const currentScript = document.currentScript;
  const metrikaId = Number.parseInt(currentScript?.dataset.metrikaId || "", 10);
  const gaId = currentScript?.dataset.gaId || "";
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
  const start = () => {
    if (started || !hasConsent() || privatePath.test(location.pathname)) return;
    started = true;

    if (/^G-[A-Z0-9]+$/u.test(gaId)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", gaId, { anonymize_ip: true });
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
    if (!hasConsent() || privatePath.test(location.pathname)) return;
    window.gtag?.("event", name, params);
    if (Number.isFinite(metrikaId) && metrikaId > 0) {
      window.ym?.(metrikaId, "reachGoal", name, params);
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link) return;
    const href = link.href;
    const label = (link.textContent || "").trim().replace(/\s+/gu, " ").slice(0, 120);
    if (href.includes("t.me/")) track("telegram_click", { page: location.pathname });
    if (/\/portfolio(?:\/|$)/u.test(new URL(href, location.href).pathname)) {
      track("portfolio_view", { section: "portfolio" });
    }
    if (/обсудить (?:похожий )?проект/iu.test(label)) {
      track("discuss_project_click", { page: location.pathname });
    }
  });

  start();
  window.addEventListener("yelyginn:cookie-consent", start);
})();
