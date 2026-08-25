import { createElement, useState, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LEGAL, LEGAL_PATHS } from "../../config/legal";
import { SITE } from "../../config/site";

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

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div id="ds-mobile-menu" className="ds-mobile-menu">
      <nav aria-label="Мобильная навигация">
        <a href="/portfolio" onClick={onClose}>Работы</a><a href="/portfolio/camera" onClick={onClose}>Съёмка</a>
        <a href="/photo" onClick={onClose}>Фото</a>
        <a href="/portfolio/post" onClick={onClose}>Пост</a>
        <a href="/blog" onClick={onClose}>Блог</a><a href="/about" onClick={onClose}>Обо мне</a><a href="/contact" onClick={onClose}>Обсудить проект</a>
      </nav>
      <div><a href={SITE.telegramUrl}>Telegram</a><a href={`mailto:${SITE.email}`}>Email</a></div>
    </div>,
    document.body,
  );
}

export function SiteHeader({ active }: { active?: "work" | "camera" | "photo" | "post" | "cases" | "blog" | "about" }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="ds-header">
      <PageContainer className="ds-header-inner">
        <a className="ds-brand" href="/" aria-label="YELYGINN — на главную">Y</a>
        <nav className="ds-nav" aria-label="Основная навигация">
          <a href="/portfolio" aria-current={active === "work" ? "page" : undefined}>Работы</a>
          <a href="/portfolio/camera" aria-current={active === "camera" ? "page" : undefined}>Съёмка</a>
          <a href="/photo" aria-current={active === "photo" ? "page" : undefined}>Фото</a>
          <a href="/portfolio/post" aria-current={active === "post" ? "page" : undefined}>Пост</a>
          <a href="/blog" aria-current={active === "blog" ? "page" : undefined}>Блог</a>
          <a href="/about" aria-current={active === "about" ? "page" : undefined}>Обо мне</a>
        </nav>
        <span className="ds-header-status">CORE // READY</span>
        <a className="ds-header-cta" href="/contact">Обсудить проект</a>
        <button type="button" className="ds-menu-button" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open} aria-controls="ds-mobile-menu" onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button>
      </PageContainer>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
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
          <nav aria-label="Навигация в подвале">
            <a href="/portfolio">Работы</a>
            <a href="/#services">Услуги</a>
            <a href="/ceny">Цены</a>
            <a href="/calculator">Калькулятор</a>
            <a href="/#contact">Контакты</a>
          </nav>
          <div className="ds-footer-contact">
            <a href={SITE.telegramUrl} target="_blank" rel="noreferrer">Telegram <ArrowUpRight size={15} /></a>
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
