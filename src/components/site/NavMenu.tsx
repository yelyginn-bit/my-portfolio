// Общий выпадающий пункт шапки («Услуги», «Портфолио») — используется системой
// V3 (src/public/V3App.tsx) и системой Layout (src/prices/Prices.tsx,
// src/color/ColorGrading.tsx). Пункты берутся из src/lib/navigation.data.ts.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PrimaryNavEntry, NavDropdown } from "../../lib/navigation.data";

/** Пункт активен, если путь совпадает с его href, с href его выпадающего
 * списка, или (для «Портфолио») с любым вложенным маршрутом /portfolio/*. */
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
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const isActive = isNavEntryActive(entry, path);

  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 150); };
  const openNow = () => { cancelClose(); setOpen(true); };

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  if (mobile) {
    return (
      <details className="nav-dropdown-mobile-group">
        <summary aria-current={isActive ? "page" : undefined}>{entry.label}</summary>
        {entry.href && <a href={entry.href} onClick={onNavigate}>Все — {entry.label.toLowerCase()}</a>}
        {entry.items.map((item) => <a key={item.href} href={item.href} onClick={onNavigate} aria-current={item.href === path ? "page" : undefined}>{item.label}</a>)}
      </details>
    );
  }
  return (
    <div className="nav-dropdown">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        data-active={isActive ? "true" : undefined}
        onClick={() => (open ? setOpen(false) : openNow())}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        onBlur={(event) => { if (!event.relatedTarget || !(event.relatedTarget as HTMLElement).closest?.(".nav-dropdown-menu")) setOpen(false); }}
      >
        {entry.label}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="nav-dropdown-menu is-open" style={{ top: coords.top, left: coords.left }} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
          {entry.href && <a href={entry.href} onClick={() => setOpen(false)}>Всё портфолио</a>}
          {entry.items.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={item.href === path ? "page" : undefined}>{item.label}</a>)}
        </div>,
        document.body,
      )}
    </div>
  );
}
