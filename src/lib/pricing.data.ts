import type { EstimateData } from "./types";

export type PublicPriceCategory = "Монтаж" | "Съёмка" | "Съёмка + монтаж" | "Регулярный контент" | "Фото" | "Маркетплейсы" | "Полный продакшн" | "Цвет" | "Прямые трансляции" | "Сайты";

export type PublicPriceItem = {
  id: string;
  category: PublicPriceCategory;
  title: string;
  price: string;
  description: string;
  includes: string[];
  limitations: string;
  timeline: string;
  href: string;
  portfolioHref: string;
  featured?: boolean;
  /** Позиция показывается на своей посадочной, но не в общем `/ceny` (CODEX-YE-01). */
  showOnCatalog?: boolean;
  /** Необязательная ссылка «пример работы» рядом с ценой — секция/страница
   * с доказательством услуги (PROMPT-22 §5). У остальных позиций не задана. */
  exampleHref?: string;
};

export const PUBLIC_PRICES: PublicPriceItem[] = [
  { id: "editing-reels", category: "Монтаж", title: "Монтаж Reels / Shorts", price: "от 1 000 ₽ за ролик", description: "Базовый монтаж — 1 000 ₽, стандартный — 2 000 ₽, премиум — 3 500 ₽ за ролик.", includes: ["Монтаж", "Базовый цвет", "Звук"], limitations: "Состав уровня и сложность графики согласуем до начала работы.", timeline: "Срок согласуется по объёму исходников и выбранному уровню монтажа.", href: "/videomontazh", portfolioHref: "/portfolio/post" },
  { id: "editing-youtube", category: "Монтаж", title: "Монтаж YouTube", price: "от 7 000 ₽", description: "Выпуск до 15 минут из подготовленного материала.", includes: ["Сборка", "Цвет", "Чистка звука"], limitations: "Мультикамера и графика рассчитываются отдельно.", timeline: "По объёму исходников", href: "/videomontazh", portfolioHref: "/portfolio/post" },
  { id: "reels-block", category: "Съёмка", title: "Съёмочный блок Reels", price: "от 6 000 ₽", description: "До трёх часов организованной съёмки по согласованному плану.", includes: ["Камера", "Базовый свет", "Запись звука"], limitations: "Число роликов определяется планом; монтаж оплачивается отдельно.", timeline: "Одна съёмочная дата", href: "/reels", portfolioHref: "/portfolio/reels" },
  { id: "reels-package", category: "Съёмка", title: "Reels для бизнеса", price: "от 6 000 ₽", description: "Съёмочный блок до 3 часов.", includes: ["Камера", "Базовый свет", "Запись звука"], limitations: "Число роликов определяется планом; монтаж оплачивается отдельно.", timeline: "Одна съёмочная дата", href: "/reels", portfolioHref: "/portfolio/reels", featured: true },
  { id: "event", category: "Съёмка", title: "Видеосъёмка мероприятия", price: "от 3 000 ₽/час · минимум 2 часа", description: "Работа видеографа на событии, минимум два часа (от 6 000 ₽).", includes: ["Репортажная съёмка", "Камера", "Базовый звук"], limitations: "Aftermovie до 3 минут — от 7 000 ₽, монтаж отдельно.", timeline: "От одной даты", href: "/event-video", portfolioHref: "/portfolio/events" },
  { id: "event-aftermovie", category: "Монтаж", title: "Монтаж aftermovie до 3 минут", price: "от 7 000 ₽", description: "Отбор, монтаж, базовый цвет и звук из подготовленных материалов события.", includes: ["Монтаж", "Базовый цвет", "Звук"], limitations: "Съёмка события считается отдельно; графика и лицензии — по задаче.", timeline: "Первая версия обычно в течение недели после съёмки и получения полного материала.", href: "/event-video", portfolioHref: "/portfolio/events" },
  { id: "photo", category: "Фото", title: "Репортажная фотосъёмка", price: "от 2 500 ₽/час · минимум 2 часа", description: "События, команды и рабочие процессы для бизнеса.", includes: ["Съёмка", "Отбор", "Базовая обработка"], limitations: "Минимальный заказ — два часа (от 5 000 ₽). Ориентир — 50–100 готовых фото за 2 часа, зависит от события. Дополнительная ретушь — 300 ₽/кадр; сложная — от 500 ₽ после оценки.", timeline: "10–15 превью — в течение 48 часов; готовая галерея — обычно за 3–5 календарных дней.", href: "/reportazhnaya-fotosemka", portfolioHref: "/photo#gallery", exampleHref: "/photo#reportazh" },
  { id: "photo-studio", category: "Фото", title: "Студийная фотосъёмка", price: "5 500 ₽/час", description: "Портретная или контентная съёмка; аренда студии включена.", includes: ["Подготовка", "Съёмка", "Все удачные кадры с цветом", "10 кадров в детальной ретуши", "Аренда студии"], limitations: "Общий объём серии зависит от съёмки. Дополнительная ретушь — 300 ₽/кадр; сложная — от 500 ₽ после оценки. Стилист оплачивается отдельно.", timeline: "Превью — в течение 48 часов; готовая галерея — обычно за 3–5 календарных дней.", href: "/studiynaya-fotosemka", portfolioHref: "/photo#gallery" },
  { id: "photo-product", category: "Фото", title: "Предметная съёмка", price: "от 200 ₽/кадр · минимум 10 кадров", description: "Каталожная или имиджевая съёмка товара.", includes: ["Съёмка", "Обработка согласованных кадров"], limitations: "Минимальный заказ — 10 кадров (от 2 000 ₽). Сложная постановка и ретушь считаются отдельно.", timeline: "Срок согласуется по объёму", href: "/predmetnaya-fotosemka", portfolioHref: "/photo#gallery" },
  { id: "content-day", category: "Регулярный контент", title: "Контент-день", price: "от 20 000 ₽", description: "Подготовка, 3–4 часа съёмки, 7 Reels и фото для бизнеса.", includes: ["Подготовка", "Съёмка 3–4 часа", "7 Reels", "30 фото с базовой обработкой", "5 кадров в детальной ретуши"], limitations: "Планируем объём до съёмки; дополнительные кадры и сложная постановка — отдельно.", timeline: "Первая версия роликов обычно в течение недели; финальный срок фиксируется в смете.", href: "/content-day", portfolioHref: "/portfolio/reels", featured: true },
  { id: "marketplace", category: "Маркетплейсы", title: "Видео для маркетплейса", price: "от 7 000 ₽", description: "Подготовка, съёмка и монтаж одного товара.", includes: ["Подготовка", "Предметная съёмка", "Монтаж"], limitations: "Модель, реквизит, локация и сложная графика — отдельно.", timeline: "После согласования сценария", href: "/video-dlya-marketpleysov", portfolioHref: "/portfolio" },
  { id: "sajty-start", category: "Сайты", title: "Сайт под ключ — Старт", price: "15 000 ₽", description: "Одностраничный сайт: работы, услуги, контакты. Шаблон в ваших цветах и шрифтах. Теги для Яндекса.", includes: ["Один круг правок"], limitations: "Фиксированная стоимость.", timeline: "Старт — 3–5 дней", href: "/sajty#zakaz", portfolioHref: "/sajty", showOnCatalog: false },
  { id: "sajty-pro", category: "Сайты", title: "Сайт под ключ — Про", price: "35 000 ₽", description: "До пяти страниц, анимации, галереи и видео, форма заявок в Telegram, Яндекс Метрика.", includes: ["Два круга правок"], limitations: "Половина после согласования концепта.", timeline: "Старт — 3–5 дней", href: "/sajty#zakaz", portfolioHref: "/sajty", showOnCatalog: false },
  { id: "sajty-premium", category: "Сайты", title: "Сайт под ключ — Премиум", price: "от 80 000 ₽", description: "Индивидуальный дизайн с эффектами, от десяти страниц, блог и кейсы, настройка под поиск Яндекса.", includes: ["Три круга правок"], limitations: "Половина после согласования концепта.", timeline: "Срок согласуется по брифу", href: "/sajty#zakaz", portfolioHref: "/sajty", showOnCatalog: false },
  { id: "sajty-support", category: "Сайты", title: "Поддержка сайта", price: "от 2 000 ₽/мес.", description: "Мелкие правки после запуска; домен и хостинг считаются по фактической стоимости.", includes: ["Ежемесячное сопровождение"], limitations: "Объём крупных работ согласуется отдельно; расходы на домен и хостинг не входят.", timeline: "Ежемесячно", href: "/sajty#zakaz", portfolioHref: "/sajty", showOnCatalog: false },
  { id: "field-video", category: "Съёмка", title: "Оператор + техника", price: "от 15 000 ₽/смена до 8 часов", description: "Выездная смена с оператором, камерой, базовым светом и звуком.", includes: ["Оператор", "Камера", "Базовый свет и звук"], limitations: "Монтаж, логистика и дополнительная техника считаются отдельно. Трансляции — отдельная услуга.", timeline: "Одна съёмочная дата", href: "/operator-s-tehnikoy", portfolioHref: "/portfolio" },
  { id: "color-grading", category: "Цвет", title: "Цветокоррекция в DaVinci Resolve", price: "от 2 000 ₽", description: "Базовый формат — 2 000 ₽, расширенный — 4 000 ₽, сложный — 7 000 ₽; работа удалённо после просмотра исходников.", includes: ["Разбор материала", "Первичная коррекция", "Финальный грейд", "Два раунда правок"], limitations: "Реставрация брака съёмки и пересъёмка не входят.", timeline: "Обычно 3–7 рабочих дней", href: "/cvetokorrekciya", portfolioHref: "/portfolio/color", featured: true },
  { id: "advertising", category: "Полный продакшн", title: "Рекламный ролик", price: "от 15 000 ₽", description: "Один продукт, услуга или предложение: подготовка, съёмка и финальный мастер.", includes: ["Препродакшн", "Съёмка", "Постпродакшн"], limitations: "Команда, площадка, техника и лицензии зависят от задачи.", timeline: "После брифа и плана производства", href: "/reklamnye-roliki", portfolioHref: "/portfolio", featured: true },
  { id: "broadcast-operator", category: "Прямые трансляции", title: "Оператор или режиссёр на трансляцию", price: "8 000–10 000 ₽", description: "Выход в собранную командой площадки — оператором камеры или режиссёром эфира.", includes: ["Работа на смене", "Оператор или режиссёр эфира"], limitations: "Оборудование и организацию эфира обеспечивает команда площадки.", timeline: "Одна смена", href: "/pryamye-translyacii", portfolioHref: "/portfolio/broadcast" },
  { id: "broadcast-turnkey", category: "Прямые трансляции", title: "Простая трансляция под ключ", price: "15 000 ₽", description: "Один рабочий день: застройка, эфир, демонтаж и выезд. Одна камерная точка, картинка сводится с презентацией в один эфир, звук — с микшерного пульта площадки.", includes: ["Застройка и демонтаж", "Эфир весь день", "Своё оборудование"], limitations: "Многокамерная режиссура и запись каждой камеры — отдельный проект.", timeline: "Один рабочий день", href: "/pryamye-translyacii", portfolioHref: "/portfolio/broadcast", featured: true },
  { id: "broadcast-multicam", category: "Прямые трансляции", title: "Сложные многокамерные трансляции", price: "по смете", description: "Под конкретное событие, в команде: несколько камер, режиссура эфира, запись и монтаж.", includes: ["Многокамерный эфир", "Режиссура", "Запись и монтаж"], limitations: "Состав команды и техники зависит от события.", timeline: "После брифа", href: "/pryamye-translyacii", portfolioHref: "/portfolio/broadcast" },
];

export const PUBLIC_PRICE_BY_ID = Object.fromEntries(PUBLIC_PRICES.map((item) => [item.id, item])) as Record<string, PublicPriceItem>;

/**
 * Публичная ценовая модель 2026.
 * Это ориентиры для первичной сметы, а не оферта: состав команды, техника,
 * локация, сроки и объём исходников уточняются после брифа.
 */
export const ESTIMATE_DATA: EstimateData = {
  "Reels / Shorts": {
    base: [
      { name: "Съёмочный блок до 3 часов", priceMin: 6000, priceMax: 6000, unit: "project" },
    ],
    options: [
      { name: "Монтаж одного Reels — базовый", priceMin: 1000, priceMax: 1000, unit: "project", rushEligible: true },
      { name: "Монтаж одного Reels — стандарт", priceMin: 2000, priceMax: 2000, unit: "project", rushEligible: true },
      { name: "Монтаж одного Reels — премиум", priceMin: 3500, priceMax: 3500, unit: "project", rushEligible: true },
      { name: "Дополнительный съёмочный блок до 3 часов", priceMin: 6000, priceMax: 6300, unit: "day" },
    ],
  },
  "Монтаж Reels": {
    base: [
      { name: "Монтаж одного вертикального ролика", priceMin: 1000, priceMax: 3500, unit: "project", rushEligible: true },
    ],
    options: [
      { name: "Субтитры и расширенный саунд-дизайн", priceMin: 700, priceMax: 1700, unit: "project" },
      { name: "Моушн-графика", priceMin: 1200, priceMax: 3500, unit: "project" },
      { name: "Дополнительная версия под площадку", priceMin: 500, priceMax: 1200, unit: "project" },
    ],
  },
  "Монтаж YouTube": {
    base: [
      { name: "Монтаж выпуска до 15 минут", priceMin: 7000, priceMax: 14000, unit: "project", rushEligible: true },
    ],
    options: [
      { name: "Расширенная чистка звука и цветокоррекция", priceMin: 1300, priceMax: 2900, unit: "project" },
      { name: "Мультикамерный монтаж", priceMin: 1900, priceMax: 4900, unit: "project" },
      { name: "Графика, вставки и экранные подписи", priceMin: 1600, priceMax: 5800, unit: "project" },
      { name: "Нарезка 3 Shorts из выпуска", priceMin: 2900, priceMax: 5800, unit: "project" },
    ],
  },
  "Видеосъёмка мероприятия": {
    base: [
      { name: "Работа видеографа, минимум 2 часа", priceMin: 3000, priceMax: 3000, unit: "hour" },
    ],
    options: [
      { name: "Монтаж aftermovie до 3 минут", priceMin: 7000, priceMax: 7000, unit: "project", rushEligible: true },
      { name: "Вторая камера / оператор", priceMin: 3000, priceMax: 5000, unit: "day" },
      { name: "Короткий ролик для соцсетей", priceMin: 1300, priceMax: 2500, unit: "project", rushEligible: true },
    ],
  },
  "Студийная фотосъёмка": {
    base: [
      { name: "Съёмка в студии (аренда включена)", priceMin: 5500, priceMax: 5500, unit: "hour" },
    ],
    options: [
      { name: "Дополнительная ретушь одного собственного кадра", priceMin: 300, priceMax: 300, unit: "frame" },
      { name: "Дополнительная сложная ретушь одного собственного кадра", priceMin: 500, priceMax: 500, unit: "frame" },
    ],
  },
  "Репортажная фотосъёмка": {
    base: [
      { name: "Съёмка, отбор и базовая обработка", priceMin: 2500, priceMax: 2500, unit: "hour" },
    ],
    options: [
      { name: "Дополнительная ретушь одного собственного кадра", priceMin: 300, priceMax: 300, unit: "frame" },
      { name: "Дополнительная сложная ретушь одного собственного кадра", priceMin: 500, priceMax: 500, unit: "frame" },
    ],
  },
  "Цветокоррекция": {
    base: [
      { name: "Цветокоррекция — базовый формат", priceMin: 2000, priceMax: 2000, unit: "project" },
    ],
    options: [
      { name: "Заменить на расширенный формат (итого 4 000 ₽)", priceMin: 4000, priceMax: 4000, unit: "project", replaces: "Цветокоррекция — базовый формат" },
      { name: "Заменить на сложный формат (итого 7 000 ₽)", priceMin: 7000, priceMax: 7000, unit: "project", replaces: "Цветокоррекция — базовый формат" },
    ],
  },
  "Контент для бизнеса": {
    base: [
      { name: "Подготовка, съёмка 3–4 часа, 7 Reels, 30 фото и 5 ретушей", priceMin: 20000, priceMax: 20000, unit: "project" },
    ],
    options: [
      { name: "Дополнительные 5 Reels", priceMin: 7700, priceMax: 12400, unit: "project" },
      { name: "Рекламный ролик до 60 секунд", priceMin: 7700, priceMax: 14000, unit: "project" },
    ],
  },
  "Выездная видеосъёмка": {
    base: [
      { name: "Смена оператора с базовой камерой, светом и звуком до 8 часов", priceMin: 15000, priceMax: 15000, unit: "day" },
    ],
    options: [
      { name: "Монтаж ролика до 2 минут", priceMin: 7500, priceMax: 15700, unit: "project", rushEligible: true },
      { name: "Дополнительная камера", priceMin: 4200, priceMax: 7700, unit: "day" },
      { name: "Выезд за пределы Нижнего Новгорода", priceMin: 1000, priceMax: 5200, unit: "project" },
    ],
  },
};

/** Derived publication strings: no independent prices in static copy. */
const rubles = (value: number) => `${value.toLocaleString("ru-RU").replace(/\s/gu, " ")} ₽`;
export const PUBLIC_PRICE_TEXTS: Record<string, string> = {
  "editing-reels-tiers": ESTIMATE_DATA["Reels / Shorts"].options.slice(0, 3).map((item) => rubles(item.priceMin)).join(" / "),
  "editing-reels-standard": `от ${rubles(ESTIMATE_DATA["Reels / Shorts"].options[1].priceMin)}`,
  "editing-reels-premium": `от ${rubles(ESTIMATE_DATA["Reels / Shorts"].options[2].priceMin)}`,
  "color-tiers": [ESTIMATE_DATA["Цветокоррекция"].base[0], ...ESTIMATE_DATA["Цветокоррекция"].options].map((item) => rubles(item.priceMin)).join(" / "),
  "color-extended": `от ${rubles(ESTIMATE_DATA["Цветокоррекция"].options[0].priceMin)}`,
  "color-complex": `от ${rubles(ESTIMATE_DATA["Цветокоррекция"].options[1].priceMin)}`,
  "photo-minimum": `от ${rubles(ESTIMATE_DATA["Репортажная фотосъёмка"].base[0].priceMin * 2)}`,
  "three-reels-editing": rubles(ESTIMATE_DATA["Reels / Shorts"].options[0].priceMin * 3),
  "three-reels-package": rubles(ESTIMATE_DATA["Reels / Shorts"].base[0].priceMin + ESTIMATE_DATA["Reels / Shorts"].options[0].priceMin * 3),
  "event-camera": `от ${rubles(ESTIMATE_DATA["Видеосъёмка мероприятия"].options[1].priceMin)}`,
  "event-social": `от ${rubles(ESTIMATE_DATA["Видеосъёмка мероприятия"].options[2].priceMin)}`,
};
