// PROMPT-32 §10: поведение шапки .v3-header/.v3-nav (та же разметка и CSS,
// что у React SiteHeader — src/public/V3App.tsx) на страницах без React.
// Выпадающие пункты используют то же position:fixed, что и портал в React-
// версии (см. .nav-dropdown-menu в design-system.css) — здесь то же самое
// без портала: fixed и так не обрезается родителем, координаты те же
// getBoundingClientRect() + 8px отступ.
(() => {
  const nav = document.querySelector(".v3-nav");
  if (!nav) return;

  nav.querySelectorAll(".nav-dropdown").forEach((wrap) => {
    const button = wrap.querySelector("button");
    const menu = wrap.querySelector(".nav-dropdown-menu");
    if (!(button instanceof HTMLElement) || !(menu instanceof HTMLElement)) return;

    const place = () => {
      const rect = button.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.left = `${rect.left}px`;
    };
    const open = () => {
      place();
      menu.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      menu.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    };
    const isOpen = () => menu.classList.contains("is-open");

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      isOpen() ? close() : open();
    });
    wrap.addEventListener("mouseenter", open);
    wrap.addEventListener("mouseleave", close);
    window.addEventListener("resize", () => { if (isOpen()) place(); });
    window.addEventListener("scroll", () => { if (isOpen()) place(); }, true);
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Node)) return;
      if (!wrap.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  });

  const menuButton = nav.querySelector(".v3-nav__menu");
  const mobileMenu = document.getElementById("v3-mobile-menu");
  if (menuButton instanceof HTMLElement && mobileMenu instanceof HTMLElement) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Открыть меню" : "Закрыть меню");
      mobileMenu.hidden = isOpen;
      document.body.classList.toggle("v3-menu-open", !isOpen);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      menuButton.setAttribute("aria-expanded", "false");
      mobileMenu.hidden = true;
      document.body.classList.remove("v3-menu-open");
    });
  }
})();
