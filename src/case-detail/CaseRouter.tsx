import { PORTFOLIO_PROJECTS } from "../lib/portfolio.data";
import CasePage from "./CasePage";

/** Достаёт slug из `/cases/<slug>` и находит соответствующую запись реестра.
 * Как и `LegalApp`, принимает `pathname` явным пропом для пре-рендера и
 * падает обратно на `window.location.pathname` в браузере. */
export default function CaseRouter({ pathname }: { pathname?: string } = {}) {
  const browserPath = typeof window === "undefined" ? "" : window.location.pathname;
  const currentPath = pathname ?? browserPath;
  const slug = currentPath.replace(/^\/cases\//u, "").replace(/\/+$/u, "");
  const project = PORTFOLIO_PROJECTS.find((candidate) => candidate.id === slug);
  if (!project) return <p style={{ padding: "4rem", fontFamily: "sans-serif" }}>Кейс не найден.</p>;
  return <CasePage project={project} />;
}
