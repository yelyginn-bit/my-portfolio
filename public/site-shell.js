(() => {
  const privateRoute = /^\/(?:admin|account|gallery|g)(?:\/|$)/u.test(window.location.pathname);
  if (privateRoute) return;

  const path = window.location.pathname.replace(/\.html$/u, "") || "/";
  const current = (href) => {
    if (href === "/") return path === "/";
    if (href === "/portfolio") return path.startsWith("/portfolio");
    if (href === "/portfolio/camera") return path === "/portfolio/camera";
    if (href === "/photo") return path === "/photo";
    if (href === "/portfolio/post") return ["/portfolio/post", "/portfolio/editing"].includes(path);
    if (href === "/blog") return path === "/blog" || path.startsWith("/blog/");
    if (href === "/about") return path === "/about";
    return false;
  };
  const currentAttr = (href) => current(href) ? ' aria-current="page"' : "";

  document.body.classList.add("site-static");

  const header = document.querySelector("body > header");
  // PROMPT-32 §10: .v3-header (тот же общий компонент, что на V3-страницах —
  // src/public/V3App.tsx) сюда не попадает — className безусловно заменялся
  // на site-static-header, снимая класс v3-header в рантайме, из-за чего CSS
  // не мог отличить эту шапку от старой и накладывал светлый цвет на светлый
  // (PROMPT-32: контраст 1.27:1 на Y-бренде и CTA на 390px).
  if (header && !header.classList.contains("v3-header")) {
    header.className = "site-static-header";

    // На 11 страницах (7 услуг + 4 статьи блога) навигация теперь впекается
    // на сборке (vite.config.ts: bakeStaticShellNav), а не пишется здесь —
    // робот без JS должен её видеть. Если шапка уже не пустая — мы на одной
    // из них: только вешаем поведение, контент не трогаем. На остальных
    // статических страницах, до которых бэйк ещё не дошёл, остаётся старый
    // рантайм-фолбэк — ничего не ломаем там, где не просили.
    if (header.children.length === 0) header.innerHTML = `
      <div class="site-static-header__inner">
        <a class="site-static-brand" href="/" aria-label="Yelyginn — на главную">Y</a>
        <nav class="site-static-nav" aria-label="Основная навигация">
          <a href="/portfolio"${currentAttr("/portfolio")}>Работы</a>
          <a href="/portfolio/camera"${currentAttr("/portfolio/camera")}>Съёмка</a>
          <a href="/photo"${currentAttr("/photo")}>Фото</a>
          <a href="/portfolio/post"${currentAttr("/portfolio/post")}>Пост</a>
          <a href="/blog"${currentAttr("/blog")}>Блог</a>
          <a href="/about"${currentAttr("/about")}>Обо мне</a>
        </nav>
        <span class="site-static-status">CORE // READY</span>
        <a class="site-static-header__cta" href="/contact"><span class="site-static-header__cta-full">Обсудить проект</span><span class="site-static-header__cta-short">Обсудить</span></a>
        <button class="site-static-menu-button" type="button" aria-expanded="false" aria-controls="site-mobile-menu" aria-label="Открыть меню">
          <span></span><span></span>
        </button>
      </div>
      <div id="site-mobile-menu" class="site-static-mobile-menu" hidden>
        <nav aria-label="Мобильная навигация">
          <a href="/">Главная</a>
          <a href="/portfolio">Работы</a>
          <a href="/portfolio/camera">Съёмка</a>
          <a href="/photo">Фото</a>
          <a href="/portfolio/post">Пост</a>
          <a href="/blog">Блог</a>
          <a href="/about">Обо мне</a>
          <a href="/contact">Обсудить проект</a>
        </nav>
        <div><a href="https://t.me/YuriElygin">Telegram</a><a href="mailto:y.elyginn@gmail.com">Email</a></div>
      </div>
    `;

    const mobileMenu = document.getElementById("site-mobile-menu");
    if (mobileMenu instanceof HTMLElement && mobileMenu.parentElement !== document.body) {
      document.body.appendChild(mobileMenu);
    }
    const menuButton = header.querySelector(".site-static-menu-button");
    menuButton?.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      menuButton.setAttribute("aria-label", open ? "Открыть меню" : "Закрыть меню");
      if (mobileMenu instanceof HTMLElement) mobileMenu.hidden = open;
      document.body.classList.toggle("site-menu-open", !open);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      menuButton?.setAttribute("aria-expanded", "false");
      if (mobileMenu instanceof HTMLElement) mobileMenu.hidden = true;
      document.body.classList.remove("site-menu-open");
    });
  }

  const footer = document.querySelector("body > footer");
  if (footer && !footer.classList.contains("v3-footer")) {
    footer.className = "site-static-footer-shell";
    if (footer.children.length === 0) footer.innerHTML = `
      <div class="site-static-footer">
        <div class="site-static-footer__brand">
          <a class="site-static-footer__wordmark" href="/" aria-label="YELYGINN">
            <svg viewBox="0 -981 4713 1235" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true"><text x="0" y="0" textLength="4713" lengthAdjust="spacing">YELYGINN</text></svg>
          </a>
          <p>Операторская работа, монтаж, цвет и live production.</p>
        </div>
        <nav aria-label="Навигация в подвале">
          <a href="/portfolio">Работы</a><a href="/portfolio/camera">Съёмка</a><a href="/portfolio/post">Пост</a>
          <a href="/blog">Блог</a><a href="/about">Обо мне</a>
        </nav>
        <div class="site-static-footer__contacts">
          <a class="site-static-footer__contacts-primary" href="/contact">Все контакты ↗</a>
          <span>Елыгин Юрий Сергеевич</span>
          <span>Плательщик НПД, самозанятый · ИНН 526219298988</span>
        </div>
        <div class="site-static-footer__legal">
          <span>© ${new Date().getFullYear()} YELYGINN</span>
          <a href="/privacy-policy">Политика</a><a href="/personal-data-consent">Согласие</a>
          <a href="/cookie-policy">Cookies</a><a href="/terms">Условия</a>
          <button type="button" data-cookie-settings>Настройки cookie</button>
          <button type="button" data-motion-toggle aria-pressed="false">Отключить движение</button>
        </div>
      </div>
    `;
  }

  const footerControls = footer?.querySelector(".site-static-footer__legal, .v3-footer__meta nav");
  if (footerControls && !footerControls.querySelector("[data-motion-toggle]")) {
    footerControls.insertAdjacentHTML("beforeend", '<button type="button" data-motion-toggle aria-pressed="false">Отключить движение</button>');
  }

  const motionButtons = [...document.querySelectorAll("[data-motion-toggle]")];
  let motionStopped = false;
  let explicitMotion = null;
  try { explicitMotion = window.localStorage.getItem("yelyginn-motion"); } catch { /* use the system preference */ }
  const systemMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const applyMotion = () => {
    const reduced = explicitMotion === "on" ? false : explicitMotion === "off" || systemMotion.matches;
    motionStopped = reduced;
    document.documentElement.dataset.motionPreference = reduced ? "reduce" : "full";
    motionButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(motionStopped));
      button.textContent = motionStopped ? "Включить движение" : "Отключить движение";
    });
  };
  applyMotion();
  systemMotion.addEventListener("change", applyMotion);
  motionButtons.forEach((button) => button.addEventListener("click", () => {
    explicitMotion = motionStopped ? "on" : "off";
    try { window.localStorage.setItem("yelyginn-motion", explicitMotion); } catch { /* preference remains active until navigation */ }
    applyMotion();
  }));
})();
