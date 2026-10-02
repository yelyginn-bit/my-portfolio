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

    document.body.appendChild(menu);
    let closeTimer;
    const cancelClose = () => clearTimeout(closeTimer);
    const scheduleClose = () => { cancelClose(); closeTimer = setTimeout(close, 350); };
    const place = () => {
      const rect = button.getBoundingClientRect();
      menu.style.top = `${rect.bottom}px`;
      menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 248))}px`;
    };
    const open = () => {
      cancelClose();
      place();
      menu.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      cancelClose();
      menu.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    };
    const isOpen = () => menu.classList.contains("is-open");

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      isOpen() ? close() : open();
    });
    wrap.addEventListener("mouseenter", open);
    wrap.addEventListener("mouseleave", scheduleClose);
    menu.addEventListener("mouseenter", cancelClose);
    menu.addEventListener("mouseleave", scheduleClose);
    const blur = (event) => { if (!wrap.contains(event.relatedTarget) && !menu.contains(event.relatedTarget)) close(); };
    button.addEventListener("blur", blur);
    menu.addEventListener("focusout", blur);
    menu.addEventListener("focusin", cancelClose);
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); open(); menu.querySelector("a")?.focus(); }
    });
    menu.addEventListener("keydown", (event) => {
      const links = [...menu.querySelectorAll("a")];
      const index = links.indexOf(document.activeElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links[next]?.focus();
      }
    });
    window.addEventListener("resize", () => { if (isOpen()) place(); });
    window.addEventListener("scroll", () => { if (isOpen()) place(); }, true);
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Node)) return;
      if (!wrap.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) { close(); button.focus(); }
    });
  });

  const menuButton = nav.querySelector(".v3-nav__menu");
  const mobileMenu = document.getElementById("v3-mobile-menu");
  if (menuButton instanceof HTMLElement && mobileMenu instanceof HTMLElement) {
    let background = [];
    const isOpen = () => menuButton.getAttribute("aria-expanded") === "true";
    const close = (restoreFocus = true) => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Открыть меню");
      mobileMenu.hidden = true;
      document.body.classList.remove("v3-menu-open");
      background.forEach(({ el, inert }) => { el.inert = inert; });
      background = [];
      if (restoreFocus) menuButton.focus();
    };
    const place = () => {
      if (!menuButton.getClientRects().length) { close(false); return; }
      mobileMenu.style.setProperty("--mobile-menu-top", `${menuButton.getBoundingClientRect().bottom + 16}px`);
    };
    menuButton.addEventListener("click", () => {
      if (isOpen()) { close(); return; }
      menuButton.setAttribute("aria-expanded", "true");
      menuButton.setAttribute("aria-label", "Закрыть меню");
      mobileMenu.hidden = false;
      document.body.classList.add("v3-menu-open");
      background = [...document.querySelectorAll("main, footer")].map((el) => ({ el, inert: el.inert }));
      background.forEach(({ el }) => { el.inert = true; });
      place();
      mobileMenu.querySelector("a[href]")?.focus({ preventScroll: true });
    });
    mobileMenu.addEventListener("click", (event) => { if (event.target.closest("a[href]")) close(false); });
    document.addEventListener("pointerdown", (event) => {
      if (isOpen() && !menuButton.contains(event.target) && !mobileMenu.contains(event.target)) close();
    });
    window.addEventListener("resize", () => { if (isOpen()) place(); });
    document.addEventListener("keydown", (event) => {
      if (!isOpen()) return;
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const items = [menuButton, ...mobileMenu.querySelectorAll("a[href], summary, button")].filter((el) => el.getClientRects().length);
        const index = items.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && (index === items.length - 1 || index < 0)) { event.preventDefault(); items[0]?.focus(); }
      }
    });
  }
})();
