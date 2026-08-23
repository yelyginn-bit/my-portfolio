import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import ColorGrading from "./ColorGrading";
import { initAnalytics } from "../lib/analytics";
import "../index.css";
import "../design-system.css";

initAnalytics();

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <ColorGrading />
  </StrictMode>
);

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
