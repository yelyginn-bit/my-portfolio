import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Calculator from "./Calculator";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Calculator />
  </StrictMode>,
);
