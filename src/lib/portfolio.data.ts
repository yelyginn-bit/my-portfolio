/**
 * Реестр портфолио — типизированный источник, из которого позже собираются
 * страницы услуг, кейсы (`/cases/<slug>`), sitemap и микроразметка VideoObject,
 * вместо того чтобы переписывать один и тот же проект руками в нескольких местах.
 *
 * Источник данных: `YELYGINN-registry-proektov.md` (транскрибация архива и
 * панели Kinescope). Заполнено намеренно НЕ целиком — только 3 примера
 * (KORONA, HOFF, «Учёные Нижнего»), чтобы зафиксировать форму данных;
 * остальные проекты реестра вносятся отдельными заходами.
 */

/** Соотношение сторон видео на Kinescope. */
export type VideoOrientation = "16:9" | "9:16";

/** Один ролик проекта. `kinescopeId` — это ID из просмотровой ссылки
 * `kinescope.io/<ID>`; он же используется для embed (`kinescope.io/embed/<ID>`). */
export interface PortfolioVideo {
  kinescopeId: string;
  orientation: VideoOrientation;
  /** Короткая подпись ролика — то, что было на скриншоте Kinescope-панели. */
  label: string;
}

/** Фотография проекта. `id` — детерминированное имя файла в обработанной
 * статике (пайплайн фотографий из отдельного захода, сейчас каталог пуст). */
export interface PortfolioPhoto {
  id: string;
  alt: string;
}

/** Пара «до / после» для материала цветокоррекции — тот же формат данных,
 * что уже использует `src/lib/colorCompare.data.ts` и компонент `ColorCompare`. */
export interface ColorGradePair {
  id: string;
  label: string;
  rawPhotoId: string;
  colorPhotoId: string;
}

export interface PortfolioProject {
  /** Слаг будущего маршрута `/cases/<id>`. */
  id: string;
  title: string;
  client: string;
  /** Услуга/категория — соответствует разделам реестра (не карточка портфолио V3). */
  category: string;
  role: string;
  technique: string[];
  videos: PortfolioVideo[];
  photos: PortfolioPhoto[];
  colorPairs: ColorGradePair[];
}

export const PORTFOLIO_PROJECTS: readonly PortfolioProject[] = [
  {
    id: "korona-proizvodstvo",
    title: "KORONA — производство",
    client: "KORONA",
    category: "Промышленная видеосъёмка",
    role: "Монтаж, инфографика, цвет, звук — производственный отчётный ролик.",
    technique: ["Sony FX3", "G-Master 16-35 2.8", "G-Master 24-70 2.8", "G-Master 70-200 2.8", "DJI Inspire 3 (дрон)"],
    videos: [
      { kinescopeId: "hyQindossxyWZfRxLuDacu", orientation: "16:9", label: "KORONA_MASTER" },
    ],
    photos: [],
    colorPairs: [
      { id: "korona-01", label: "Ракурс 1", rawPhotoId: "korona-01-raw", colorPhotoId: "korona-01-color" },
      { id: "korona-02", label: "Ракурс 2", rawPhotoId: "korona-02-raw", colorPhotoId: "korona-02-color" },
      { id: "korona-03", label: "Ракурс 3", rawPhotoId: "korona-03-raw", colorPhotoId: "korona-03-color" },
      { id: "korona-04", label: "Ракурс 4", rawPhotoId: "korona-04-raw", colorPhotoId: "korona-04-color" },
    ],
  },
  {
    id: "hoff-divany",
    title: "HOFF — карточки диванов",
    client: "HOFF",
    category: "Реклама и карточки товара",
    role: "Монтаж, титры с названием механизма, цветокоррекция, клинап, подбор музыки от заказчика.",
    technique: ["Fujifilm X-T4", "нативная оптика Fujifilm"],
    videos: [
      { kinescopeId: "oesfViYTJW9KWuKo4rpFxq", orientation: "16:9", label: "Франция" },
      { kinescopeId: "qwQZmNCDyfSvvDmwHNh8ak", orientation: "16:9", label: "Пума" },
      { kinescopeId: "sNd7TyyMts3TTKMvAcmFde", orientation: "16:9", label: "Пантограф" },
      { kinescopeId: "gjKQDqJzGJzknyAiBQJdSQ", orientation: "16:9", label: "Кушетка" },
      { kinescopeId: "hYrQ1PhbkuLK7P6CSRgVcQ", orientation: "16:9", label: "Книжка" },
      { kinescopeId: "8b3CYfrZtypdJtb6EragDy", orientation: "16:9", label: "Кликкляк" },
      { kinescopeId: "gK1CeYEygyc83eRNdueXB5", orientation: "16:9", label: "Еврокнижка" },
      { kinescopeId: "ib4dtVDCUY1TUUg4ubm6Z2", orientation: "16:9", label: "Дельфин" },
      { kinescopeId: "7Q6bkty8E1Bv62JXJ9Pvog", orientation: "16:9", label: "Выкатной" },
      { kinescopeId: "g7DBRUGGfASR1yy1FQs6PT", orientation: "16:9", label: "Аккордеон" },
    ],
    photos: [],
    colorPairs: [
      { id: "hoff-01", label: "Ракурс 1", rawPhotoId: "hoff-01-raw", colorPhotoId: "hoff-01-color" },
      { id: "hoff-02", label: "Ракурс 2", rawPhotoId: "hoff-02-raw", colorPhotoId: "hoff-02-color" },
      { id: "hoff-03", label: "Ракурс 3", rawPhotoId: "hoff-03-raw", colorPhotoId: "hoff-03-color" },
      { id: "hoff-04", label: "Ракурс 4", rawPhotoId: "hoff-04-raw", colorPhotoId: "hoff-04-color" },
      { id: "hoff-05", label: "Ракурс 5", rawPhotoId: "hoff-05-raw", colorPhotoId: "hoff-05-color" },
    ],
  },
  {
    id: "uchenye-nizhnego",
    title: "Учёные Нижнего",
    client: "Дом учёных, Нижний Новгород",
    category: "Интервью и подкасты",
    role: "Постановка света и камер, монтаж первых итераций, транскрибация, цвет, шумоподавление, разработка концепции серии целиком.",
    technique: ["2× Sony A7 Mark V", "G-Master 24-70 2.8", "G-Master 70-200 2.8", "Aputure 300C (Chimera Ball)", "2× Amaran", "лайт-панель"],
    videos: [
      { kinescopeId: "wncaRrmahS5bTRUgmXVoXi", orientation: "16:9", label: "Павел Субочев" },
      { kinescopeId: "tUjFh6nxvKhE3ZwSrD2F6W", orientation: "16:9", label: "Екатерина Солнцева" },
      { kinescopeId: "hjNTmjbczLrKeeLcKT3Vtw", orientation: "16:9", label: "Александр Нючев" },
    ],
    // Скриншот нодового дерева Resolve и чистый стилл — разные картинки, а не
    // два грейда одного кадра, поэтому это photos, а не ColorGradePair.
    photos: [
      { id: "uchenye-nizhnego-setup-01", alt: "Постановка света и камер на съёмке «Учёные Нижнего»" },
      { id: "uchenye-cam1-node-01", alt: "Нодовое дерево цветокоррекции, камера 1, ракурс 1" },
      { id: "uchenye-cam1-still-01", alt: "Кадр после цветокоррекции, камера 1, ракурс 1" },
      { id: "uchenye-cam1-node-02", alt: "Нодовое дерево цветокоррекции, камера 1, ракурс 2" },
      { id: "uchenye-cam1-still-02", alt: "Кадр после цветокоррекции, камера 1, ракурс 2" },
      { id: "uchenye-cam2-node-01", alt: "Нодовое дерево цветокоррекции, камера 2, ракурс 1" },
      { id: "uchenye-cam2-still-01", alt: "Кадр после цветокоррекции, камера 2, ракурс 1" },
      { id: "uchenye-cam2-node-02", alt: "Нодовое дерево цветокоррекции, камера 2, ракурс 2" },
      { id: "uchenye-cam2-still-02", alt: "Кадр после цветокоррекции, камера 2, ракурс 2" },
    ],
    colorPairs: [],
  },
];
