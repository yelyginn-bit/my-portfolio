import { createElement, Fragment, useState, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LEGAL, LEGAL_PATHS } from "../../config/legal";
import { SITE } from "../../config/site";
import { CALCULATOR_LINK, CONTACT_LINK, FOOTER_GROUPS, PRIMARY_NAV } from "../../lib/navigation.data";
import { isNavEntryActive, NavDropdownMenu } from "./NavMenu";

type PolymorphicProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function PageContainer<T extends ElementType = "div">({
  as,
  className = "",
  children,
  ...props
}: PolymorphicProps<T>) {
  const Component: ElementType = as || "div";
  return createElement(Component, { className: `ds-container ${className}`.trim(), ...props }, children);
}

export function Section<T extends ElementType = "section">({
  as,
  className = "",
  children,
  ...props
}: PolymorphicProps<T>) {
  const Component: ElementType = as || "section";
  return createElement(Component, { className: `ds-section ${className}`.trim(), ...props }, children);
}

export function Grid({ className = "", children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`ds-grid ${className}`.trim()} {...props}>{children}</div>;
}

export function GridItem({ className = "", children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`ds-grid-item ${className}`.trim()} {...props}>{children}</div>;
}

export function ContentColumn({ className = "", children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`ds-content-column ${className}`.trim()} {...props}>{children}</div>;
}

export function MediaColumn({ className = "", children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`ds-media-column ${className}`.trim()} {...props}>{children}</div>;
}

export function Stack({ className = "", children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`ds-stack ${className}`.trim()} {...props}>{children}</div>;
}

export function Cluster({ className = "", children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`ds-cluster ${className}`.trim()} {...props}>{children}</div>;
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`ds-divider ${className}`.trim()} />;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`ds-eyebrow ${className}`.trim()}>{children}</p>;
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`ds-section-header ${className}`.trim()}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2>{title}</h2>
      {intro && <p>{intro}</p>}
    </header>
  );
}

export function MobileMenu({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div id="ds-mobile-menu" className="ds-mobile-menu">
      <a className="nav-mobile-calc-button" href={CALCULATOR_LINK.href} onClick={onClose}>{CALCULATOR_LINK.label}</a>
      <nav aria-label="Мобильная навигация">
        {PRIMARY_NAV.map((entry) => (
          <Fragment key={entry.label}>
            {entry.kind === "dropdown"
              ? <NavDropdownMenu entry={entry} path={path} mobile onNavigate={onClose} />
              : <a href={entry.href} onClick={onClose} aria-current={isNavEntryActive(entry, path) ? "page" : undefined}>{entry.label}</a>}
          </Fragment>
        ))}
        <a href={CONTACT_LINK.href} onClick={onClose}>{CONTACT_LINK.label}</a>
      </nav>
      <div><a href={SITE.telegramUrl}>Telegram</a><a href={`mailto:${SITE.email}`}>Email</a></div>
    </div>,
    document.body,
  );
}

export function SiteHeader({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="ds-header">
      <PageContainer className="ds-header-inner">
        <a className="ds-brand" href="/" aria-label="YELYGINN — на главную">Y</a>
        <nav className="ds-nav" aria-label="Основная навигация">
          {PRIMARY_NAV.map((entry) => (
            <Fragment key={entry.label}>
              {entry.kind === "dropdown"
                ? <NavDropdownMenu entry={entry} path={path} />
                : <a href={entry.href} aria-current={isNavEntryActive(entry, path) ? "page" : undefined}>{entry.label}</a>}
            </Fragment>
          ))}
        </nav>
        <a className="nav-calc-button" href={CALCULATOR_LINK.href}>{CALCULATOR_LINK.label}</a>
        <span className="ds-header-status">CORE // READY</span>
        <a className="ds-header-cta" href={CONTACT_LINK.href}><span className="ds-header-cta-full">{CONTACT_LINK.label}</span><span className="ds-header-cta-short">Обсудить</span></a>
        <button type="button" className="ds-menu-button" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open} aria-controls="ds-mobile-menu" onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button>
      </PageContainer>
      <MobileMenu open={open} onClose={() => setOpen(false)} path={path} />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="ds-footer">
      <PageContainer>
        <div className="ds-footer-grid">
          <div className="ds-footer-brand">
            <a href="/">{SITE.brand}</a>
            <p>Видео, фото и монтаж для бизнеса в Нижнем Новгороде и по России.</p>
          </div>
          <div className="v3-footer__groups">
            {FOOTER_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <strong>{group.title}</strong>
                {group.links.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
              </nav>
            ))}
          </div>
          <div className="ds-footer-contact">
            <a className="ds-footer-contact__primary" href={SITE.telegramUrl} target="_blank" rel="noreferrer">Telegram <ArrowUpRight size={15} /></a>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <span>{LEGAL.operator}</span>
            <span>{LEGAL.status} · ИНН {LEGAL.taxId}</span>
          </div>
        </div>
        <div className="ds-footer-legal">
          <span>© {new Date().getFullYear()} {SITE.brand}</span>
          <a href={LEGAL_PATHS.privacy}>Политика</a>
          <a href={LEGAL_PATHS.consent}>Согласие</a>
          <a href={LEGAL_PATHS.cookies}>Cookies</a>
          <a href={LEGAL_PATHS.terms}>Условия</a>
          <button type="button" data-cookie-settings>Настройки cookie</button>
        </div>
      </PageContainer>
    </footer>
  );
}
