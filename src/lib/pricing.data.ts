import type { EstimateData } from "./types";

/**
 * Публичная ценовая модель 2026.
 * Это ориентиры для первичной сметы, а не оферта: состав команды, техника,
 * локация, сроки и объём исходников уточняются после брифа.
 */
export const ESTIMATE_DATA: EstimateData = {
  "Reels / Shorts": {
    base: [
      { name: "Подготовка, съёмка до 2 часов и 3 ролика", priceMin: 24000, priceMax: 35000, unit: "project" },
    ],
    options: [
      { name: "Дополнительный Reels / Shorts", priceMin: 4000, priceMax: 12000, unit: "project" },
      { name: "Субтитры и простая графика", priceMin: 2500, priceMax: 5000, unit: "project" },
      { name: "Дополнительный съёмочный блок", priceMin: 18000, priceMax: 24000, unit: "day" },
      { name: "Сложная графика или ретушь видео", priceMin: 6000, priceMax: 18000, unit: "project" },
    ],
  },
  "Монтаж Reels": {
    base: [
      { name: "Монтаж одного вертикального ролика", priceMin: 4000, priceMax: 7000, unit: "project" },
    ],
    options: [
      { name: "Субтитры и расширенный саунд-дизайн", priceMin: 2000, priceMax: 5000, unit: "project" },
      { name: "Моушн-графика", priceMin: 3500, priceMax: 10000, unit: "project" },
      { name: "Дополнительная версия под площадку", priceMin: 1500, priceMax: 3500, unit: "project" },
    ],
  },
  "Монтаж YouTube": {
    base: [
      { name: "Монтаж выпуска до 15 минут", priceMin: 12000, priceMax: 25000, unit: "project" },
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
      { name: "Работа видеографа, минимум 3 часа", priceMin: 18000, priceMax: 24000, unit: "day" },
    ],
    options: [
      { name: "Монтаж aftermovie до 2 минут", priceMin: 18000, priceMax: 35000, unit: "project" },
      { name: "Вторая камера / оператор", priceMin: 18000, priceMax: 30000, unit: "day" },
      { name: "Короткий ролик для соцсетей", priceMin: 6000, priceMax: 12000, unit: "project" },
      { name: "Экспресс-ролик в день события", priceMin: 18000, priceMax: 35000, unit: "project" },
    ],
  },
  "Студийная фотосъёмка": {
    base: [
      { name: "Подготовка и съёмка до 1 часа", priceMin: 9000, priceMax: 14000, unit: "project" },
      { name: "Отбор, цвет и ретушь 10 кадров", priceMin: 4000, priceMax: 8000, unit: "project" },
    ],
    options: [
      { name: "Дополнительный час съёмки", priceMin: 6000, priceMax: 9000, unit: "hour" },
      { name: "Расширенная ретушь 10 кадров", priceMin: 5000, priceMax: 9000, unit: "project" },
      { name: "Аренда студии", priceMin: 2000, priceMax: 5000, unit: "hour" },
    ],
  },
  "Репортажная фотосъёмка": {
    base: [
      { name: "Съёмка 2 часа, отбор и базовая обработка", priceMin: 12000, priceMax: 16000, unit: "project" },
    ],
    options: [
      { name: "Дополнительный час", priceMin: 5000, priceMax: 7000, unit: "hour" },
      { name: "Срочная подборка для публикации", priceMin: 5000, priceMax: 10000, unit: "project" },
    ],
  },
  "Контент для бизнеса": {
    base: [
      { name: "Подготовка, съёмка 3–4 часа, 7 Reels и фото", priceMin: 48000, priceMax: 70000, unit: "project" },
    ],
    options: [
      { name: "Дополнительные 5 Reels", priceMin: 18000, priceMax: 30000, unit: "project" },
      { name: "Рекламный ролик до 60 секунд", priceMin: 18000, priceMax: 35000, unit: "project" },
    ],
  },
  "Выездная видеосъёмка": {
    base: [
      { name: "Подготовка и работа оператора", priceMin: 20000, priceMax: 30000, unit: "day" },
      { name: "Комплект камеры, света и звука", priceMin: 10000, priceMax: 20000, unit: "day" },
    ],
    options: [
      { name: "Монтаж ролика до 2 минут", priceMin: 18000, priceMax: 35000, unit: "project" },
      { name: "Дополнительная камера", priceMin: 12000, priceMax: 22000, unit: "day" },
      { name: "Выезд за пределы Нижнего Новгорода", priceMin: 3000, priceMax: 15000, unit: "project" },
    ],
  },
};
