/**
 * Пары «до / после» для блока цветокоррекции.
 *
 * Это единственное доказательство навыка колориста, которое нельзя подделать
 * текстом, поэтому к материалу жёсткие требования:
 *
 * 1. Оба кадра — один и тот же момент, одно разрешение и один кроп.
 *    Разный кроп читается как подмена и убивает доверие.
 * 2. «До» — честный исходник (log/rec709 с камеры), без предварительной
 *    подтяжки. Занижать «до» ради эффектного «после» нельзя.
 * 3. Права на публикацию кадра подтверждены. Клиентские материалы без
 *    разрешения сюда не попадают.
 * 4. Формат webp или jpg, длинная сторона 1600–2000 px.
 * 5. Файлы СИБУРа лежат в `public/v3-assets/color/`; файлы KORONA/HOFF —
 *    в `public/portfolio-photos/` (пайплайн `scripts/process-portfolio-photos.ts`).
 *
 * Пока массив пуст, секция на главной не отображается вообще — пустой блок
 * или заглушка хуже отсутствия блока.
 */

/** Группа показа на /cvetokorrekciya — определяет подзаголовок блока. */
export type ColorComparePairGroup = "sibur" | "korona" | "hoff";

export const COLOR_COMPARE_GROUP_ORDER: readonly ColorComparePairGroup[] = ["sibur", "korona", "hoff"];

export const COLOR_COMPARE_GROUP_LABELS: Record<ColorComparePairGroup, string> = {
  sibur: "Интервью и портрет — СИБУР",
  korona: "Промышленная съёмка — KORONA",
  hoff: "Предметная и интерьерная съёмка — HOFF",
};

export type ColorComparePair = {
  /** Короткий идентификатор для ключа React. */
  id: string;
  /** Группа показа — влияет только на подзаголовок, не на сами данные. */
  group: ColorComparePairGroup;
  /** Что за проект. Без выдуманных названий и без имени клиента без разрешения. */
  title: string;
  /** Что именно сделано с изображением. Одна конкретная фраза, не «сделал красиво». */
  note: string;
  /** Путь к исходному кадру. */
  before: string;
  /** Путь к кадру после грейда. */
  after: string;
  /** Альт для исходника. */
  beforeAlt: string;
  /** Альт для результата. */
  afterAlt: string;
  thumbnail?: string;
};

/**
 * Заполняется реальными кадрами. Пример структуры записи:
 *
 * {
 *   id: "concert-nn",
 *   group: "sibur",
 *   title: "Концерт, съёмка в смешанном свете",
 *   note: "Свёл красный прожектор и холодный контровой к одной температуре, вытянул лица из тени",
 *   before: "/color/concert-before.webp",
 *   after: "/color/concert-after.webp",
 *   beforeAlt: "Кадр с концерта до цветокоррекции",
 *   afterAlt: "Тот же кадр после цветокоррекции",
 * }
 */
export const COLOR_COMPARE_PAIRS: ColorComparePair[] = [
  ...Array.from({ length: 6 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `sibur-interview-${number}`,
      group: "sibur" as const,
      title: `Женщины СИБУРа / ракурс ${number}`,
      note: "Один и тот же кадр и кроп: исходник и финальный цвет из рабочего набора проекта.",
      before: `/v3-assets/color/sibur-${number}-raw.webp`,
      after: `/v3-assets/color/sibur-${number}-color.webp`,
      thumbnail: `/v3-assets/color/sibur-${number}-thumb.webp`,
      beforeAlt: `Ракурс ${number} проекта «Женщины СИБУРа» до цветокоррекции`,
      afterAlt: `Тот же ракурс ${number} проекта «Женщины СИБУРа» после цветокоррекции`,
    };
  }),
  {
    id: "korona-02",
    group: "korona",
    title: "KORONA · лазерная резка",
    note: "Углубил чёрный фон и усилил контраст тёплых искр к холодному металлу станка.",
    before: "/portfolio-photos/korona-02-raw.webp",
    after: "/portfolio-photos/korona-02-color.webp",
    beforeAlt: "Лазерная резка на производстве KORONA до цветокоррекции",
    afterAlt: "Тот же кадр лазерной резки KORONA после цветокоррекции",
  },
  {
    id: "korona-03",
    group: "korona",
    title: "KORONA · сварочный участок",
    note: "Развёл кадр по температуре — тёплые стены и потолок против холодной тени в глубине, искры сварки стали самым ярким акцентом.",
    before: "/portfolio-photos/korona-03-raw.webp",
    after: "/portfolio-photos/korona-03-color.webp",
    beforeAlt: "Сварщик у стола на производстве KORONA до цветокоррекции",
    afterAlt: "Тот же кадр сварочного участка KORONA после цветокоррекции",
  },
  {
    id: "hoff-02",
    group: "hoff",
    title: "HOFF · спальня, торшер",
    note: "Увёл фон в глубокий чёрный с тёплым падением света от торшера и выбелил постельное бельё.",
    before: "/portfolio-photos/hoff-02-raw.webp",
    after: "/portfolio-photos/hoff-02-color.webp",
    beforeAlt: "Спальня с торшером, карточка товара HOFF, до цветокоррекции",
    afterAlt: "Та же сцена спальни HOFF после цветокоррекции",
  },
  {
    id: "hoff-05",
    group: "hoff",
    title: "HOFF · кровать сверху",
    note: "Затемнил периферию кадра, оставил тёплый круг света от лампы читаемым и почистил белый цвет пододеяльника.",
    before: "/portfolio-photos/hoff-05-raw.webp",
    after: "/portfolio-photos/hoff-05-color.webp",
    beforeAlt: "Кровать сверху с прикроватной лампой, карточка товара HOFF, до цветокоррекции",
    afterAlt: "Тот же кадр кровати сверху HOFF после цветокоррекции",
  },
];
