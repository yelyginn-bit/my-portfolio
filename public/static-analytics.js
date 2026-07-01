(() => {
  const consentKey = "cookie_consent_v1";
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

  const start = () => {
    if (started || localStorage.getItem(consentKey) !== "accepted") return;
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
    if (localStorage.getItem(consentKey) !== "accepted") return;
    window.gtag?.("event", name, params);
    if (Number.isFinite(metrikaId) && metrikaId > 0) {
      window.ym?.(metrikaId, "reachGoal", name, params);
    }
  };

  const mountConsent = () => {
    if (localStorage.getItem(consentKey) === "accepted") return;
    const banner = document.createElement("aside");
    banner.setAttribute("aria-label", "Настройки cookie");
    banner.innerHTML = '<p>Сайт использует cookie для аналитики. Подробнее — в <a href="/privacy-policy">политике обработки данных</a>.</p><button type="button">Принять</button>';
    Object.assign(banner.style, {
      position: "fixed", right: "16px", bottom: "16px", zIndex: "1000",
      width: "min(420px, calc(100vw - 32px))", padding: "16px",
      border: "1px solid rgba(10,10,10,.14)", borderRadius: "8px",
      color: "#0a0a0a", background: "rgba(255,255,255,.96)",
      boxShadow: "0 18px 50px rgba(10,10,10,.14)",
      font: "13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    });
    const paragraph = banner.querySelector("p");
    if (paragraph) paragraph.style.margin = "0 0 12px";
    const link = banner.querySelector("a");
    if (link) {
      link.style.textDecoration = "underline";
      link.style.textUnderlineOffset = "3px";
    }
    const button = banner.querySelector("button");
    if (button) {
      Object.assign(button.style, {
        minHeight: "40px", padding: "0 16px", border: "0", borderRadius: "999px",
        color: "#fff", background: "#0a0a0a", cursor: "pointer",
        font: "600 10px/1 monospace", letterSpacing: ".12em", textTransform: "uppercase",
      });
      button.addEventListener("click", () => {
        localStorage.setItem(consentKey, "accepted");
        start();
        banner.remove();
      });
    }
    document.body.appendChild(banner);
  };

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link) return;
    const href = link.href;
    const label = (link.textContent || "").trim().replace(/\s+/gu, " ").slice(0, 120);
    if (href.includes("t.me/")) track("telegram_click", { label, page: location.pathname });
    if (/\/portfolio(?:\/|$)/u.test(new URL(href, location.href).pathname)) {
      track("portfolio_view", { label, destination: href });
    }
    if (/обсудить (?:похожий )?проект/iu.test(label)) {
      track("discuss_project_click", { page: location.pathname });
    }
  });

  start();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountConsent, { once: true });
  } else {
    mountConsent();
  }
})();
