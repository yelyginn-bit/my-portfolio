import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Admin from "./Admin";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
);
