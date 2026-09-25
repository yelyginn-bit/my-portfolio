import { createElement, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

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

// MobileMenu/SiteHeader/SiteFooter убраны (PROMPT-33 §Б.2) — Prices.tsx и
// ColorGrading.tsx теперь берут SiteHeader/SiteFooter/RoutePathContext прямо
// из src/public/V3App.tsx (общий компонент шапки/подвала — тот же .v3-header/
// .v3-footer, что на главной, PROMPT-32 §10-11). Их собственная разметка
// (.ds-header/.ds-nav/.ds-footer) и CSS удалены как класс: ничего больше на
// неё не ссылается — README см. в PROMPT-33 §Б отчёте.
