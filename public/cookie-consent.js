(() => {
  const KEY = "cookie_consent_v2";
  const VERSION = "1.0";
  const EVENT = "yelyginn:cookie-consent";
  const privatePath = /^\/(?:account|admin|g)(?:\/|$)|\/(?:payment|checkout)(?:\/|$)/u;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
  };
  const allowed = () => Boolean(read()?.analytics) && !privatePath.test(location.pathname);
  const clearAnalytics = () => {
    Object.keys(localStorage).filter((key) => /^_?(?:ga|ym)/iu.test(key)).forEach((key) => localStorage.removeItem(key));
    document.cookie.split(";").map((v) => v.split("=")[0].trim()).filter((name) => /^_ga|^_ym|^yandexuid|^_ym_/iu.test(name)).forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname}; SameSite=Lax`;
    });
    window[`yaCounter${document.currentScript?.dataset?.metrikaId || ""}`]?.destruct?.();
  };
  const save = (analytics) => {
    localStorage.setItem(KEY, JSON.stringify({ necessary: true, analytics: Boolean(analytics), version: VERSION, updatedAt: new Date().toISOString() }));
    if (!analytics) clearAnalytics();
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { analytics: Boolean(analytics) } }));
  };

  const style = document.createElement("style");
  style.textContent = `.yel-cookie{position:fixed;inset:0;z-index:9999;display:grid;place-items:end center;padding:16px;background:rgba(0,0,0,.22);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.yel-cookie[hidden]{display:none}.yel-cookie__box{width:min(720px,100%);padding:20px;border:1px solid #d7d7d2;border-radius:8px;background:#fff;color:#111;box-shadow:0 20px 60px rgba(0,0,0,.2)}.yel-cookie h2{margin:0 0 8px;font-size:22px}.yel-cookie p{margin:0 0 16px}.yel-cookie__actions{display:flex;gap:8px;flex-wrap:wrap}.yel-cookie button{min-height:44px;padding:0 16px;border:1px solid #111;border-radius:4px;background:#fff;color:#111;cursor:pointer;font-weight:650}.yel-cookie button[data-primary]{background:#111;color:#fff}.yel-cookie__settings{padding:12px 0}.yel-cookie label{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-top:1px solid #ddd}.yel-cookie a{color:inherit;text-underline-offset:3px}@media(max-width:520px){.yel-cookie__actions{display:grid}.yel-cookie button{width:100%}}`;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "yel-cookie";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "yel-cookie-title");
  root.innerHTML = `<div class="yel-cookie__box"><h2 id="yel-cookie-title">Настройки cookie</h2><p>Необходимые технологии обеспечивают работу сайта. Аналитика включается только с вашего согласия. Подробнее в <a href="/cookie-policy">политике cookies</a>.</p><div class="yel-cookie__settings" hidden><label><span><strong>Необходимые</strong><br>Авторизация, безопасность и сохранение выбора</span><input type="checkbox" checked disabled aria-label="Необходимые cookie всегда включены"></label><label><span><strong>Аналитические</strong><br>Яндекс Метрика и, если настроено, Google Analytics</span><input type="checkbox" data-analytics aria-label="Разрешить аналитические cookie"></label></div><div class="yel-cookie__actions"><button type="button" data-primary data-accept>Принять аналитику</button><button type="button" data-necessary>Только необходимые</button><button type="button" data-settings>Настроить</button><button type="button" data-save hidden>Сохранить выбор</button></div></div>`;
  document.body.appendChild(root);
  const settings = root.querySelector(".yel-cookie__settings");
  const toggle = root.querySelector("[data-analytics]");
  const close = () => { root.hidden = true; };
  const open = () => { toggle.checked = Boolean(read()?.analytics); root.hidden = false; };
  root.querySelector("[data-accept]").addEventListener("click", () => { save(true); close(); });
  root.querySelector("[data-necessary]").addEventListener("click", () => { save(false); close(); });
  root.querySelector("[data-settings]").addEventListener("click", (event) => {
    settings.hidden = false; event.currentTarget.hidden = true; root.querySelector("[data-save]").hidden = false;
  });
  root.querySelector("[data-save]").addEventListener("click", () => { save(toggle.checked); close(); });
  document.addEventListener("click", (event) => {
    const control = event.target instanceof Element ? event.target.closest("[data-cookie-settings]") : null;
    if (control) { event.preventDefault(); open(); }
  });
  window.yelyginnCookieConsent = { open, allowed, save };
  if (!read()) open();
})();
