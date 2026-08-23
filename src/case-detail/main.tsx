import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import CaseRouter from "./CaseRouter";
import "../design-system.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <CaseRouter />
  </StrictMode>
);

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
