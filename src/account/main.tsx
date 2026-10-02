import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Account from "./Account";
import "../design-system.css";
import "../v3-polish.css";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Account />
  </StrictMode>,
);
