import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import KinescopeEmbed from "../components/media/KinescopeEmbed";

const root = document.getElementById("metro-player");
if (!root) throw new Error("/sajty: missing prerendered Metro player root");

hydrateRoot(root, createElement(KinescopeEmbed, {
  id: "rTz2wthYwLPnnMbHzM2SjS",
  orientation: "16:9",
  title: "Видео для сети «Метро» — 10 коктейльных рецептов",
}));
