/**
 * Явная карта «исходный файл архива → id в реестре».
 *
 * Намеренно НЕ автогенерация из имён файлов: в архиве кириллица и пробелы,
 * они не годятся как id, и порядок файлов в папке — это решение человека
 * (какой кадр за каким идёт), а не то, что можно вывести из имени файла.
 * Пути ниже — относительно корня архива (параметр --source пайплайна).
 *
 * Согласовано 24.08.2026: KORONA (4 пары) и HOFF (5 пар) — настоящие пары
 * ColorGradePair (тот же кадр до/после цвета). «Учёные Нижнего» — НЕ пары:
 * скриншот нодового дерева Resolve и отдельный чистый стилл — две разные
 * картинки, а не два грейда одного кадра, поэтому идут как обычные фото
 * (id вида uchenye-cam1-node-01 / uchenye-cam1-still-01), без ColorGradePair.
 */

export interface ColorPairSource {
  rawId: string;
  rawSource: string;
  colorId: string;
  colorSource: string;
}

export interface SinglePhotoSource {
  id: string;
  source: string;
}

/**
 * Скриншоты Resolve в "камера_1"/"камера_2" macOS называет с неразрывными
 * пробелами (U+00A0) вокруг тире и перед временем — их не набрать вручную
 * надёжно как обычную строку. Резолвятся во время запуска пайплайна по
 * ASCII-безопасной части имени (время съёмки экрана) и наличию "(2)".
 */
export interface CameraScreenshotSource {
  id: string;
  dir: string;
  /** Часть имени файла без спецсимволов, например "21.46.06". */
  timestamp: string;
  /** "node" — скриншот с интерфейсом Resolve (без "(2)" в имени), "still" — чистый кадр (с "(2)"). */
  variant: "node" | "still";
}

const KORONA_DIR = "отобранные кадры/Korona";
const HOFF_DIR = "отобранные кадры/Hoff";
const UCHENYE_CAM1_DIR = "отобранные кадры/Цветокоррекция_Ученые нижнего_ноды+стилл/камера_1";
const UCHENYE_CAM2_DIR = "отобранные кадры/Цветокоррекция_Ученые нижнего_ноды+стилл/камера_2";
const PORTFOLIO_DIR = "фото_портфолио";

export const COLOR_PAIRS: readonly ColorPairSource[] = [
  { rawId: "korona-01-raw", rawSource: `${KORONA_DIR}/raw/Still 2026-08-07 201039_1.31.1.png`, colorId: "korona-01-color", colorSource: `${KORONA_DIR}/color/Still 2026-08-07 200944_1.31.1.png` },
  { rawId: "korona-02-raw", rawSource: `${KORONA_DIR}/raw/Still 2026-08-07 201039_1.32.1.png`, colorId: "korona-02-color", colorSource: `${KORONA_DIR}/color/Still 2026-08-07 200944_1.32.1.png` },
  { rawId: "korona-03-raw", rawSource: `${KORONA_DIR}/raw/Still 2026-08-07 201039_1.33.1.png`, colorId: "korona-03-color", colorSource: `${KORONA_DIR}/color/Still 2026-08-07 200944_1.33.1.png` },
  { rawId: "korona-04-raw", rawSource: `${KORONA_DIR}/raw/Still 2026-08-07 201039_1.34.1.png`, colorId: "korona-04-color", colorSource: `${KORONA_DIR}/color/Still 2026-08-07 200944_1.34.1.png` },
  { rawId: "hoff-01-raw", rawSource: `${HOFF_DIR}/raw/Still 2026-08-07 201039_1.1.1.png`, colorId: "hoff-01-color", colorSource: `${HOFF_DIR}/color/Still 2026-08-07 200944_1.1.1.png` },
  { rawId: "hoff-02-raw", rawSource: `${HOFF_DIR}/raw/Still 2026-08-07 201039_1.2.1.png`, colorId: "hoff-02-color", colorSource: `${HOFF_DIR}/color/Still 2026-08-07 200944_1.2.1.png` },
  { rawId: "hoff-03-raw", rawSource: `${HOFF_DIR}/raw/Still 2026-08-07 201039_1.61.1.png`, colorId: "hoff-03-color", colorSource: `${HOFF_DIR}/color/Still 2026-08-07 200944_1.61.1.png` },
  { rawId: "hoff-04-raw", rawSource: `${HOFF_DIR}/raw/Still 2026-08-07 201039_1.62.1.png`, colorId: "hoff-04-color", colorSource: `${HOFF_DIR}/color/Still 2026-08-07 200944_1.62.1.png` },
  { rawId: "hoff-05-raw", rawSource: `${HOFF_DIR}/raw/Still 2026-08-07 201039_1.63.1.png`, colorId: "hoff-05-color", colorSource: `${HOFF_DIR}/color/Still 2026-08-07 200944_1.63.1.png` },
];

/** Пары "имя без суффикса" → id для последовательных серий (Стрит, Антон, ...). */
function sequential(dir: string, idPrefix: string, filenames: readonly string[]): SinglePhotoSource[] {
  return filenames.map((filename, index) => ({
    id: `${idPrefix}-${String(index + 1).padStart(2, "0")}`,
    source: `${dir}/${filename}`,
  }));
}

export const CAMERA_SCREENSHOTS: readonly CameraScreenshotSource[] = [
  { id: "uchenye-cam1-node-01", dir: UCHENYE_CAM1_DIR, timestamp: "21.46.06", variant: "node" },
  { id: "uchenye-cam1-still-01", dir: UCHENYE_CAM1_DIR, timestamp: "21.46.06", variant: "still" },
  { id: "uchenye-cam1-node-02", dir: UCHENYE_CAM1_DIR, timestamp: "21.46.12", variant: "node" },
  { id: "uchenye-cam1-still-02", dir: UCHENYE_CAM1_DIR, timestamp: "21.46.12", variant: "still" },
  { id: "uchenye-cam2-node-01", dir: UCHENYE_CAM2_DIR, timestamp: "21.47.29", variant: "node" },
  { id: "uchenye-cam2-still-01", dir: UCHENYE_CAM2_DIR, timestamp: "21.47.29", variant: "still" },
  { id: "uchenye-cam2-node-02", dir: UCHENYE_CAM2_DIR, timestamp: "21.47.32", variant: "node" },
  { id: "uchenye-cam2-still-02", dir: UCHENYE_CAM2_DIR, timestamp: "21.47.32", variant: "still" },
];

export const SINGLE_PHOTOS: readonly SinglePhotoSource[] = [
  { id: "uchenye-nizhnego-setup-01", source: "камеры и сетапы/Ученые_нижнего/IMG_5137.HEIC" },

  ...sequential(`${PORTFOLIO_DIR}/Стрит фотография`, "street", [
    "Photo Album 1 - 00000080.jpg", "Photo Album 1 - 00000096.jpg", "Photo Album 1 - 00000097.jpg",
    "Photo Album 1 - 00000104.jpg", "Photo Album 1 - 00000105.jpg", "Photo Album 1 - 00000106.jpg",
    "Photo Album 1 - 00000107.jpg", "Photo Album 1 - 00000110.jpg", "Photo Album 1 - 00000111.jpg",
    "Photo Album 1 - 00000112.jpg", "Photo Album 1 - 00000113.jpg", "Photo Album 1 - 00000114.jpg",
    "Photo Album 1 - 00000115.jpg", "Photo Album 1 - 00000121.jpg", "Photo Album 1 - 00000122.jpg",
    "Photo Album 1 - 00000123.jpg", "Photo Album 1 - 00000124.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Антон`, "anton", [
    "Photo Album 1 - 00000064.jpg", "Photo Album 1 - 00000065.jpg", "Photo Album 1 - 00000067.jpg",
    "Photo Album 1 - 00000068.jpg", "Photo Album 1 - 00000069.jpg", "Photo Album 1 - 00000070.jpg",
    "Photo Album 1 - 00000071.jpg", "Photo Album 1 - 00000072.jpg", "Photo Album 1 - 00000073.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Анастасия Бокс`, "anastasia-box", [
    "Photo Album 1 - 00000082.jpg", "Photo Album 1 - 00000083.jpg", "Photo Album 1 - 00000084.jpg",
    "Photo Album 1 - 00000085.jpg", "Photo Album 1 - 00000086.jpg", "Photo Album 1 - 00000087.jpg",
    "Photo Album 1 - 00000089.jpg", "Photo Album 1 - 00000090.jpg", "Photo Album 1 - 00000091.jpg",
    "Photo Album 1 - 00000092.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Дарья`, "darya", [
    "Photo Album 1 - 00000098.jpg", "Photo Album 1 - 00000099.jpg", "Photo Album 1 - 00000101.jpg",
    "Photo Album 1 - 00000102.jpg", "Photo Album 1 - 00000103.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Марина`, "marina", [
    "Photo Album 1 - 00000093.jpg", "Photo Album 1 - 00000094.jpg", "Photo Album 1 - 00000120.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Оксана`, "oksana", [
    "Photo Album 1 - 00000058.jpg", "Photo Album 1 - 00000060.jpg", "Photo Album 1 - 00000119.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Оля`, "olya", [
    "Photo Album 1 - 00000075.jpg", "Photo Album 1 - 00000076.jpg", "Photo Album 1 - 00000077.jpg",
    "Photo Album 1 - 00000078.jpg", "Photo Album 1 - 00000079.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Портреты`, "portraits", [
    "Photo Album 1 - 00000021.jpg", "Photo Album 1 - 00000095.jpg", "Photo Album 1 - 00000125.jpg",
    "Photo Album 1 - 00000127.jpg", "Photo Album 1 - 00000128.jpg",
  ]),
  ...sequential(`${PORTFOLIO_DIR}/Софа`, "sofa", [
    "Photo Album 1 - 00000062.jpg", "Photo Album 1 - 00000063.jpg", "Photo Album 1 - 00000118.jpg",
  ]),
];

/**
 * id-ы, публикуемые в галерее /photo (41 из 43 кадров «фото_портфолио»):
 * portraits-01 и portraits-03 — бэкстейдж со съёмочной площадкой, а не
 * портреты, на странице услуги фотосъёмки они сбивают питч — оставлены
 * файлами для соцсетей, в галерею и в срез 2400w не идут. street-* сюда
 * не попадает уже по префиксу — это отдельная (пока непубликуемая) серия.
 * Только эти id получают широкий срез 2400w для чёткости в лайтбоксе.
 */
const PORTFOLIO_PHOTO_PREFIXES = ["anton-", "anastasia-box-", "darya-", "marina-", "oksana-", "olya-", "portraits-", "sofa-"];
const PORTFOLIO_GALLERY_EXCLUDED_IDS = new Set(["portraits-01", "portraits-03"]);

export const PORTFOLIO_GALLERY_IDS: ReadonlySet<string> = new Set(
  SINGLE_PHOTOS
    .map((p) => p.id)
    .filter((id) => PORTFOLIO_PHOTO_PREFIXES.some((prefix) => id.startsWith(prefix)) && !PORTFOLIO_GALLERY_EXCLUDED_IDS.has(id)),
);
