export const MARQUEE_ITEMS = [
  "СБЕРУНИВЕРСИТЕТ",
  "СИБУР",
  "БАРЬЕР",
  "CAPRIGO",
  "HOFF",
  "YANGO",
  "CARTIER",
  "BAYER",
  "TERAFLEX",
  "KORONA",
  "СТАЛЬМАСТЕР",
  "БЕРЁЗКА",
  "СТАНЦИЯ МЕТРО ГОРЬКОВСКАЯ",
] as const;

export type ProjectStill = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
};

const productionStill = (name: string): ProjectStill => ({
  src: `/v3-assets/production/${name}.webp`,
  srcSet: `/v3-assets/production/${name}-sm.webp 800w, /v3-assets/production/${name}.webp 1600w`,
  width: 1600,
  height: 900,
});

export const PROJECT_STILLS: Readonly<Record<string, readonly ProjectStill[]>> = {
  "metro-concerts": [productionStill("grk-feature"), productionStill("grk-performance"), productionStill("grk-crowd")],
  "sibur-women": [productionStill("sibur-color"), productionStill("sibur-bts"), productionStill("sibur-portrait")],
  "sber-architecture": [productionStill("sber-architecture"), productionStill("sber-interview")],
  "caprigo-education": [productionStill("caprigo-presenter"), productionStill("caprigo-product")],
  "caprigo-products": [productionStill("caprigo-product"), productionStill("caprigo-presenter")],
  "hoff-products": [productionStill("hoff-product")],
  "korona-factory": [productionStill("korona-factory")],
};

export const SIBUR_GRADING_STAGES = [
  { id: "source", label: "ИСХОДНИК", image: productionStill("sibur-raw") },
  { id: "final", label: "ФИНАЛ", image: productionStill("sibur-color") },
] as const;

const resolveTimestamps = [
  "21:46:06", "21:46:12", "21:46:15", "21:46:19", "21:46:23", "21:46:27",
  "21:46:31", "21:46:34", "21:47:29", "21:47:32", "21:47:36", "21:47:42",
  "21:47:44", "21:47:48", "21:47:51", "21:47:55", "21:47:57",
] as const;

export const RESOLVE_STAGES = resolveTimestamps.map((timestamp, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `stage-${number}`,
    label: `ЭТАП ${number}`,
    timestamp,
    clean: `/v3-assets/resolve-stages/stage-${number}-clean.webp`,
    resolve: `/v3-assets/resolve-stages/stage-${number}-resolve.webp`,
    thumbnail: `/v3-assets/resolve-stages/stage-${number}-thumb.webp`,
  };
});

export const BLOG_ENTRIES = [
  {
    href: "/blog/skolko-stoit-snyat-reklamnyy-rolik",
    tag: "ПРОДАКШН",
    title: "Сколько стоит рекламный ролик в Нижнем Новгороде",
    description: "Из чего складывается смета: подготовка, съёмка, команда и постпродакшн.",
  },
  {
    href: "/blog/kak-snimat-reels-dlya-biznesa",
    tag: "КОРОТКИЙ ФОРМАТ",
    title: "Как подготовить Reels для бизнеса",
    description: "Формат, структура и материалы, которые стоит собрать до съёмки.",
  },
  {
    href: "/blog/video-dlya-kartochek-wildberries",
    tag: "ПРОДУКТ",
    title: "Видео для карточек товара",
    description: "Как показать функцию, масштаб и сценарий использования продукта.",
  },
  {
    href: "/blog/videosemka-meropriyatiy-nn",
    tag: "СОБЫТИЯ",
    title: "Подготовка к видеосъёмке мероприятия",
    description: "Что согласовать с оператором заранее: тайминг, площадку, звук и результат.",
  },
] as const;
