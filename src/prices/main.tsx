import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Prices from "./Prices";
import { initAnalytics } from "../lib/analytics";
import "../index.css";
import "../design-system.css";
import "../v3-polish.css";

// Корень раньше назывался price-root — vite.config.ts узнаёт React-страницы
// по буквальной подстроке `<div id="root"`, и price-root под неё не подходил.
// Из-за этого /ceny инжектило site-shell.js/site-skin.css как legacy-статику
// (см. коммит про подвал /ceny). initAnalytics() здесь раньше не было — на
// странице работала аналитика, инжектнутая тем самым script'ом; без него она
// бы молча отключилась, поэтому вызываем сами, как на /cvetokorrekciya.
initAnalytics();

createRoot(document.getElementById("root")!).render(<StrictMode><Prices /></StrictMode>);
