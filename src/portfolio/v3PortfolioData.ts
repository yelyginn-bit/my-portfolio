export type EvidenceStatus =
  | "SOURCE_CONFIRMED"
  | "EXTERNALLY_VERIFIED"
  | "USER_UNCERTAIN"
  | "CONFLICT"
  | "UNRESOLVED";

export type RoleTag =
  | "camera"
  | "operator"
  | "edit"
  | "multicam"
  | "color"
  | "sound"
  | "graphics"
  | "cleanup"
  | "sde";

export type FormatTag =
  | "commercial"
  | "event"
  | "reels"
  | "concert"
  | "interview"
  | "podcast"
  | "theatre"
  | "product"
  | "architecture"
  | "education"
  | "factory"
  | "presentation"
  | "broadcast"
  | "showreel";

export type PortfolioCategory =
  | "camera"
  | "commercial"
  | "events"
  | "reels"
  | "concerts"
  | "interviews"
  | "post"
  | "color"
  | "broadcast"
  | "product";

export interface ProjectEvidence {
  status: EvidenceStatus;
  source: string;
  note?: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  client?: string;
  description?: string;
  roles: RoleTag[];
  formats: FormatTag[];
  sourceCategory: string;
  responsibilities: string[];
  videos: string[];
  featured: boolean;
  legacyHidden?: boolean;
  evidence: ProjectEvidence;
}

export interface WorkAsset {
  kinescopeId: string;
  projectId: string;
  title?: string;
  orientation: "landscape" | "portrait";
  sourceOrder: number;
  featured?: boolean;
}

type AssetRow = readonly [id: string, orientation: WorkAsset["orientation"]];

// Exact source order from «ссылки на работы.docx». Do not reorder: sourceOrder
// is used for auditability and for stable portfolio links.
export const CANONICAL_ASSET_ROWS: readonly AssetRow[] = [
  ["2PzbBYe3Xb3XQSGCZH3kMn", "landscape"], ["8PVrdEuzshWzAqjbDvxbhs", "landscape"],
  ["qb352pQN7BtwZF5FrCbRFm", "landscape"], ["nkGyxqpqGshuek8DL14YzU", "landscape"],
  ["cAxvA2avPFNZae63YfZygj", "landscape"], ["deV36JQbK25yhFKf2zHs3G", "landscape"],
  ["doGoT7D4WvVGMqTZ1aAKcU", "landscape"], ["wrf4URJ9Q7P7g5B1SZ5A7W", "landscape"],
  ["48AxwNsCXxWJm6FM6jYMjs", "landscape"], ["bQnw7qS8FnvGpjF4wNyRd8", "landscape"],
  ["iTRRejvo2n22eTAFy1GCqC", "landscape"], ["iaxomnSfFfjixvstpbekW5", "landscape"],
  ["f9SVp8wEErZqqDn2C1mR6J", "landscape"], ["2N1TR2AxfZ4eGBL7BuJJyK", "landscape"],
  ["6hwG3x1KkMEq6YZrwJuUfk", "landscape"], ["fvZuWWCnArwRn726wYuTmh", "landscape"],
  ["shDxvnmrTKMhNrkn7bZb3T", "landscape"], ["np2536nFJq7NiG6aDKp44X", "landscape"],
  ["wncaRrmahS5bTRUgmXVoXi", "landscape"], ["tUjFh6nxvKhE3ZwSrD2F6W", "landscape"],
  ["hjNTmjbczLrKeeLcKT3Vtw", "landscape"], ["6j8wPfXv6Keka6JTCoiwUC", "portrait"],
  ["fvxndmGGHqWtuCcK5TnB4j", "landscape"], ["0u1FpHDHxFSsWdWJX3HcXn", "landscape"],
  ["2QUm7aTButqfFc4mDnbdQU", "landscape"], ["ji7rMcYfm5Y7sRw7dKGWxf", "landscape"],
  ["oVqtn1J5sip4R8aNBMY1mi", "landscape"], ["3o3GT6i1v8sXkSUCokNwii", "landscape"],
  ["mApw7xeKfQC6WP47mShNau", "landscape"], ["o1Doi1XmkMD9qiwSD61NUp", "landscape"],
  ["agaS595WU4gFLjqprQuQeh", "landscape"], ["qmJzp9voJxPp3FiEmwcdGT", "landscape"],
  ["iXj6XoJUVKrKk3MPdyBzah", "landscape"], ["bWomqAET9ARHvpTTUUHS9t", "landscape"],
  ["2riYFJ2gYi3JUh4GQGvLnQ", "landscape"], ["ibJsptvZeqt8fe3BBdXvQm", "landscape"],
  ["7UV55F6RMQseCjQ1fyRTtd", "landscape"], ["kXnZpxvucX5VKdytAgUAW8", "landscape"],
  ["o8r8qjE3fzudh7MGUruDFv", "landscape"], ["2GgtwiWuq6XaS3yeXbWhRq", "portrait"],
  ["pskL2K5zWzBGMuUH8ZaG6P", "portrait"], ["eartRu9igpoxXbUHgATyyt", "portrait"],
  ["8uVYyar3L9cBPV1DmiWcau", "portrait"], ["d89ft31rBLhd7XMdSFrAFz", "portrait"],
  ["wMPCVrj945ds61B4xJK6y2", "portrait"], ["g6XBdsRfBr9QK7B31jH3zG", "portrait"],
  ["0e6mxyEoYRosiGzuBzBdwb", "portrait"], ["4r4pXusToooZ4BT8a9935e", "portrait"],
  ["fhCvj9nTWMH7puFcUWpai6", "portrait"], ["th8PWjmJNUatY2cjGUdkcc", "portrait"],
  ["wEH2Y96QsApXLDDAkzrRZQ", "portrait"], ["kpP6XYJnC5wDt5vNMAJU3J", "portrait"],
  ["oesfViYTJW9KWuKo4rpFxq", "landscape"], ["qwQZmNCDyfSvvDmwHNh8ak", "landscape"],
  ["sNd7TyyMts3TTKMvAcmFde", "landscape"], ["gjKQDqJzGJzknyAiBQJdSQ", "landscape"],
  ["hYrQ1PhbkuLK7P6CSRgVcQ", "landscape"], ["8b3CYfrZtypdJtb6EragDy", "landscape"],
  ["gK1CeYEygyc83eRNdueXB5", "landscape"], ["ib4dtVDCUY1TUUg4ubm6Z2", "landscape"],
  ["7Q6bkty8E1Bv62JXJ9Pvog", "landscape"], ["g7DBRUGGfASR1yy1FQs6PT", "landscape"],
  ["a5xv428qM8GECjN197KwFx", "landscape"], ["xmf2EeT1FwDVkDkXdGxNQL", "landscape"],
  ["g5pJM7qcHVkTbYPXTaCH3K", "landscape"], ["0crzkasYwqB4Cj38ENVwB5", "landscape"],
  ["wtTajGdgsEbFNiX1xRgSQA", "landscape"], ["mSLvtLmWtKqmoKv2ZEFDRw", "landscape"],
  ["rngUwnkJTVBYbpGq5n21Cz", "landscape"], ["9ht9mkhieHTeXxTfsf2G3A", "landscape"],
  ["mpqLXFwhtkk2PJ1ZUdfUxi", "landscape"], ["ehhp5HCGM22bw9eBbtSw85", "landscape"],
  ["bcowrcjUyKEj4dUjVzHpMZ", "landscape"], ["7Wp7zYWRmNBA35cMfwwUEv", "landscape"],
  ["hCJmSvmN6S7P8uAnexguQ5", "landscape"], ["8M1HSYAtHvQqPqUNjh9G9o", "landscape"],
  ["536k65CQjewFX9nVqG7Yse", "landscape"], ["8qEST8SWM183EP5MDYukbw", "landscape"],
  ["7ogaE7JkjcrssGue1Qu23o", "landscape"], ["9sZonV2HK653PfPqxqdGbH", "landscape"],
  ["o1R5MSC6VZDRYGdvkejSkN", "landscape"], ["7cXtKnBp5idm5iTAgDFKEN", "landscape"],
  ["txm4qz7vRPifxz3MPbzu1V", "landscape"], ["cA7pGxKbCP8XFNYUjNSbpr", "landscape"],
  ["mLGNoFi4cj3vAdBrqrsdtP", "landscape"], ["7MmmoQkeKtLJFA3aqZGToF", "landscape"],
  ["6kMP6pfn8UtNRXS8eYfjPc", "landscape"], ["hyQindossxyWZfRxLuDacu", "landscape"],
  ["iXmVYXkXdmFiHpn6NCNoyq", "landscape"],
] as const;

type ProjectSeed = Omit<Project, "videos" | "evidence"> & {
  range: readonly [number, number];
  evidenceNote?: string;
  assetTitles?: readonly string[];
};

const seeds: readonly ProjectSeed[] = [
  { id: "gorky-memory", slug: "gorky-stranicy-pamyati", title: "Горький. Страницы памяти", sourceCategory: "спектакли", range: [1, 1], roles: ["operator"], formats: ["theatre"], responsibilities: ["Операторская работа"], featured: false, description: "Спектакль о детстве Максима Горького, снятый в интерьерах одного дома." },
  { id: "metro-concerts", slug: "metro-gorkovskaya-concerts", title: "Концерты «Станции метро Горьковская»", sourceCategory: "концерты", range: [2, 6], roles: ["edit", "multicam"], formats: ["concert", "event", "broadcast"], responsibilities: ["Режиссура монтажа", "Мультикамерный монтаж восьми камер"], featured: true, description: "Концертный материал нескольких выступлений. Моя работа — режиссура монтажа и сборка материала с восьми камер.", assetTitles: ["Уматурман", "Тима ищет свет", "Стереоширина", "Искрит", "Ночной селект"] },
  { id: "sber-architecture", slug: "sber-arhitektura", title: "SBER.Архитектура", client: "СберУниверситет", sourceCategory: "интервью / спецпроекты", range: [7, 12], roles: ["edit", "multicam"], formats: ["interview", "education", "architecture"], responsibilities: ["Монтаж курса", "Мультикамерная сборка"], featured: false, description: "Образовательный курс об архитектуре: интервью и аниматики, собранные в три раздела." },
  { id: "sibur-women", slug: "zhenshchiny-sibura", title: "Женщины СИБУРа", client: "СИБУР", sourceCategory: "интервью / спецпроекты", range: [13, 18], roles: ["edit", "color", "sound"], formats: ["interview"], responsibilities: ["Монтаж по транскрипциям", "Чистка пауз", "Работа со звуком", "Приведение цвета к тизеру"], featured: true, description: "Шесть интервью. Я собирал монтаж по транскрипциям, чистил паузы, работал со звуком и приводил материал к утверждённому цветовому направлению тизера." },
  { id: "scientists-nn", slug: "uchenye-nizhnego", title: "Учёные Нижнего", sourceCategory: "интервью / спецпроекты", range: [19, 21], roles: ["camera", "operator", "edit", "multicam", "color", "graphics"], formats: ["interview"], responsibilities: ["Оператор-постановщик", "Свет и постановка кадра", "Мультикамерный монтаж", "Цвет", "Графические вставки"], featured: true, description: "Три интервью с нижегородскими учёными, снятые за три съёмочных дня." },
  { id: "well-teaser", slug: "horosho-teaser", title: "«Хорошо». Тизер", sourceCategory: "тизеры", range: [22, 22], roles: ["edit", "color"], formats: ["commercial", "reels"], responsibilities: ["Монтаж", "Цвет"], featured: false, description: "Тизер музыкального клипа, снятого на iPhone 16 Pro." },
  { id: "sibur-teaser", slug: "zhenshchiny-sibura-teaser", title: "Женщины СИБУРа. Тизер", client: "СИБУР", sourceCategory: "тизеры", range: [23, 23], roles: ["edit"], formats: ["interview", "commercial"], responsibilities: ["Монтаж тизера"], featured: false, description: "Тизер проекта «Женщины СИБУРа». Моя работа — монтаж." },
  { id: "sber-teaser", slug: "sber-arhitektura-teaser", title: "SBER.Архитектура. Тизер", client: "СберУниверситет", sourceCategory: "тизеры", range: [24, 24], roles: ["edit"], formats: ["education", "architecture"], responsibilities: ["Монтаж тизера"], featured: false, description: "Тизер образовательного проекта SBER.Архитектура. Моя работа — монтаж." },
  { id: "barrier-education", slug: "barier-instrukcii", title: "БАРЬЕР. Видеоинструкции", client: "БАРЬЕР", sourceCategory: "обучающие", range: [25, 27], roles: ["edit", "graphics", "cleanup"], formats: ["education", "product"], responsibilities: ["Черновой и чистовой монтаж", "Графика", "Cleanup", "Подстановка цветовых стиллов"], featured: false, description: "Три инструкции по замене картриджей в системах фильтрации воды." },
  { id: "caprigo-education", slug: "caprigo-obuchenie", title: "Caprigo. Обучающие видео", client: "Caprigo", sourceCategory: "обучающие", range: [28, 35], roles: ["edit", "multicam", "sound"], formats: ["education", "product"], responsibilities: ["Мультикамерный монтаж", "Черновые вставки", "Подстановка цветовых стиллов", "Работа со звуком"], featured: false, description: "Восемь обучающих видео о продукции и системе «Базис»." },
  { id: "become-legendary", slug: "become-legendary-architecture", title: "Become Legendary. Архитектура", client: "Become Legendary", sourceCategory: "архитектура", range: [36, 39], roles: ["edit", "color"], formats: ["architecture", "commercial"], responsibilities: ["Монтаж", "Цвет", "Стабилизация", "Speed ramp"], featured: true, description: "Серия видео об архитектуре и недвижимости в США." },
  { id: "egovtsev-podcast", slug: "egovtsev-podcast-reels", title: "Стас Еговцев. Podcast Reels", sourceCategory: "Reels", range: [40, 44], roles: ["edit", "multicam", "color", "sound", "graphics"], formats: ["reels", "podcast"], responsibilities: ["Мультикамерный монтаж", "Цвет", "Звук", "Графические вставки", "Субтитры"], featured: false, description: "Пять вертикальных нарезок из подкаста." },
  { id: "metro-reels", slug: "metro-gorkovskaya-reels", title: "Станция «Горьковская». Reels", sourceCategory: "Reels", range: [45, 46], roles: ["edit", "multicam"], formats: ["reels", "concert", "event"], responsibilities: ["Монтаж вертикальных версий", "Работа с мультикамерным материалом"], featured: false, description: "Две вертикальные версии концертных выступлений, собранные из мультикамерного материала." },
  { id: "yango", slug: "yango-campaign", title: "Yango. Мультиязычная кампания", client: "Yango", sourceCategory: "Reels", range: [47, 47], roles: ["edit", "color"], formats: ["commercial", "reels"], responsibilities: ["Монтаж", "Адаптации форматов", "Локальная работа с цветом"], featured: true, description: "Короткие версии рекламного ролика для нескольких языков и площадок." },
  { id: "osnova-reels", slug: "osnova-report-reels", title: "«Основа». Отчётные Reels", client: "Основа", sourceCategory: "Reels", range: [48, 52], roles: ["edit", "color", "sound", "sde"], formats: ["reels", "event"], responsibilities: ["Монтаж день в день", "Стабилизация", "Цвет", "Звук"], featured: false, description: "Пять коротких отчётных роликов с семейных и городских событий." },
  { id: "hoff-products", slug: "hoff-product-cards", title: "HOFF. Карточки товара", client: "HOFF", sourceCategory: "карточки товара", range: [53, 62], roles: ["edit", "color", "graphics", "cleanup"], formats: ["product", "commercial"], responsibilities: ["Монтаж десяти роликов", "Цвет", "Базовая инфографика", "Cleanup"], featured: true, description: "Десять роликов о механизмах и сценариях использования мебели." },
  { id: "caprigo-products", slug: "caprigo-product-catalog", title: "Caprigo. Каталог продукции", client: "Caprigo", sourceCategory: "карточки товара", range: [63, 72], roles: ["edit", "multicam", "sound"], formats: ["product", "commercial"], responsibilities: ["Мультикамерный монтаж", "Вставки", "Подстановка цветовых стиллов", "Работа со звуком"], featured: false, description: "Серия презентационных роликов для новых продуктов и печатного каталога." },
  { id: "cartier-products", slug: "cartier-product-video", title: "Cartier. Product video", client: "Cartier", sourceCategory: "карточки товара", range: [73, 74], roles: ["edit"], formats: ["product", "commercial"], responsibilities: ["Монтаж", "Работа с предоставленной музыкой"], featured: false, description: "Два продуктовых ролика Cartier. Моя работа — монтаж под предоставленную музыку." },
  { id: "showreel-site", slug: "showreel-site", title: "YELYGINN. Showreel", sourceCategory: "showreels", range: [75, 75], roles: ["edit"], formats: ["showreel"], responsibilities: ["Монтаж showreel"], featured: true, description: "Монтажный showreel для главной страницы." },
  { id: "jetlag-showreel", slug: "jetlag-showreel", title: "JetLag. Showreel", client: "JetLag", sourceCategory: "showreels", range: [76, 76], roles: ["edit"], formats: ["showreel", "commercial"], responsibilities: ["Монтаж авторской версии"], featured: false, description: "Авторская версия showreel JetLag. Моя работа — монтаж." },
  { id: "showreel-presentation", slug: "showreel-presentation", title: "Showreel 2025", sourceCategory: "showreels", range: [77, 77], roles: ["edit"], formats: ["showreel"], responsibilities: ["Монтаж презентационного showreel"], featured: false, description: "Презентационный showreel 2025. Моя работа — монтаж." },
  { id: "chistotop", slug: "chistotop-awards", title: "ЧистоТоп. СТАЛЬМАСТЕР // Берёзка", sourceCategory: "SDE / отчётные ролики", range: [78, 79], roles: ["edit"], formats: ["event"], responsibilities: ["Монтаж двух отчётных роликов"], featured: false, description: "Два отчётных ролика для СТАЛЬМАСТЕР и «Берёзки». Моя работа — монтаж." },
  { id: "osnova-trainer", slug: "osnova-trainer", title: "«Основа». Тренер", client: "Основа", sourceCategory: "SDE / отчётные ролики", range: [80, 80], roles: ["edit"], formats: ["event"], responsibilities: ["Монтаж отчётного ролика"], featured: false, description: "Отчётный ролик проекта «Основа». Моя работа — монтаж." },
  { id: "osnova-mothers-day", slug: "osnova-den-materi", title: "«Основа». День матери", client: "Основа", sourceCategory: "SDE / отчётные ролики", range: [81, 81], roles: ["edit"], formats: ["event"], responsibilities: ["Монтаж отчётного ролика"], featured: false, description: "Отчётный ролик ко Дню матери. Моя работа — монтаж." },
  { id: "small-homeland", slug: "forum-malaya-rodina", title: "Форум «Малая Родина»", sourceCategory: "SDE / отчётные ролики", range: [82, 82], roles: ["camera", "operator", "edit", "color", "sound", "sde"], formats: ["event", "broadcast"], responsibilities: ["Съёмка в составе операторской группы", "Монтаж день в день", "Цвет", "Звук", "Саунд-дизайн", "Стабилизация"], featured: true, description: "Двухминутный SDE-фильм, показанный на большом экране в финале форума." },
  { id: "skrf-hockey", slug: "skrf-hockey", title: "Хоккейный турнир СК РФ", sourceCategory: "SDE / отчётные ролики", range: [83, 83], roles: ["camera", "operator", "edit", "color", "sound", "sde"], formats: ["event", "reels"], responsibilities: ["Съёмка открытия и закрытия", "Монтаж", "Стабилизация", "Цвет", "Звук", "SDE-версии"], featured: true, description: "Отчётный фильм о трёхдневном хоккейном турнире на площадке «Горькое море»." },
  { id: "bath-fest", slug: "banya-fest", title: "Баня Фест", sourceCategory: "SDE / отчётные ролики", range: [84, 84], roles: ["edit", "color", "sound"], formats: ["event"], responsibilities: ["Монтаж", "Интервью-вставки", "Сведение камер по цвету", "Звук"], featured: false, description: "Отчётный ролик события с интервью-вставками. Я сделал монтаж, свёл камеры по цвету и работал со звуком." },
  { id: "yango-arabic", slug: "yango-arabic-15", title: "Yango. Арабская версия 15 секунд", client: "Yango", sourceCategory: "презентационные", range: [85, 85], roles: ["edit", "color"], formats: ["commercial", "presentation"], responsibilities: ["Монтаж", "Адаптация версии", "Локальная работа с цветом"], featured: false, description: "Пятнадцатисекундная арабская версия ролика Yango. Я сделал монтаж, адаптацию и локальную работу с цветом." },
  { id: "teraflex", slug: "teraflex-presentation", title: "Teraflex. Презентация", client: "Teraflex", sourceCategory: "презентационные", range: [86, 86], roles: ["edit", "graphics"], formats: ["presentation", "commercial"], responsibilities: ["Тритмент", "Черновой и чистовой монтаж", "Черновая инфографика", "Анимирование раскадровок", "Черновая нейроозвучка"], featured: true, description: "Презентационный ролик для инвесторов, собранный поэтапно от тритмента до чистового монтажа." },
  { id: "caprigo-presentation", slug: "caprigo-presentation", title: "Caprigo. Презентация производства", client: "Caprigo", sourceCategory: "презентационные", range: [87, 87], roles: ["edit", "color", "sound"], formats: ["presentation", "product", "commercial"], responsibilities: ["Монтаж", "Цвет", "Звук"], featured: true, description: "Презентационное видео о производстве Caprigo. Я сделал монтаж, цвет и звук." },
  { id: "korona-factory", slug: "korona-production", title: "KORONA. Производство", client: "KORONA", sourceCategory: "заводы / производства", range: [88, 88], roles: ["edit", "color", "graphics"], formats: ["factory", "presentation", "commercial"], responsibilities: ["Монтаж", "Цвет", "Подбор музыки", "Поиск визуальной концепции", "Инфографика"], featured: true, description: "Презентационное видео о производстве сельскохозяйственной техники." },
  { id: "gorky-war", slug: "gorky-v-teni-voyny", title: "Горький в тени войны", sourceCategory: "спектакли", range: [89, 89], roles: ["operator", "edit", "multicam", "color", "sound"], formats: ["theatre", "event", "broadcast"], responsibilities: ["Оператор", "Режиссура монтажа", "Мультикамерный монтаж", "Цвет", "Работа со звуком", "Интеграция готовых титров и логотипов"], featured: true, description: "Мультикамерная запись спектакля в Нижегородском театре юного зрителя." },
] as const;

const idsForRange = ([start, end]: readonly [number, number]) =>
  CANONICAL_ASSET_ROWS.slice(start - 1, end).map(([id]) => id);

export const projects: Project[] = seeds.map(({ range, evidenceNote, assetTitles: _assetTitles, ...seed }) => ({
  ...seed,
  videos: idsForRange(range),
  evidence: {
    status: "SOURCE_CONFIRMED",
    source: "транскрибация с описанием проекта.docx",
    note: evidenceNote,
  },
}));

const projectForOrder = (sourceOrder: number) => {
  const seed = seeds.find(({ range }) => sourceOrder >= range[0] && sourceOrder <= range[1]);
  if (!seed) throw new Error(`No project mapping for source asset ${sourceOrder}`);
  return seed;
};

export const workAssets: WorkAsset[] = CANONICAL_ASSET_ROWS.map(([kinescopeId, orientation], index) => {
  const sourceOrder = index + 1;
  const seed = projectForOrder(sourceOrder);
  const titleIndex = sourceOrder - seed.range[0];
  return {
    kinescopeId,
    projectId: seed.id,
    title: seed.assetTitles?.[titleIndex],
    orientation,
    sourceOrder,
    featured: seed.featured && titleIndex === 0,
  };
});

export const projectById = new Map(projects.map((project) => [project.id, project]));
export const projectBySlug = new Map(projects.map((project) => [project.slug, project]));
export const assetById = new Map(workAssets.map((asset) => [asset.kinescopeId, asset]));
export const HERO_SHOWREEL_ID = "hCJmSvmN6S7P8uAnexguQ5";

export const CATEGORY_META: Record<PortfolioCategory, { label: string; title: string; description: string }> = {
  camera: { label: "CAMERA", title: "Операторская работа", description: "Проекты, где источник прямо подтверждает работу Юрия с камерой или в операторской группе." },
  commercial: { label: "COMMERCIAL", title: "Коммерческие проекты", description: "Продуктовые, рекламные и презентационные видео для брендов и бизнеса." },
  events: { label: "EVENTS", title: "События и SDE", description: "Отчётные фильмы, форумы, турниры и материалы, собранные в темпе события." },
  reels: { label: "REELS", title: "Вертикальные работы", description: "Четырнадцать работ в честном формате 9:16: подкасты, события и рекламные адаптации." },
  concerts: { label: "CONCERTS", title: "Концерты", description: "Live-выступления и мультикамерный концертный монтаж." },
  interviews: { label: "INTERVIEWS", title: "Интервью и спецпроекты", description: "Интервью, образовательные циклы и подкастовые форматы." },
  post: { label: "POST", title: "Монтаж и постпродакшн", description: "Проекты с подтверждённой работой в монтаже, мультикаме, графике, звуке или cleanup." },
  color: { label: "COLOR", title: "Цвет", description: "Работы, где цветокоррекция указана в исходной транскрипции." },
  broadcast: { label: "ПРЯМАЯ ТРАНСЛЯЦИЯ", title: "Прямая трансляция", description: "Операторская работа в команде прямого эфира, мультикамерная запись и последующий монтаж." },
  product: { label: "PRODUCT", title: "Продуктовое видео", description: "Каталоги, карточки товара, производство и обучающие ролики о продукте." },
};

export const projectMatchesCategory = (project: Project, category: PortfolioCategory) => {
  if (category === "camera") return project.roles.includes("camera") || project.roles.includes("operator");
  if (category === "commercial") return project.formats.includes("commercial") || project.formats.includes("presentation");
  if (category === "events") return project.formats.includes("event");
  if (category === "reels") return project.formats.includes("reels");
  if (category === "concerts") return project.formats.includes("concert");
  if (category === "interviews") return project.formats.includes("interview") || project.formats.includes("podcast");
  if (category === "post") return project.roles.some((role) => ["edit", "multicam", "sound", "graphics", "cleanup"].includes(role));
  if (category === "color") return project.roles.includes("color");
  if (category === "broadcast") return project.formats.includes("broadcast") || project.roles.includes("multicam");
  return project.formats.includes("product") || project.formats.includes("factory");
};

export const projectsForCategory = (category: PortfolioCategory) => projects.filter((project) => projectMatchesCategory(project, category));
export const assetsForProject = (projectId: string) => workAssets.filter((asset) => asset.projectId === projectId);
export const featuredProjects = projects.filter((project) => project.featured);
const localPosterFallbacks = new Map<string, string>([
  ["g7DBRUGGfASR1yy1FQs6PT", "oesfViYTJW9KWuKo4rpFxq"],
  ["xmf2EeT1FwDVkDkXdGxNQL", "a5xv428qM8GECjN197KwFx"],
  ["g5pJM7qcHVkTbYPXTaCH3K", "a5xv428qM8GECjN197KwFx"],
  ["0crzkasYwqB4Cj38ENVwB5", "a5xv428qM8GECjN197KwFx"],
  ["wtTajGdgsEbFNiX1xRgSQA", "a5xv428qM8GECjN197KwFx"],
  ["mSLvtLmWtKqmoKv2ZEFDRw", "a5xv428qM8GECjN197KwFx"],
  ["rngUwnkJTVBYbpGq5n21Cz", "a5xv428qM8GECjN197KwFx"],
  ["9ht9mkhieHTeXxTfsf2G3A", "a5xv428qM8GECjN197KwFx"],
  ["mpqLXFwhtkk2PJ1ZUdfUxi", "a5xv428qM8GECjN197KwFx"],
  ["ehhp5HCGM22bw9eBbtSw85", "a5xv428qM8GECjN197KwFx"],
  ["7Wp7zYWRmNBA35cMfwwUEv", "bcowrcjUyKEj4dUjVzHpMZ"],
  ["7ogaE7JkjcrssGue1Qu23o", "8qEST8SWM183EP5MDYukbw"],
]);
export const posterUrl = (id: string, size: "sm" | "md" | "lg" = "md") => {
  const localId = localPosterFallbacks.get(id) || id;
  return `/v3-assets/posters/${localId}${size === "sm" ? "-sm" : ""}.webp`;
};
