import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ColorGrading from "./ColorGrading";
import { initAnalytics } from "../lib/analytics";
import "../index.css";
import "../design-system.css";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorGrading />
  </StrictMode>,
);
