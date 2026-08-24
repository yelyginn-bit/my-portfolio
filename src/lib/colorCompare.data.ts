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

/** Необязательная поясняющая строка под заголовком группы — роль на проекте
 * плюс напоминание про одинаковый кадр/кроп, чтобы не повторять это в
 * каждой из шести подписей. Есть только у СИБУРа: там формат интервью и
 * общий баланс делают эту оговорку осмысленной; у KORONA/HOFF она не нужна. */
export const COLOR_COMPARE_GROUP_INTROS: Partial<Record<ColorComparePairGroup, string>> = {
  sibur: "Референс задавал колорист проекта — я сводил шесть интервью и общие планы площадки к единому балансу. Слева и справа один и тот же кадр и тот же кроп: исходник и результат.",
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
  {
    id: "sibur-interview-01",
    group: "sibur",
    title: "Женщины СИБУРа · площадка",
    note: "Общий план площадки довёл до того же баланса, что и портреты: глубокая тень, прибор единственным источником света.",
    before: "/v3-assets/color/sibur-01-raw.webp",
    after: "/v3-assets/color/sibur-01-color.webp",
    thumbnail: "/v3-assets/color/sibur-01-thumb.webp",
    beforeAlt: "Ракурс 01 проекта «Женщины СИБУРа» до цветокоррекции",
    afterAlt: "Тот же ракурс 01 проекта «Женщины СИБУРа» после цветокоррекции",
  },
  {
    id: "sibur-interview-02",
    group: "sibur",
    title: "Женщины СИБУРа · средний план",
    note: "Выровнял кожу и пальто по теплу, фон опустил в тёмный, чтобы героиня не сливалась со стеной.",
    before: "/v3-assets/color/sibur-02-raw.webp",
    after: "/v3-assets/color/sibur-02-color.webp",
    thumbnail: "/v3-assets/color/sibur-02-thumb.webp",
    beforeAlt: "Ракурс 02 проекта «Женщины СИБУРа» до цветокоррекции",
    afterAlt: "Тот же ракурс 02 проекта «Женщины СИБУРа» после цветокоррекции",
  },
  {
    id: "sibur-interview-03",
    group: "sibur",
    title: "Женщины СИБУРа · крупный план",
    note: "Вернул коже плотность и тепло, фон увёл в глубокий тёмный — на крупном плане в этом вся разница.",
    before: "/v3-assets/color/sibur-03-raw.webp",
    after: "/v3-assets/color/sibur-03-color.webp",
    thumbnail: "/v3-assets/color/sibur-03-thumb.webp",
    beforeAlt: "Ракурс 03 проекта «Женщины СИБУРа» до цветокоррекции",
    afterAlt: "Тот же ракурс 03 проекта «Женщины СИБУРа» после цветокоррекции",
  },
  {
    id: "sibur-interview-04",
    group: "sibur",
    title: "Женщины СИБУРа · крупный план, вторая героиня",
    note: "Свёл фон к нейтрально-тёмному, чтобы синий пиджак не спорил с лицом.",
    before: "/v3-assets/color/sibur-04-raw.webp",
    after: "/v3-assets/color/sibur-04-color.webp",
    thumbnail: "/v3-assets/color/sibur-04-thumb.webp",
    beforeAlt: "Ракурс 04 проекта «Женщины СИБУРа» до цветокоррекции",
    afterAlt: "Тот же ракурс 04 проекта «Женщины СИБУРа» после цветокоррекции",
  },
  {
    id: "sibur-interview-05",
    group: "sibur",
    title: "Женщины СИБУРа · средний план, вторая героиня",
    note: "Поднял контраст, вытянул зелень растения и тёплое дерево — плоский серый кадр получил объём.",
    before: "/v3-assets/color/sibur-05-raw.webp",
    after: "/v3-assets/color/sibur-05-color.webp",
    thumbnail: "/v3-assets/color/sibur-05-thumb.webp",
    beforeAlt: "Ракурс 05 проекта «Женщины СИБУРа» до цветокоррекции",
    afterAlt: "Тот же ракурс 05 проекта «Женщины СИБУРа» после цветокоррекции",
  },
  {
    id: "sibur-interview-06",
    group: "sibur",
    title: "Женщины СИБУРа · общий план со светом",
    note: "Собрал свет в одно пятно, остальную площадку утопил в тени.",
    before: "/v3-assets/color/sibur-06-raw.webp",
    after: "/v3-assets/color/sibur-06-color.webp",
    thumbnail: "/v3-assets/color/sibur-06-thumb.webp",
    beforeAlt: "Ракурс 06 проекта «Женщины СИБУРа» до цветокоррекции",
    afterAlt: "Тот же ракурс 06 проекта «Женщины СИБУРа» после цветокоррекции",
  },
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
