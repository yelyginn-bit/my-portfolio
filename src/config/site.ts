import { PUBLIC_PRICE_BY_ID } from "../lib/pricing.data";

export const SITE = {
  brand: "YELYGINN",
  owner: "Юрий Елыгин",
  location: "Нижний Новгород",
  regionLabel: "Нижний Новгород // Россия",
  email: "y.elyginn@gmail.com",
  telegram: "@YuriElygin",
  telegramUrl: "https://t.me/YuriElygin",
} as const;

export type ServiceId =
  | "advertising"
  | "reels"
  | "events"
  | "editing"
  | "youtube"
  | "photo"
  | "content-day"
  | "marketplace";

export type ServiceSummary = {
  id: ServiceId;
  title: string;
  description: string;
  price: string;
  href: string;
  portfolioHref: string;
  mediaId: string;
  featured?: boolean;
};

export const SERVICE_SUMMARIES: ServiceSummary[] = [
  {
    id: "advertising",
    title: "Рекламные ролики",
    description: "Концепция, съёмка и постпродакшн для брендов и продуктов.",
    price: PUBLIC_PRICE_BY_ID.advertising.price,
    href: "/reklamnye-roliki",
    portfolioHref: "/portfolio",
    mediaId: "6kMP6pfn8UtNRXS8eYfjPc",
    featured: true,
  },
  {
    id: "reels",
    title: "Reels для бизнеса",
    description: "Вертикальные серии: от идеи и съёмки до готовых публикаций.",
    price: PUBLIC_PRICE_BY_ID["reels-package"].price,
    href: "/reels",
    portfolioHref: "/portfolio/reels",
    mediaId: "0e6mxyEoYRosiGzuBzBdwb",
    featured: true,
  },
  {
    id: "events",
    title: "Event-видео",
    description: "Репортаж, aftermovie и короткие версии в ритме события.",
    price: PUBLIC_PRICE_BY_ID.event.price,
    href: "/event-video",
    portfolioHref: "/portfolio/events",
    mediaId: "cA7pGxKbCP8XFNYUjNSbpr",
    featured: true,
  },
  {
    id: "editing",
    title: "Монтаж",
    description: "Структура, ритм, цвет, звук и адаптация под площадки.",
    price: PUBLIC_PRICE_BY_ID["editing-reels"].price,
    href: "/portfolio/post",
    portfolioHref: "/portfolio/post",
    mediaId: "wrf4URJ9Q7P7g5B1SZ5A7W",
  },
  {
    id: "youtube",
    title: "YouTube",
    description: "Монтаж выпусков, интервью и многокамерных программ.",
    price: PUBLIC_PRICE_BY_ID["editing-youtube"].price,
    href: "/portfolio/post",
    portfolioHref: "/portfolio/post",
    mediaId: "51pL5GtYFvJB1f9Nf52HHN",
  },
  {
    id: "photo",
    title: "Фотосъёмка",
    description: "Бизнес-портрет, репортаж и визуальный контент для бренда.",
    price: PUBLIC_PRICE_BY_ID.photo.price,
    href: "/photo",
    portfolioHref: "/portfolio/photo",
    mediaId: "txm4qz7vRPifxz3MPbzu1V",
  },
  {
    id: "content-day",
    title: "Контент-день",
    description: "Фото и серия коротких роликов за одну подготовленную съёмку.",
    price: PUBLIC_PRICE_BY_ID["content-day"].price,
    href: "/content-day",
    portfolioHref: "/portfolio/reels",
    mediaId: "kHKEqxTtZ19gB3S7vNRCsT",
  },
  {
    id: "marketplace",
    title: "Маркетплейсы",
    description: "Наглядное видео о товаре, особенностях и сценарии использования.",
    price: PUBLIC_PRICE_BY_ID.marketplace.price,
    href: "/video-dlya-marketpleysov",
    portfolioHref: "/portfolio",
    mediaId: "vFFSNV1fcvUEAPjk5gGMV7",
  },
];

// Консервативные публичные ориентиры; редактируются в одном месте.
export const PHOTO_METRICS = [
  { value: "5+", label: "лет коммерческой практики" },
  { value: "100+", label: "готовых фото- и видеоработ" },
  { value: "20+", label: "бизнес-направлений в съёмках" },
  { value: "3–5 дней", label: "ориентир для первого превью" },
] as const;
