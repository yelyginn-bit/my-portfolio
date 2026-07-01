import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Gallery from "./Gallery";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
