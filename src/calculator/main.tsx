import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import Calculator from "./Calculator";
import { initAnalytics } from "../lib/analytics";

initAnalytics();

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <Calculator />
  </StrictMode>
);

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
