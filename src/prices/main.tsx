import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Prices from "./Prices";
import "../index.css";
import "../design-system.css";

createRoot(document.getElementById("price-root")!).render(<StrictMode><Prices /></StrictMode>);
