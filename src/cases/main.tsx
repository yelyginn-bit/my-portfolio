import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Cases from "./Cases";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Cases />
  </StrictMode>,
);
