import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Journal from "./Journal";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Journal />
  </StrictMode>,
);
