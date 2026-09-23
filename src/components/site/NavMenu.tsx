// Общий выпадающий пункт шапки («Услуги», «Портфолио») — используется системой
// V3 (src/public/V3App.tsx) и системой Layout (src/prices/Prices.tsx,
// src/color/ColorGrading.tsx). Пункты берутся из src/lib/navigation.data.ts.
import { useState } from "react";
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
  const isActive = isNavEntryActive(entry, path);
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
      <button type="button" aria-expanded={open} data-active={isActive ? "true" : undefined} onClick={() => setOpen((value) => !value)} onBlur={(event) => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setOpen(false); }}>{entry.label}</button>
      <div className={`nav-dropdown-menu${open ? " is-open" : ""}`}>
        {entry.href && <a href={entry.href} onClick={() => setOpen(false)}>Всё портфолио</a>}
        {entry.items.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={item.href === path ? "page" : undefined}>{item.label}</a>)}
      </div>
    </div>
  );
}
