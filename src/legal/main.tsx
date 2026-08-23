import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import LegalApp from "./LegalApp";
import "./legal.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <LegalApp />
  </StrictMode>
);

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
