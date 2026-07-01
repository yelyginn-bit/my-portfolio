export type PortfolioCategory = "reels" | "events" | "concerts" | "photo" | "editing";

export type PortfolioTag =
  | PortfolioCategory
  | "advertising"
  | "marketplace"
  | "iphone";

export type PortfolioMediaType = "video" | "photo";

export interface PortfolioItem {
  id: string;
  title: string;
  category: PortfolioCategory;
  client: string;
  year: string;
  description: string;
  services: string[];
  mediaType: PortfolioMediaType;
  thumbnail: string;
  videoUrl: string;
  projectUrl: string;
  tags: PortfolioTag[];
  featured: boolean;
  vertical?: boolean;
}

export interface PortfolioCategoryPage {
  slug: PortfolioCategory;
  navLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  ctaLabel: string;
  relatedHref: string;
  relatedLabel: string;
}

type VideoItemInput = Omit<
  PortfolioItem,
  "mediaType" | "thumbnail" | "videoUrl" | "projectUrl" | "year"
> & {
  year?: string;
};

const videoItem = (input: VideoItemInput): PortfolioItem => ({
  ...input,
  year: input.year ?? "",
  mediaType: "video",
  thumbnail: "",
  videoUrl: `https://kinescope.io/embed/${input.id}`,
  projectUrl: `/project?id=${encodeURIComponent(input.id)}`,
});

export const PORTFOLIO_CATEGORY_PAGES: Record<PortfolioCategory, PortfolioCategoryPage> = {
  reels: {
    slug: "reels",
    navLabel: "Reels",
    eyebrow: "Вертикальный контент",
    title: "Портфолио Reels / Shorts",
    subtitle:
      "Вертикальные ролики для бизнеса, экспертов, брендов и соцсетей: съёмка, монтаж, цвет, звук и субтитры.",
    intro:
      "Короткий формат требует точного входа в тему, ясной структуры и темпа. Здесь собраны серии роликов, адаптированные под мобильный просмотр.",
    ctaLabel: "Хочу такие Reels для проекта",
    relatedHref: "/reels",
    relatedLabel: "Услуга Reels для бизнеса",
  },
  events: {
    slug: "events",
    navLabel: "Мероприятия",
    eyebrow: "Event / репортаж",
    title: "Event-видео и съёмка мероприятий",
    subtitle:
      "Видео с мероприятий, корпоративов, форумов, презентаций и городских событий.",
    intro:
      "Собираю атмосферу события в цельную историю: общие планы, детали, эмоции участников, ключевые выступления и материал для коротких публикаций.",
    ctaLabel: "Обсудить дату мероприятия",
    relatedHref: "/event-video",
    relatedLabel: "Видеограф на мероприятие",
  },
  concerts: {
    slug: "concerts",
    navLabel: "Концерты",
    eyebrow: "Live / music",
    title: "Съёмка концертов и live-выступлений",
    subtitle:
      "Видео для артистов, площадок, организаторов и промо мероприятий.",
    intro:
      "В концертном видео важны ритм, свет, сцена, звук и реакция зала. Материал собирается так, чтобы сохранить энергию живого выступления.",
    ctaLabel: "Обсудить съёмку концерта",
    relatedHref: "/portfolio/events",
    relatedLabel: "Все event-работы",
  },
  photo: {
    slug: "photo",
    navLabel: "Фото",
    eyebrow: "Photo",
    title: "Фотопортфолио",
    subtitle:
      "Фото для бизнеса, мероприятий, соцсетей, портретов и визуальной упаковки.",
    intro:
      "Фотосъёмка дополняет видео и помогает собрать единый комплект материалов для сайта, рекламы и социальных сетей.",
    ctaLabel: "Запланировать фотосъёмку",
    relatedHref: "/photo",
    relatedLabel: "Подробнее о фотосъёмке",
  },
  editing: {
    slug: "editing",
    navLabel: "Монтаж",
    eyebrow: "Post-production",
    title: "Портфолио монтажа",
    subtitle:
      "Монтаж Reels, Shorts, рекламных роликов, интервью, event-видео и контента для бизнеса.",
    intro:
      "Работаю со структурой, ритмом, цветом, звуком, субтитрами и адаптацией материала под разные площадки.",
    ctaLabel: "Отправить материал на монтаж",
    relatedHref: "/calculator",
    relatedLabel: "Рассчитать монтаж",
  },
};

export const PORTFOLIO_CATEGORIES = Object.values(PORTFOLIO_CATEGORY_PAGES);

export const portfolioItems: PortfolioItem[] = [
  videoItem({
    id: "deV36JQbK25yhFKf2zHs3G",
    title: "Станция Метро «Горьковская»",
    category: "concerts",
    client: "Станция Метро «Горьковская»",
    description: "Выжимка лучших моментов с открытия ночного летнего концерта.",
    services: ["Мультикамерный монтаж", "Цвет", "Звук"],
    tags: ["concerts", "events", "editing"],
    featured: true,
  }),
  videoItem({
    id: "wrf4URJ9Q7P7g5B1SZ5A7W",
    title: "SBER.архитектура",
    category: "editing",
    client: "СберУниверситет",
    description: "Серия обучающего курса по архитектуре для СберУниверситета.",
    services: ["Мультикамерный монтаж", "Графика", "Цвет", "Звук"],
    tags: ["editing"],
    featured: true,
  }),
  videoItem({
    id: "6kMP6pfn8UtNRXS8eYfjPc",
    title: "Caprigo, презентационный ролик",
    category: "editing",
    client: "Caprigo",
    description: "Презентационное видео новой коллекции бренда Caprigo.",
    services: ["Монтаж", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising", "marketplace"],
    featured: true,
  }),
  videoItem({
    id: "hyQindossxyWZfRxLuDacu",
    title: "KORONA",
    category: "editing",
    client: "KORONA",
    description: "Видео о работе производства и процессе на производственной линии.",
    services: ["Съёмка", "Монтаж", "Цвет", "Звук"],
    tags: ["editing", "advertising"],
    featured: true,
  }),
  videoItem({
    id: "txm4qz7vRPifxz3MPbzu1V",
    title: "Хоккей СК РФ",
    category: "events",
    client: "СК РФ",
    description: "Видео-отчёт об открытии хоккейного чемпионата.",
    services: ["Съёмка", "Мультикамерный монтаж", "Цвет", "Звук"],
    tags: ["events", "editing"],
    featured: true,
  }),
  videoItem({
    id: "51pL5GtYFvJB1f9Nf52HHN",
    title: "Женщины СИБУРа",
    category: "editing",
    client: "СИБУР",
    description: "Интервью-проект, где монтаж и камера поддерживают историю героинь.",
    services: ["Мультикамерный монтаж", "Субтитры", "Цвет", "Звук"],
    tags: ["editing", "advertising"],
    featured: true,
  }),
  videoItem({
    id: "6j8wPfXv6Keka6JTCoiwUC",
    title: "Тизер клипа «Хорошо»",
    category: "concerts",
    client: "Музыкальный проект",
    description: "Динамичный тизер для музыкального клипа.",
    services: ["Монтаж", "Speed ramp", "Цвет"],
    tags: ["concerts", "editing", "advertising"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "fvxndmGGHqWtuCcK5TnB4j",
    title: "СИБУР, тизер",
    category: "editing",
    client: "СИБУР",
    description: "Короткая версия интервью-проекта для коммуникации в социальных сетях.",
    services: ["Монтаж", "Субтитры", "Цвет", "Звук"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "0u1FpHDHxFSsWdWJX3HcXn",
    title: "SBER.архитектура, тизер",
    category: "editing",
    client: "СберУниверситет",
    description: "Короткая версия образовательного проекта об архитектуре.",
    services: ["Монтаж", "Графика", "Цвет", "Звук"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "66ZCTTLVXKieRDjSn2vAYp",
    title: "Обучающий Caprigo",
    category: "editing",
    client: "Caprigo",
    description: "Обучающее видео по работе в системе «Базис».",
    services: ["Мультикамерный монтаж", "Анимация", "Цвет", "Звук"],
    tags: ["editing"],
    featured: false,
  }),
  videoItem({
    id: "oVqtn1J5sip4R8aNBMY1mi",
    title: "Фильтры Барьер",
    category: "editing",
    client: "БАРЬЕР",
    description: "Видео-инструкция по замене фильтров для воды.",
    services: ["Монтаж", "Анимация", "Трекинг текста", "Звук"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "ibJsptvZeqt8fe3BBdXvQm",
    title: "Become Legendary, Майами",
    category: "editing",
    client: "Become Legendary",
    description: "Видео элитной недвижимости с акцентом на архитектуру и масштаб.",
    services: ["Монтаж", "Speed ramp", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "7UV55F6RMQseCjQ1fyRTtd",
    title: "Become Legendary, LA",
    category: "editing",
    client: "Become Legendary",
    description: "Архитектурное видео объекта в Лос-Анджелесе.",
    services: ["Монтаж", "Speed ramp", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "kXnZpxvucX5VKdytAgUAW8",
    title: "Become Legendary, Palm Ave 2201",
    category: "editing",
    client: "Become Legendary",
    description: "Видео недвижимости, собранное из кадров с камер и дрона.",
    services: ["Монтаж", "Speed ramp", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "o8r8qjE3fzudh7MGUruDFv",
    title: "Become Legendary, Palm Ave 2141",
    category: "editing",
    client: "Become Legendary",
    description: "Видеообзор объекта с акцентом на форму, детали и пространство.",
    services: ["Монтаж", "Speed ramp", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "2GgtwiWuq6XaS3yeXbWhRq",
    title: "Стас Еговцев × TERRA, ролик 1",
    category: "reels",
    client: "TERRA",
    description: "Вертикальная выжимка из видеоподкаста.",
    services: ["Монтаж", "Субтитры", "Цвет", "Звук"],
    tags: ["reels", "editing"],
    featured: true,
    vertical: true,
  }),
  videoItem({
    id: "pskL2K5zWzBGMuUH8ZaG6P",
    title: "Стас Еговцев × TERRA, ролик 2",
    category: "reels",
    client: "TERRA",
    description: "Короткий ролик с ключевым фрагментом подкаста.",
    services: ["Монтаж", "Субтитры", "Цвет", "Звук"],
    tags: ["reels", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "eartRu9igpoxXbUHgATyyt",
    title: "Стас Еговцев × TERRA, ролик 3",
    category: "reels",
    client: "TERRA",
    description: "Вертикальная адаптация разговора для социальных сетей.",
    services: ["Монтаж", "Субтитры", "Цвет", "Звук"],
    tags: ["reels", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "8uVYyar3L9cBPV1DmiWcau",
    title: "Стас Еговцев × TERRA, ролик 4",
    category: "reels",
    client: "TERRA",
    description: "Короткий ролик с главными инсайтами из подкаста.",
    services: ["Монтаж", "Субтитры", "Цвет", "Звук"],
    tags: ["reels", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "d89ft31rBLhd7XMdSFrAFz",
    title: "Стас Еговцев × TERRA, ролик 5",
    category: "reels",
    client: "TERRA",
    description: "Серия вертикальных роликов из многокамерной записи.",
    services: ["Монтаж", "Субтитры", "Цвет", "Звук"],
    tags: ["reels", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "wMPCVrj945ds61B4xJK6y2",
    title: "Метро «Горьковская» — CAMZNAEW",
    category: "concerts",
    client: "Станция Метро «Горьковская»",
    description: "Фрагменты ночного live-выступления артиста CAMZNAEW.",
    services: ["Мультикамерный монтаж", "Цвет", "Звук"],
    tags: ["concerts", "reels", "editing"],
    featured: true,
    vertical: true,
  }),
  videoItem({
    id: "g6XBdsRfBr9QK7B31jH3zG",
    title: "Метро «Горьковская» — Слава КПСС",
    category: "concerts",
    client: "Станция Метро «Горьковская»",
    description: "Вертикальная live-нарезка ночного концерта.",
    services: ["Мультикамерный монтаж", "Цвет", "Звук"],
    tags: ["concerts", "reels", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "0e6mxyEoYRosiGzuBzBdwb",
    title: "YANGO",
    category: "reels",
    client: "YANGO",
    description: "Вертикальная версия рекламного ролика для сети такси в Дубае.",
    services: ["Монтаж", "Адаптация форматов", "Локализация"],
    tags: ["reels", "editing", "advertising"],
    featured: true,
    vertical: true,
  }),
  videoItem({
    id: "4r4pXusToooZ4BT8a9935e",
    title: "Йога, День матери — ролик 1",
    category: "reels",
    client: "Городское мероприятие",
    description: "Короткий видео-отчёт о мероприятии ко Дню матери.",
    services: ["Монтаж", "Цвет", "Звук"],
    tags: ["reels", "events", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "fhCvj9nTWMH7puFcUWpai6",
    title: "Йога, День матери — ролик 2",
    category: "reels",
    client: "Городское мероприятие",
    description: "Вертикальная нарезка с основными моментами события.",
    services: ["Монтаж", "Цвет", "Звук"],
    tags: ["reels", "events", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "th8PWjmJNUatY2cjGUdkcc",
    title: "Хоккей, День отца — ролик 1",
    category: "reels",
    client: "Городское мероприятие",
    description: "Динамичный вертикальный отчёт о праздничном мероприятии.",
    services: ["Монтаж", "Цвет", "Звук"],
    tags: ["reels", "events", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "wEH2Y96QsApXLDDAkzrRZQ",
    title: "Хоккей, День отца — ролик 2",
    category: "reels",
    client: "Городское мероприятие",
    description: "Короткая событийная нарезка для социальных сетей.",
    services: ["Монтаж", "Цвет", "Звук"],
    tags: ["reels", "events", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "kpP6XYJnC5wDt5vNMAJU3J",
    title: "Хоккей, День отца — ролик 3",
    category: "reels",
    client: "Городское мероприятие",
    description: "Финальный ролик серии о спортивном событии.",
    services: ["Монтаж", "Цвет", "Звук"],
    tags: ["reels", "events", "editing"],
    featured: false,
    vertical: true,
  }),
  videoItem({
    id: "kHKEqxTtZ19gB3S7vNRCsT",
    title: "Пилот Медиа",
    category: "reels",
    client: "Пилот Медиа",
    description: "Короткое видео для обновления визуальной подачи профиля.",
    services: ["Сценарий", "Съёмка", "Монтаж", "Цвет", "Звук"],
    tags: ["reels", "editing", "advertising"],
    featured: true,
    vertical: true,
  }),
  videoItem({
    id: "vFFSNV1fcvUEAPjk5gGMV7",
    title: "HOFF — механизм «Книжка»",
    category: "editing",
    client: "HOFF",
    description: "Продуктовое видео о механизме раскладывания дивана.",
    services: ["Монтаж", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising", "marketplace"],
    featured: false,
  }),
  videoItem({
    id: "arCgJWNsD245SvtkZ4FVAL",
    title: "HOFF — механизм «Аккордеон»",
    category: "editing",
    client: "HOFF",
    description: "Продуктовое видео о механизме раскладывания дивана.",
    services: ["Монтаж", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising", "marketplace"],
    featured: false,
  }),
  videoItem({
    id: "6cL2AVoFUHmKCTZSbXsNWR",
    title: "Caprigo — раковины",
    category: "editing",
    client: "Caprigo",
    description: "Рекламный ролик новой коллекции раковин.",
    services: ["Монтаж", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising", "marketplace"],
    featured: false,
  }),
  videoItem({
    id: "ebBJHKSLagRdp7HoKkZ6E8",
    title: "Caprigo — мебель",
    category: "editing",
    client: "Caprigo",
    description: "Рекламный ролик коллекции мебели.",
    services: ["Монтаж", "Цвет", "Ретушь видео"],
    tags: ["editing", "advertising", "marketplace"],
    featured: false,
  }),
  videoItem({
    id: "bcowrcjUyKEj4dUjVzHpMZ",
    title: "Cartier, Men's Collection 1",
    category: "editing",
    client: "Cartier",
    description: "Видео новой мужской коллекции украшений.",
    services: ["Оперативный монтаж", "Цвет"],
    tags: ["editing", "advertising", "marketplace"],
    featured: false,
  }),
  videoItem({
    id: "7Wp7zYWRmNBA35cMfwwUEv",
    title: "Cartier, Men's Collection 2",
    category: "editing",
    client: "Cartier",
    description: "Вторая версия видео мужской коллекции.",
    services: ["Оперативный монтаж", "Цвет"],
    tags: ["editing", "advertising", "marketplace"],
    featured: false,
  }),
  videoItem({
    id: "9sZonV2HK653PfPqxqdGbH",
    title: "Тренировка, День спорта",
    category: "events",
    client: "Городское мероприятие",
    description: "Видео-отчёт о спортивном празднике.",
    services: ["Монтаж", "Цвет", "Звук"],
    tags: ["events", "editing"],
    featured: false,
  }),
  videoItem({
    id: "o1R5MSC6VZDRYGdvkejSkN",
    title: "Йога, День матери",
    category: "events",
    client: "Городское мероприятие",
    description: "Видео-отчёт о мероприятии в честь Дня матери.",
    services: ["Монтаж", "Цвет", "Звук"],
    tags: ["events", "editing"],
    featured: false,
  }),
  videoItem({
    id: "7cXtKnBp5idm5iTAgDFKEN",
    title: "Форум «Малая Родина»",
    category: "events",
    client: "Малая Родина",
    description: "Видео-отчёт о событиях форума «Малая Родина — сила России».",
    services: ["Оперативный монтаж", "Мультикамерная сборка", "Цвет"],
    tags: ["events", "editing"],
    featured: true,
  }),
  videoItem({
    id: "cA7pGxKbCP8XFNYUjNSbpr",
    title: "Баня FEST",
    category: "events",
    client: "Баня FEST",
    description: "Видео-отчёт о самых ярких моментах фестиваля.",
    services: ["Оперативный монтаж", "Цвет", "Дрон"],
    tags: ["events", "editing"],
    featured: true,
  }),
  videoItem({
    id: "mLGNoFi4cj3vAdBrqrsdtP",
    title: "YANGO, презентационный ролик",
    category: "editing",
    client: "YANGO",
    description: "Рекламный ролик для сети такси в Дубае.",
    services: ["Монтаж", "Адаптация форматов", "Локализация"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
  videoItem({
    id: "7MmmoQkeKtLJFA3aqZGToF",
    title: "THERAFLEX",
    category: "editing",
    client: "THERAFLEX",
    description: "Предварительная сборка презентационного видео.",
    services: ["Черновой монтаж", "Подготовка структуры"],
    tags: ["editing", "advertising"],
    featured: false,
  }),
];

export const getPortfolioItems = (category: PortfolioCategory) =>
  portfolioItems.filter((item) => item.tags.includes(category));

export const featuredPortfolioItems = portfolioItems.filter((item) => item.featured);

export interface HomePortfolioProject {
  title: string;
  embedId: string;
  size: string;
  ratio: string;
}

export interface HomePortfolioGroup {
  category: string;
  projects: HomePortfolioProject[];
}

const portfolioById = new Map(portfolioItems.map((item) => [item.id, item]));

const homeProject = (
  embedId: string,
  title: string,
  size: string,
  ratio = "56.25%",
): HomePortfolioProject => {
  if (!portfolioById.has(embedId)) {
    throw new Error(`Unknown portfolio item: ${embedId}`);
  }
  return { title, embedId, size, ratio };
};

export const HOME_PORTFOLIO_DATA: HomePortfolioGroup[] = [
  {
    category: "Избранные кейсы",
    projects: [
      homeProject("deV36JQbK25yhFKf2zHs3G", "Метро Горьковская", "2x2"),
      homeProject("wrf4URJ9Q7P7g5B1SZ5A7W", "Университет Сбера", "2x1"),
      homeProject("6kMP6pfn8UtNRXS8eYfjPc", "Caprigo Презентация", "1x1"),
      homeProject("hyQindossxyWZfRxLuDacu", "Корона", "1x1"),
      homeProject("txm4qz7vRPifxz3MPbzu1V", "Хоккей СК РФ", "2x1"),
      homeProject("51pL5GtYFvJB1f9Nf52HHN", "Женщины СИБУРа", "1x1"),
    ],
  },
  {
    category: "Event и концерты",
    projects: [homeProject("deV36JQbK25yhFKf2zHs3G", "Метро Горьковская", "2x2")],
  },
  {
    category: "Интервью и подкасты",
    projects: [
      homeProject("wrf4URJ9Q7P7g5B1SZ5A7W", "Сбер. Архитектура", "2x1"),
      homeProject("51pL5GtYFvJB1f9Nf52HHN", "Женщины СИБУРа", "2x1"),
    ],
  },
  {
    category: "Рекламные тизеры",
    projects: [
      homeProject("6j8wPfXv6Keka6JTCoiwUC", "Тизер клипа «хорошо»", "1x2", "177.78%"),
      homeProject("fvxndmGGHqWtuCcK5TnB4j", "Женщины СИБУРа", "2x1"),
      homeProject("0u1FpHDHxFSsWdWJX3HcXn", "Сбер. Архитектура", "1x1"),
    ],
  },
  {
    category: "Обучающие видео",
    projects: [
      homeProject("66ZCTTLVXKieRDjSn2vAYp", "Caprigo", "2x1"),
      homeProject("oVqtn1J5sip4R8aNBMY1mi", "BARYER", "1x1"),
    ],
  },
  {
    category: "Архитектура и интерьеры",
    projects: [
      homeProject("ibJsptvZeqt8fe3BBdXvQm", "Архитектура 1", "2x1"),
      homeProject("7UV55F6RMQseCjQ1fyRTtd", "Архитектура 2", "1x1"),
      homeProject("kXnZpxvucX5VKdytAgUAW8", "Архитектура 3", "1x1"),
      homeProject("o8r8qjE3fzudh7MGUruDFv", "Архитектура 4", "2x1"),
    ],
  },
  {
    category: "Reels для бизнеса",
    projects: [
      homeProject("2GgtwiWuq6XaS3yeXbWhRq", "Подкаст 1", "1x2", "177.78%"),
      homeProject("pskL2K5zWzBGMuUH8ZaG6P", "Подкаст 2", "1x2", "177.78%"),
      homeProject("eartRu9igpoxXbUHgATyyt", "Подкаст 3", "1x2", "177.78%"),
      homeProject("8uVYyar3L9cBPV1DmiWcau", "Подкаст 4", "1x2", "177.78%"),
      homeProject("d89ft31rBLhd7XMdSFrAFz", "Подкаст 5", "1x2", "177.78%"),
      homeProject("wMPCVrj945ds61B4xJK6y2", "Метро 1", "1x2", "177.78%"),
      homeProject("g6XBdsRfBr9QK7B31jH3zG", "Метро 2", "1x2", "177.78%"),
      homeProject("0e6mxyEoYRosiGzuBzBdwb", "YANGO", "1x2", "177.78%"),
      homeProject("4r4pXusToooZ4BT8a9935e", "Йога 1", "1x2", "177.78%"),
      homeProject("fhCvj9nTWMH7puFcUWpai6", "Йога 2", "1x2", "177.78%"),
      homeProject("th8PWjmJNUatY2cjGUdkcc", "Хоккей 1", "1x2", "177.78%"),
      homeProject("wEH2Y96QsApXLDDAkzrRZQ", "Хоккей 2", "1x2", "177.78%"),
      homeProject("kpP6XYJnC5wDt5vNMAJU3J", "Хоккей 3", "1x2", "177.78%"),
      homeProject("kHKEqxTtZ19gB3S7vNRCsT", "СММ", "1x2", "177.78%"),
    ],
  },
  {
    category: "Съёмка товаров",
    projects: [
      homeProject("vFFSNV1fcvUEAPjk5gGMV7", "HOFF 1", "2x1"),
      homeProject("arCgJWNsD245SvtkZ4FVAL", "HOFF 2", "1x1"),
      homeProject("6cL2AVoFUHmKCTZSbXsNWR", "Caprigo 1", "1x1"),
      homeProject("ebBJHKSLagRdp7HoKkZ6E8", "Caprigo 2", "2x1"),
      homeProject("bcowrcjUyKEj4dUjVzHpMZ", "Cartier 1", "1x1"),
      homeProject("7Wp7zYWRmNBA35cMfwwUEv", "Cartier 2", "1x1"),
    ],
  },
  {
    category: "Event-отчёты",
    projects: [
      homeProject("9sZonV2HK653PfPqxqdGbH", "Тренировка Основа", "2x1"),
      homeProject("o1R5MSC6VZDRYGdvkejSkN", "Йога", "1x1"),
      homeProject("7cXtKnBp5idm5iTAgDFKEN", "Форум Малая Родина", "2x1"),
      homeProject("txm4qz7vRPifxz3MPbzu1V", "Хоккей СК РФ", "1x1"),
      homeProject("cA7pGxKbCP8XFNYUjNSbpr", "Баня FEST", "2x1"),
    ],
  },
  {
    category: "Презентационные видео",
    projects: [
      homeProject("mLGNoFi4cj3vAdBrqrsdtP", "YANGO", "2x1"),
      homeProject("7MmmoQkeKtLJFA3aqZGToF", "THERAFLEX", "1x1"),
      homeProject("6kMP6pfn8UtNRXS8eYfjPc", "Caprigo", "2x1"),
    ],
  },
  {
    category: "Промышленная видеосъёмка",
    projects: [homeProject("hyQindossxyWZfRxLuDacu", "KORONA", "2x2")],
  },
];
