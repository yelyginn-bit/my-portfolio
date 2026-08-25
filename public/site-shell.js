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
  if (header) {
    header.className = "site-static-header";
    header.innerHTML = `
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
        <a class="site-static-header__cta" href="/contact">Обсудить проект</a>
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
        <div><a href="/contact">Все контакты</a></div>
      </div>
    `;

    const menuButton = header.querySelector(".site-static-menu-button");
    const mobileMenu = header.querySelector(".site-static-mobile-menu");
    if (mobileMenu) document.body.appendChild(mobileMenu);
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
  if (footer) {
    footer.className = "site-static-footer-shell";
    footer.innerHTML = `
      <div class="site-static-footer">
        <div class="site-static-footer__brand">
          <a href="/">YELYGINN</a>
          <p>Операторская работа, монтаж, цвет и live production.</p>
        </div>
        <nav aria-label="Навигация в подвале">
          <a href="/portfolio">Работы</a><a href="/portfolio/camera">Съёмка</a><a href="/portfolio/post">Пост</a>
          <a href="/blog">Блог</a><a href="/about">Обо мне</a>
        </nav>
        <div class="site-static-footer__contacts">
          <a href="/contact">Все контакты ↗</a>
          <span>Елыгин Юрий Сергеевич</span>
          <span>Плательщик НПД, самозанятый · ИНН 526219298988</span>
        </div>
        <div class="site-static-footer__legal">
          <span>© ${new Date().getFullYear()} YELYGINN</span>
          <a href="/privacy-policy">Политика</a><a href="/personal-data-consent">Согласие</a>
          <a href="/cookie-policy">Cookies</a><a href="/terms">Условия</a>
          <button type="button" data-cookie-settings>Настройки cookie</button>
        </div>
      </div>
    `;
  }
})();
