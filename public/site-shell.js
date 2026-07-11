(() => {
  const privateRoute = /^\/(?:admin|account|gallery)(?:\/|$)/u.test(window.location.pathname);
  if (privateRoute) return;

  const primaryLinks = [
    { href: "/", label: "Главная", match: (path) => path === "/" },
    { href: "/portfolio", label: "Портфолио", match: (path) => path.startsWith("/portfolio") },
    {
      href: "/#services",
      label: "Услуги",
      match: (path) => ["/reels", "/reklamnye-roliki", "/event-video", "/video-dlya-marketpleysov", "/photo", "/content-day"].includes(path),
    },
    { href: "/ceny", label: "Цены", match: (path) => path === "/ceny" || path === "/prices" || path === "/calculator" },
    { href: "/#contact", label: "Контакты", match: () => false },
  ];

  const path = window.location.pathname.replace(/\.html$/u, "") || "/";
  const nav = document.querySelector("header nav");
  if (nav) {
    nav.setAttribute("aria-label", "Основная навигация");
    nav.innerHTML = primaryLinks
      .map(({ href, label, match }) => {
        const current = match(path) ? ' aria-current="page"' : "";
        return `<a href="${href}"${current}>${label}</a>`;
      })
      .join("");
  }

  const footer = document.querySelector("footer .foot");
  if (footer) {
    footer.classList.add("site-static-footer");
    footer.innerHTML = `
      <div class="site-static-footer__brand">
        <a href="/">YELYGINN</a>
        <p>Видео, Reels, монтаж и фото для бизнеса в Нижнем Новгороде.</p>
      </div>
      <nav class="site-static-footer__nav" aria-label="Навигация в подвале">
        <a href="/portfolio">Портфолио</a>
        <a href="/#services">Услуги</a>
        <a href="/ceny">Цены</a>
        <a href="/calculator">Калькулятор</a>
        <a href="/privacy-policy">Политика</a>
        <a href="/personal-data-consent">Согласие</a>
        <a href="/cookie-policy">Cookies</a>
        <a href="/terms">Условия</a>
        <button type="button" data-cookie-settings>Настройки cookie</button>
      </nav>
      <div class="site-static-footer__contacts">
        <a href="https://t.me/YuriElygin" target="_blank" rel="noreferrer">Telegram</a>
        <a href="mailto:y.elyginn@gmail.com">Email</a>
        <span>Елыгин Юрий Сергеевич · плательщик НПД, самозанятый · ИНН 526219298988</span>
      </div>
    `;
  }
})();
