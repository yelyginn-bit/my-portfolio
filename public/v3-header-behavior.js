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
