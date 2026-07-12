(() => {
  const privateRoute = /^\/(?:admin|account|gallery|g)(?:\/|$)/u.test(window.location.pathname);
  if (privateRoute) return;

  const path = window.location.pathname.replace(/\.html$/u, "") || "/";
  const servicePaths = ["/reels", "/reklamnye-roliki", "/event-video", "/video-dlya-marketpleysov", "/photo", "/content-day"];
  const current = (href) => {
    if (href === "/") return path === "/";
    if (href === "/portfolio") return path.startsWith("/portfolio");
    if (href === "/ceny") return ["/ceny", "/prices", "/calculator"].includes(path);
    return false;
  };
  const currentAttr = (href) => current(href) ? ' aria-current="page"' : "";

  document.body.classList.add("site-static");

  const header = document.querySelector("body > header");
  if (header) {
    header.className = "site-static-header";
    header.innerHTML = `
      <div class="site-static-header__inner">
        <a class="site-static-brand" href="/" aria-label="Yelyginn — на главную">YELYGINN</a>
        <nav class="site-static-nav" aria-label="Основная навигация">
          <a href="/portfolio"${currentAttr("/portfolio")}>Работы</a>
          <div class="site-static-services">
            <button type="button" aria-expanded="false" aria-controls="site-service-menu"${servicePaths.includes(path) ? ' data-active="true"' : ""}>Услуги</button>
            <div id="site-service-menu" class="site-static-services__menu">
              <a href="/reklamnye-roliki">Рекламные ролики</a>
              <a href="/reels">Reels</a>
              <a href="/event-video">Event-видео</a>
              <a href="/video-dlya-marketpleysov">Маркетплейсы</a>
              <a href="/photo">Фото</a>
              <a href="/content-day">Контент-день</a>
            </div>
          </div>
          <a href="/ceny"${currentAttr("/ceny")}>Цены</a>
          <a href="/#process">Процесс</a>
          <a href="/#contact">Контакты</a>
        </nav>
        <a class="site-static-header__cta" href="/#contact">Обсудить проект</a>
        <button class="site-static-menu-button" type="button" aria-expanded="false" aria-controls="site-mobile-menu" aria-label="Открыть меню">
          <span></span><span></span>
        </button>
      </div>
      <div id="site-mobile-menu" class="site-static-mobile-menu" hidden>
        <nav aria-label="Мобильная навигация">
          <a href="/">Главная</a>
          <a href="/portfolio">Работы</a>
          <a href="/reklamnye-roliki">Рекламные ролики</a>
          <a href="/reels">Reels</a>
          <a href="/event-video">Event-видео</a>
          <a href="/video-dlya-marketpleysov">Маркетплейсы</a>
          <a href="/photo">Фото</a>
          <a href="/content-day">Контент-день</a>
          <a href="/ceny">Цены</a>
          <a href="/calculator">Калькулятор</a>
          <a href="/#contact">Контакты</a>
        </nav>
        <div><a href="https://t.me/YuriElygin">Telegram</a><a href="mailto:y.elyginn@gmail.com">Email</a></div>
      </div>
    `;

    const servicesButton = header.querySelector(".site-static-services > button");
    const servicesMenu = header.querySelector(".site-static-services__menu");
    servicesButton?.addEventListener("click", () => {
      const open = servicesButton.getAttribute("aria-expanded") === "true";
      servicesButton.setAttribute("aria-expanded", String(!open));
      servicesMenu?.classList.toggle("is-open", !open);
    });

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
      servicesButton?.setAttribute("aria-expanded", "false");
      servicesMenu?.classList.remove("is-open");
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
          <p>Видео, фото и монтаж для бизнеса в Нижнем Новгороде и по России.</p>
        </div>
        <nav aria-label="Навигация в подвале">
          <a href="/portfolio">Работы</a><a href="/#services">Услуги</a><a href="/ceny">Цены</a>
          <a href="/calculator">Калькулятор</a><a href="/#contact">Контакты</a>
        </nav>
        <div class="site-static-footer__contacts">
          <a href="https://t.me/YuriElygin" target="_blank" rel="noreferrer">Telegram ↗</a>
          <a href="mailto:y.elyginn@gmail.com">y.elyginn@gmail.com</a>
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
