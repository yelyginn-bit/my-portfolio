// Общие выпадающие «Услуги»/«Портфолио» с порталом, поддержкой мыши и клавиатуры.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PrimaryNavEntry, NavDropdown } from "../../lib/navigation.data";

export function isNavEntryActive(entry: PrimaryNavEntry, path: string): boolean {
  const normalized = path === "/portfolio/editing" ? "/portfolio/post" : path;
  if (entry.kind === "link") return entry.href === normalized;
  if (entry.href && normalized.startsWith(entry.href)) return true;
  return entry.items.some((item) => item.href === normalized);
}

export function NavDropdownMenu({ entry, path, mobile, onNavigate }: { entry: NavDropdown; path: string; mobile?: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuKey = useRef(entry.label);
  const isActive = isNavEntryActive(entry, path);
  const cancelClose = () => { clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 350); };
  const close = () => { cancelClose(); setOpen(false); };
  const openNow = () => {
    cancelClose();
    document.dispatchEvent(new CustomEvent("yelyginn:open-nav-dropdown", { detail: menuKey.current }));
    setOpen(true);
  };
  const contains = (target: EventTarget | null) => target instanceof Node && (buttonRef.current?.contains(target) || menuRef.current?.contains(target));

  useEffect(() => {
    const closeSibling = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== menuKey.current) close();
    };
    document.addEventListener("yelyginn:open-nav-dropdown", closeSibling);
    return () => document.removeEventListener("yelyginn:open-nav-dropdown", closeSibling);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)) });
    };
    const outside = (event: PointerEvent) => { if (!contains(event.target)) close(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); buttonRef.current?.focus(); }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(() => () => cancelClose(), []);

  if (mobile) return <details className="nav-dropdown-mobile-group">
    <summary aria-current={isActive ? "page" : undefined}>{entry.label}</summary>
    {entry.href && <a href={entry.href} onClick={onNavigate}>Все — {entry.label.toLowerCase()}</a>}
    {entry.items.map((item) => <a key={item.href} href={item.href} onClick={onNavigate} aria-current={item.href === path ? "page" : undefined}>{item.label}</a>)}
  </details>;

  return <div className="nav-dropdown">
    <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={`nav-${entry.label}`} data-active={isActive ? "true" : undefined}
      onClick={() => open ? close() : openNow()} onMouseEnter={openNow} onMouseLeave={scheduleClose}
      onBlur={(event) => { if (!contains(event.relatedTarget)) close(); }}
      onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); openNow(); setTimeout(() => menuRef.current?.querySelector("a")?.focus(), 0); } }}>
      {entry.label}
    </button>
    {open && typeof document !== "undefined" && createPortal(
      <div ref={menuRef} id={`nav-${entry.label}`} className="nav-dropdown-menu is-open" style={{ top: coords.top, left: coords.left }}
        onMouseEnter={cancelClose} onMouseLeave={scheduleClose} onFocus={cancelClose}
        onBlur={(event) => { if (!contains(event.relatedTarget)) close(); }}
        onKeyDown={(event) => {
          const links = [...(menuRef.current?.querySelectorAll("a") ?? [])];
          const index = links.indexOf(document.activeElement as HTMLAnchorElement);
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
            links[next]?.focus();
          }
        }}>
        {entry.href && <a href={entry.href} onClick={close}>Всё портфолио</a>}
        {entry.items.map((item) => <a key={item.href} href={item.href} onClick={close} aria-current={item.href === path ? "page" : undefined}>{item.label}</a>)}
      </div>, document.body)}
  </div>;
}
