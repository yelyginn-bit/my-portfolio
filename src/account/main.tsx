import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Account from "./Account";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Account />
  </StrictMode>,
);
