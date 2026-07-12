import type { EstimateData } from "./types";

export type PublicPriceCategory = "Монтаж" | "Съёмка" | "Съёмка + монтаж" | "Регулярный контент" | "Фото" | "Маркетплейсы" | "Полный продакшн";

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
};

export const PUBLIC_PRICES: PublicPriceItem[] = [
  { id: "editing-reels", category: "Монтаж", title: "Монтаж Reels / Shorts", price: "от 5 000 ₽", description: "Один вертикальный ролик с собранной структурой и ритмом.", includes: ["Монтаж", "Базовый цвет", "Звук"], limitations: "Субтитры и сложная графика считаются по задаче.", timeline: "Обычно 3–5 рабочих дней", href: "/calculator", portfolioHref: "/portfolio/editing" },
  { id: "editing-youtube", category: "Монтаж", title: "Монтаж YouTube", price: "от 15 000 ₽", description: "Выпуск до 15 минут из подготовленного материала.", includes: ["Сборка", "Цвет", "Чистка звука"], limitations: "Мультикамера и графика рассчитываются отдельно.", timeline: "По объёму исходников", href: "/calculator", portfolioHref: "/portfolio/editing" },
  { id: "reels-block", category: "Съёмка", title: "Съёмочный блок Reels", price: "от 22 000 ₽", description: "До трёх часов организованной съёмки по готовому плану.", includes: ["Камера", "Базовый свет", "Запись звука"], limitations: "Монтаж роликов не входит.", timeline: "Одна съёмочная дата", href: "/reels", portfolioHref: "/portfolio/reels" },
  { id: "reels-package", category: "Съёмка + монтаж", title: "Пакет Reels", price: "от 35 000 ₽", description: "Подготовка, съёмка до двух часов и три готовых ролика.", includes: ["Подготовка", "Съёмка", "3 ролика"], limitations: "Дополнительные сценарии и локации — отдельно.", timeline: "Срок фиксируется после брифа", href: "/reels", portfolioHref: "/portfolio/reels", featured: true },
  { id: "event", category: "Съёмка", title: "Видеосъёмка мероприятия", price: "от 25 000 ₽", description: "Работа видеографа на событии, минимум три часа.", includes: ["Репортажная съёмка", "Камера", "Базовый звук"], limitations: "Aftermovie и экспресс-монтаж считаются отдельно.", timeline: "От одной даты", href: "/event-video", portfolioHref: "/portfolio/events" },
  { id: "photo", category: "Фото", title: "Репортажная фотосъёмка", price: "от 8 000 ₽/час", description: "События, команды и рабочие процессы для бизнеса.", includes: ["Съёмка", "Отбор", "Базовая обработка"], limitations: "Минимальный заказ — два часа.", timeline: "Срок согласуется по объёму", href: "/photo", portfolioHref: "/portfolio/photo" },
  { id: "photo-studio", category: "Фото", title: "Студийная фотосъёмка", price: "от 18 000 ₽", description: "Портретная или контентная съёмка с подготовкой и ретушью.", includes: ["Подготовка", "Съёмка до 1 часа", "Ретушь 10 кадров"], limitations: "Аренда студии и стилист оплачиваются отдельно.", timeline: "Обычно 5–7 рабочих дней", href: "/photo", portfolioHref: "/portfolio/photo" },
  { id: "content-day", category: "Регулярный контент", title: "Контент-день", price: "от 60 000 ₽", description: "Фото и серия коротких роликов за одну подготовленную съёмку.", includes: ["Подготовка", "3–4 часа съёмки", "7 Reels и фото"], limitations: "Точный объём фиксируется в смете.", timeline: "Контент на несколько недель", href: "/content-day", portfolioHref: "/portfolio/reels", featured: true },
  { id: "marketplace", category: "Маркетплейсы", title: "Видео для маркетплейса", price: "от 35 000 ₽", description: "Съёмка и монтаж одного товара с демонстрацией особенностей.", includes: ["Подготовка", "Предметная съёмка", "Монтаж"], limitations: "Модель, реквизит, локация и сложная графика — отдельно.", timeline: "После согласования сценария", href: "/video-dlya-marketpleysov", portfolioHref: "/portfolio" },
  { id: "field-video", category: "Съёмка", title: "Оператор + техника", price: "от 35 000 ₽", description: "Выездная смена с комплектом камеры, света и звука.", includes: ["Оператор", "Камера", "Базовый свет и звук"], limitations: "Логистика и дополнительная техника считаются отдельно.", timeline: "Одна съёмочная дата", href: "/calculator", portfolioHref: "/portfolio" },
  { id: "advertising", category: "Полный продакшн", title: "Рекламный ролик", price: "от 70 000 ₽", description: "Проект от концепции и подготовки до финального мастера.", includes: ["Препродакшн", "Съёмка", "Постпродакшн"], limitations: "Команда, площадка и техника зависят от задачи.", timeline: "После брифа и плана производства", href: "/reklamnye-roliki", portfolioHref: "/portfolio", featured: true },
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
      { name: "Подготовка, съёмка до 2 часов и 3 ролика", priceMin: 35000, priceMax: 50000, unit: "project" },
    ],
    options: [
      { name: "Дополнительный Reels / Shorts", priceMin: 5000, priceMax: 12000, unit: "project" },
      { name: "Субтитры и простая графика", priceMin: 2500, priceMax: 5000, unit: "project" },
      { name: "Дополнительный съёмочный блок", priceMin: 22000, priceMax: 30000, unit: "day" },
      { name: "Сложная графика или ретушь видео", priceMin: 6000, priceMax: 18000, unit: "project" },
    ],
  },
  "Монтаж Reels": {
    base: [
      { name: "Монтаж одного вертикального ролика", priceMin: 5000, priceMax: 9000, unit: "project" },
    ],
    options: [
      { name: "Субтитры и расширенный саунд-дизайн", priceMin: 2000, priceMax: 5000, unit: "project" },
      { name: "Моушн-графика", priceMin: 3500, priceMax: 10000, unit: "project" },
      { name: "Дополнительная версия под площадку", priceMin: 1500, priceMax: 3500, unit: "project" },
    ],
  },
  "Монтаж YouTube": {
    base: [
      { name: "Монтаж выпуска до 15 минут", priceMin: 15000, priceMax: 30000, unit: "project" },
    ],
    options: [
      { name: "Расширенная чистка звука и цветокоррекция", priceMin: 4000, priceMax: 9000, unit: "project" },
      { name: "Мультикамерный монтаж", priceMin: 6000, priceMax: 15000, unit: "project" },
      { name: "Графика, вставки и экранные подписи", priceMin: 5000, priceMax: 18000, unit: "project" },
      { name: "Нарезка 3 Shorts из выпуска", priceMin: 9000, priceMax: 18000, unit: "project" },
    ],
  },
  "Видеосъёмка мероприятия": {
    base: [
      { name: "Работа видеографа, минимум 3 часа", priceMin: 25000, priceMax: 35000, unit: "day" },
    ],
    options: [
      { name: "Монтаж aftermovie до 2 минут", priceMin: 25000, priceMax: 45000, unit: "project" },
      { name: "Вторая камера / оператор", priceMin: 18000, priceMax: 30000, unit: "day" },
      { name: "Короткий ролик для соцсетей", priceMin: 8000, priceMax: 15000, unit: "project" },
      { name: "Экспресс-ролик в день события", priceMin: 25000, priceMax: 45000, unit: "project" },
    ],
  },
  "Студийная фотосъёмка": {
    base: [
      { name: "Подготовка и съёмка до 1 часа", priceMin: 12000, priceMax: 18000, unit: "project" },
      { name: "Отбор, цвет и ретушь 10 кадров", priceMin: 6000, priceMax: 10000, unit: "project" },
    ],
    options: [
      { name: "Дополнительный час съёмки", priceMin: 8000, priceMax: 12000, unit: "hour" },
      { name: "Расширенная ретушь 10 кадров", priceMin: 5000, priceMax: 9000, unit: "project" },
      { name: "Аренда студии", priceMin: 2000, priceMax: 5000, unit: "hour" },
    ],
  },
  "Репортажная фотосъёмка": {
    base: [
      { name: "Съёмка 2 часа, отбор и базовая обработка", priceMin: 16000, priceMax: 22000, unit: "project" },
    ],
    options: [
      { name: "Дополнительный час", priceMin: 8000, priceMax: 10000, unit: "hour" },
      { name: "Срочная подборка для публикации", priceMin: 5000, priceMax: 10000, unit: "project" },
    ],
  },
  "Контент для бизнеса": {
    base: [
      { name: "Подготовка, съёмка 3–4 часа, 7 Reels и фото", priceMin: 60000, priceMax: 90000, unit: "project" },
    ],
    options: [
      { name: "Дополнительные 5 Reels", priceMin: 25000, priceMax: 40000, unit: "project" },
      { name: "Рекламный ролик до 60 секунд", priceMin: 25000, priceMax: 45000, unit: "project" },
    ],
  },
  "Выездная видеосъёмка": {
    base: [
      { name: "Подготовка и работа оператора", priceMin: 24000, priceMax: 35000, unit: "day" },
      { name: "Комплект камеры, света и звука", priceMin: 11000, priceMax: 22000, unit: "day" },
    ],
    options: [
      { name: "Монтаж ролика до 2 минут", priceMin: 25000, priceMax: 45000, unit: "project" },
      { name: "Дополнительная камера", priceMin: 12000, priceMax: 22000, unit: "day" },
      { name: "Выезд за пределы Нижнего Новгорода", priceMin: 3000, priceMax: 15000, unit: "project" },
    ],
  },
};
