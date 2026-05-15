/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValue } from "motion/react";
import { 
  Play, 
  ArrowUpRight, 
  Camera, 
  Video, 
  Check,
  Smartphone, 
  Mail, 
  ChevronRight,
  Menu,
  X,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Maximize2,
  Send,
  Cpu,
  Activity,
  Globe,
  Zap,
  Sun,
  Moon,
  Image as ImageIcon
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getKinescopePreviewUrl = (embedId: string) => {
  const params = new URLSearchParams({
    autoplay: "1",
    muted: "1",
    loop: "1",
    playsinline: "1",
    preload: "auto",
    background: "1",
  });

  return `https://kinescope.io/embed/${embedId}?${params.toString()}`;
};

// --- Data ---

const CLIENTS = [
  "Малая Родина",
  "Сбер",
  "СИБУР",
  "Caprigo",
  "THERAFLEX",
  "KORONA",
  "YANGO",
  "HOFF",
  "Cartier",
  "BARYER",
  "Баня FEST"
];

const TESTIMONIALS = [
  {
    quote: "Нам нужен был ролик для рекламы, который понятно расскажет о продукте. Юрий быстро вник в задачу и сделал видео, которое мы сразу пустили в работу.",
    author: "Александр Р.",
    role: "Руководитель проекта",
    company: "TechVision"
  },
  {
    quote: "С Юрием было легко: без лишней суеты, с понятными сроками и нормальной коммуникацией. В итоге получили сильное видео для запуска и соцсетей.",
    author: "Иван Д.",
    role: "Маркетолог",
    company: "CyberCorp"
  },
  {
    quote: "Для нас было важно красиво показать пространство и детали. Юрий снял всё аккуратно и собрал ролик так, что он сразу выглядел уверенно и дорого.",
    author: "Дмитрий К.",
    role: "Менеджер проектов",
    company: "Сбербанк"
  },
  {
    quote: "Мы заказывали и видео, и фотографии для бренда. Всё получилось в одном стиле, спокойно по процессу и без ощущения, что нужно всё контролировать самим.",
    author: "Елена В.",
    role: "Маркетинг-директор",
    company: "Global Retail"
  },
  {
    quote: "Видео получилось живым и не затянутым. Юрий хорошо чувствует ритм, поэтому ролик хочется досмотреть до конца.",
    author: "Сергей М.",
    role: "Продюсер",
    company: "MediaFlow"
  },
  {
    quote: "Снимали большое мероприятие. Всё прошло чётко: Юрий сам ориентировался на площадке, ничего не тормозил и потом быстро отдал готовый материал.",
    author: "Андрей С.",
    role: "Организатор",
    company: "CityBuild"
  },
  {
    quote: "Нужен был человек, который сам понимает, как лучше снять и что оставить в кадре. Юрий именно такой: предлагает по делу и делает красиво.",
    author: "Наталья О.",
    role: "Бренд-менеджер",
    company: "Aurora Luxury"
  },
  {
    quote: "Мы переживали за сроки, но всё сделали вовремя. Получили понятный, чистый ролик, который хорошо смотрится и на сайте, и в reels.",
    author: "Виктор П.",
    role: "Руководитель команды",
    company: "CinemaTech"
  },
  {
    quote: "Видео для презентации получилось сильным и понятным. Оно хорошо объясняет, кто мы и чем занимаемся, а это для нас было главным.",
    author: "Михаил Л.",
    role: "Директор по развитию",
    company: "Caprigo"
  },
];

const MOSCOW_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const getMoscowTime = () => MOSCOW_TIME_FORMATTER.format(new Date());

const PORTFOLIO_DATA = [
  {
    category: "Избранные кейсы",
    projects: [
      { title: "Метро Горьковская", embedId: "deV36JQbK25yhFKf2zHs3G", size: "2x2", ratio: "56.25%" },
      { title: "Университет Сбера", embedId: "wrf4URJ9Q7P7g5B1SZ5A7W", size: "2x1", ratio: "56.25%" },
      { title: "Caprigo Презентация", embedId: "6kMP6pfn8UtNRXS8eYfjPc", size: "1x1", ratio: "56.25%" },
      { title: "Корона", embedId: "hyQindossxyWZfRxLuDacu", size: "1x1", ratio: "56.25%" },
      { title: "Хоккей СК РФ", embedId: "txm4qz7vRPifxz3MPbzu1V", size: "2x1", ratio: "56.25%" },
      { title: "Женщины СИБУРа", embedId: "51pL5GtYFvJB1f9Nf52HHN", size: "1x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Event и концерты",
    projects: [
      { title: "Метро Горьковская", embedId: "deV36JQbK25yhFKf2zHs3G", size: "2x2", ratio: "56.25%" }
    ]
  },
  {
    category: "Интервью и подкасты",
    projects: [
      { title: "Сбер. Архитектура", embedId: "wrf4URJ9Q7P7g5B1SZ5A7W", size: "2x1", ratio: "56.25%" },
      { title: "Женщины СИБУРа", embedId: "51pL5GtYFvJB1f9Nf52HHN", size: "2x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Рекламные тизеры",
    projects: [
      { title: "Тизер клипа «хорошо»", embedId: "6j8wPfXv6Keka6JTCoiwUC", size: "1x2", ratio: "177.78%" },
      { title: "Женщины СИБУРа", embedId: "fvxndmGGHqWtuCcK5TnB4j", size: "2x1", ratio: "56.25%" },
      { title: "Сбер. Архитектура", embedId: "0u1FpHDHxFSsWdWJX3HcXn", size: "1x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Обучающие видео",
    projects: [
      { title: "Caprigo", embedId: "66ZCTTLVXKieRDjSn2vAYp", size: "2x1", ratio: "56.25%" },
      { title: "BARYER", embedId: "oVqtn1J5sip4R8aNBMY1mi", size: "1x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Архитектура и интерьеры",
    projects: [
      { title: "Архитектура 1", embedId: "ibJsptvZeqt8fe3BBdXvQm", size: "2x1", ratio: "56.25%" },
      { title: "Архитектура 2", embedId: "7UV55F6RMQseCjQ1fyRTtd", size: "1x1", ratio: "56.25%" },
      { title: "Архитектура 3", embedId: "kXnZpxvucX5VKdytAgUAW8", size: "1x1", ratio: "56.25%" },
      { title: "Архитектура 4", embedId: "o8r8qjE3fzudh7MGUruDFv", size: "2x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Reels для бизнеса",
    projects: [
      { title: "Подкаст 1", embedId: "2GgtwiWuq6XaS3yeXbWhRq", size: "1x2", ratio: "177.78%" },
      { title: "Подкаст 2", embedId: "pskL2K5zWzBGMuUH8ZaG6P", size: "1x2", ratio: "177.78%" },
      { title: "Подкаст 3", embedId: "eartRu9igpoxXbUHgATyyt", size: "1x2", ratio: "177.78%" },
      { title: "Подкаст 4", embedId: "8uVYyar3L9cBPV1DmiWcau", size: "1x2", ratio: "177.78%" },
      { title: "Подкаст 5", embedId: "d89ft31rBLhd7XMdSFrAFz", size: "1x2", ratio: "177.78%" },
      { title: "Метро 1", embedId: "wMPCVrj945ds61B4xJK6y2", size: "1x2", ratio: "177.78%" },
      { title: "Метро 2", embedId: "g6XBdsRfBr9QK7B31jH3zG", size: "1x2", ratio: "177.78%" },
      { title: "YANGO", embedId: "0e6mxyEoYRosiGzuBzBdwb", size: "1x2", ratio: "177.78%" },
      { title: "Йога 1", embedId: "4r4pXusToooZ4BT8a9935e", size: "1x2", ratio: "177.78%" },
      { title: "Йога 2", embedId: "fhCvj9nTWMH7puFcUWpai6", size: "1x2", ratio: "177.78%" },
      { title: "Хоккей 1", embedId: "th8PWjmJNUatY2cjGUdkcc", size: "1x2", ratio: "177.78%" },
      { title: "Хоккей 2", embedId: "wEH2Y96QsApXLDDAkzrRZQ", size: "1x2", ratio: "177.78%" },
      { title: "Хоккей 3", embedId: "kpP6XYJnC5wDt5vNMAJU3J", size: "1x2", ratio: "177.78%" },
      { title: "СММ", embedId: "kHKEqxTtZ19gB3S7vNRCsT", size: "1x2", ratio: "177.78%" }
    ]
  },
  {
    category: "Съёмка товаров",
    projects: [
      { title: "HOFF 1", embedId: "vFFSNV1fcvUEAPjk5gGMV7", size: "2x1", ratio: "56.25%" },
      { title: "HOFF 2", embedId: "arCgJWNsD245SvtkZ4FVAL", size: "1x1", ratio: "56.25%" },
      { title: "Caprigo 1", embedId: "6cL2AVoFUHmKCTZSbXsNWR", size: "1x1", ratio: "56.25%" },
      { title: "Caprigo 2", embedId: "ebBJHKSLagRdp7HoKkZ6E8", size: "2x1", ratio: "56.25%" },
      { title: "Cartier 1", embedId: "bcowrcjUyKEj4dUjVzHpMZ", size: "1x1", ratio: "56.25%" },
      { title: "Cartier 2", embedId: "7Wp7zYWRmNBA35cMfwwUEv", size: "1x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Event-отчёты",
    projects: [
      { title: "Тренировка Основа", embedId: "9sZonV2HK653PfPqxqdGbH", size: "2x1", ratio: "56.25%" },
      { title: "Йога", embedId: "o1R5MSC6VZDRYGdvkejSkN", size: "1x1", ratio: "56.25%" },
      { title: "Форум Малая Родина", embedId: "7cXtKnBp5idm5iTAgDFKEN", size: "2x1", ratio: "56.25%" },
      { title: "Хоккей СК РФ", embedId: "txm4qz7vRPifxz3MPbzu1V", size: "1x1", ratio: "56.25%" },
      { title: "Баня FEST", embedId: "cA7pGxKbCP8XFNYUjNSbpr", size: "2x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Презентационные видео",
    projects: [
      { title: "YANGO", embedId: "mLGNoFi4cj3vAdBrqrsdtP", size: "2x1", ratio: "56.25%" },
      { title: "THERAFLEX", embedId: "7MmmoQkeKtLJFA3aqZGToF", size: "1x1", ratio: "56.25%" },
      { title: "Caprigo", embedId: "6kMP6pfn8UtNRXS8eYfjPc", size: "2x1", ratio: "56.25%" }
    ]
  },
  {
    category: "Промышленная видеосъёмка",
    projects: [
      { title: "KORONA", embedId: "hyQindossxyWZfRxLuDacu", size: "2x2", ratio: "56.25%" }
    ]
  }
];

type ProjectMeta = {
  title: string;
  description: string;
  task: string;
};

const PROJECT_TEXT_OVERRIDES: Record<string, Partial<ProjectMeta>> = {
  // Concert / featured
  deV36JQbK25yhFKf2zHs3G: {
    title: "Станция Метро «Горьковская»",
    description: "Выжимка лучших моментов с открытия ночного летнего концерта.",
    task: "Обработка видео с восьми разных камер, снимавших концерт всю ночь. В результате собрано семь готовых роликов с выступлениями разных артистов."
  },
  wrf4URJ9Q7P7g5B1SZ5A7W: {
    title: "SBER.архитектура",
    description: "Одна из серий обучающего курса по архитектуре для СберУниверситета.",
    task: "Сборка ролика из записей с нескольких камер, работа с текстом речи, настройка цветов, добавление поясняющей графики и создание приятного звука."
  },
  "0u1FpHDHxFSsWdWJX3HcXn": {
    title: "SBER.архитектура",
    description: "Одна из серий обучающего курса по архитектуре для СберУниверситета.",
    task: "Сборка ролика из записей с нескольких камер, работа с текстом речи, настройка цветов, добавление поясняющей графики и создание приятного звука."
  },
  "6kMP6pfn8UtNRXS8eYfjPc": {
    title: "Caprigo, презентационный",
    description: "Видео, которое красиво показывает все новые товары компании Caprigo.",
    task: "Ритмичный монтаж ролика, настройка приятных цветов и удаление мелких недостатков в кадре."
  },
  hyQindossxyWZfRxLuDacu: {
    title: "KORONA",
    description: "Красивое видео, показывающее работу производства «KORONA».",
    task: "Видеосъемка и создание энергичного ролика, показывающего процесс работы прямо на производственной линии завода."
  },
  "51pL5GtYFvJB1f9Nf52HHN": {
    title: "СИБУР",
    description: "Отдельный интервью-проект, где монтаж и камера поддерживают историю и атмосферу.",
    task: "Сборка ролика из видео с нескольких камер, работа с субтитрами и продюсерами, а также улучшение картинки и звука."
  },
  fvxndmGGHqWtuCcK5TnB4j: {
    title: "СИБУР",
    description: "Отдельный интервью-проект, где монтаж и камера поддерживают историю и атмосферу.",
    task: "Сборка ролика из видео с нескольких камер, работа с субтитрами и продюсерами, а также улучшение картинки и звука."
  },
  txm4qz7vRPifxz3MPbzu1V: {
    title: "Хоккей СК РФ",
    description: "Видео-отчет о самых интересных моментах открытия хоккейного чемпионата.",
    task: "Лично снимал видео для телефонов и телевизоров, а затем собрал всё в один ролик, сведя разные камеры, улучшил цвета и поработал над звуком."
  },

  // Reels / presentation
  "0e6mxyEoYRosiGzuBzBdwb": {
    title: "YANGO",
    description: "Рекламный ролик для сети такси в Дубае.",
    task: "Создание 15 коротких версий ролика для разных соцсетей на двух языках."
  },
  mLGNoFi4cj3vAdBrqrsdtP: {
    title: "YANGO",
    description: "Рекламный ролик для сети такси в Дубае.",
    task: "Создание 15 коротких версий ролика для разных соцсетей на двух языках."
  },
  "7MmmoQkeKtLJFA3aqZGToF": {
    title: "THERAFLEX",
    task: "Подготовка видео к финальной сборке: создание набросков кадров и предварительный монтаж."
  },
  kHKEqxTtZ19gB3S7vNRCsT: {
    title: "Пилот Медиа",
    description: "Короткое видео для соцсетей компании «Пилот Медиа», чтобы освежить внешний вид профиля и привлечь новых клиентов.",
    task: "Написание сценария, видеосъемка, сборка ролика, настройка красивых цветов и качественная работа со звуком."
  },
  kpP6XYJnC5wDt5vNMAJU3J: {
    title: "Хоккей, День отца (ролик 3)",
    description: "Видео-отчет о главных событиях праздничного мероприятия в честь Дня отца.",
    task: "Сборка бодрого и ритмичного видео с яркой, красивой картинкой."
  },
  wEH2Y96QsApXLDDAkzrRZQ: {
    title: "Хоккей, День отца (ролик 2)",
    description: "Видео-отчет о главных событиях праздничного мероприятия в честь Дня отца.",
    task: "Создание бодрого и ритмичного видео с сочной, привлекательной картинкой."
  },
  th8PWjmJNUatY2cjGUdkcc: {
    title: "Хоккей, День отца (ролик 1)",
    description: "Видео-отчет о главных событиях праздничного мероприятия в честь Дня отца.",
    task: "Монтаж динамичного видео и настройка красивых цветов."
  },
  fhCvj9nTWMH7puFcUWpai6: {
    title: "Йога, День матери (ролик 2)",
    description: "Выжимка самых интересных моментов с мероприятия, посвященного Дню матери.",
    task: "Создание энергичного ролика с приятной и сочной картинкой."
  },
  "4r4pXusToooZ4BT8a9935e": {
    title: "Йога, День матери (ролик 1)",
    description: "Короткий видео-отчет о главных событиях праздника в честь Дня матери.",
    task: "Монтаж бодрого видео и настройка красивых, ярких цветов."
  },
  wMPCVrj945ds61B4xJK6y2: {
    title: "Станция Метро «Горьковская» - CAMZNAEW",
    description: "Самые интересные фрагменты ночного выступления артиста CAMZNAEW.",
    task: "Сборка видео из материалов с восьми камер, работавших всю ночь, для создания одного мощного ролика."
  },
  g6XBdsRfBr9QK7B31jH3zG: {
    title: "Станция Метро «Горьковская» - СЛАВА КПСС",
    description: "Самые яркие моменты с ночного концерта исполнителя Слава КПСС.",
    task: "Сведение видео с восьми разных камер, которые снимали всю ночь, чтобы получить качественный цельный ролик с выступлением."
  },
  d89ft31rBLhd7XMdSFrAFz: {
    title: "Подкаст Стас Еговцев X TERRA (ролик 5)",
    description: "Подборка самых интересных мыслей и моментов из подкаста.",
    task: "Сборка видео с нескольких ракурсов, улучшение качества звука, добавление красивых видеовставок, наложение текста на экран (субтитры) и работа над цветом."
  },
  "8uVYyar3L9cBPV1DmiWcau": {
    title: "Подкаст Стас Еговцев X TERRA (ролик 4)",
    description: "Короткий ролик с главными инсайтами из разговора в подкасте.",
    task: "Монтаж видео с разных камер, чистка звука, добавление иллюстративных кадров, создание субтитров и улучшение картинки."
  },
  eartRu9igpoxXbUHgATyyt: {
    title: "Подкаст Стас Еговцев X TERRA (ролик 3)",
    description: "Самые цепляющие фрагменты разговора из записи подкаста.",
    task: "Сведение разных ракурсов съемки, настройка четкого звука, добавление видеовставок, красивое оформление текста на видео и цветокоррекция."
  },
  pskL2K5zWzBGMuUH8ZaG6P: {
    title: "Подкаст Стас Еговцев X TERRA (ролик 2)",
    description: "Лучшие и самые полезные моменты из записи подкаста.",
    task: "Сборка видео с нескольких камер, работа со звуковой дорожкой, добавление дополнительных материалов, написание субтитров и настройка приятного цвета."
  },
  "2GgtwiWuq6XaS3yeXbWhRq": {
    title: "Подкаст Стас Еговцев X TERRA (ролик 1)",
    description: "Яркие и интересные выдержки из видеоподкаста.",
    task: "Монтаж с использованием нескольких ракурсов, улучшение звука, вставка дополнительных кадров, добавление субтитров и цветокоррекция."
  },
  "6j8wPfXv6Keka6JTCoiwUC": {
    title: "Тизер клипа «Хорошо»",
    description: "Динамичный мини-ролик (тизер) для музыкального клипа «Хорошо», чтобы быстро зацепить внимание зрителя.",
    task: "Сборка ролика, улучшение картинки и использование эффектных плавных замедлений и ускорений видео."
  },

  // Educational
  "66ZCTTLVXKieRDjSn2vAYp": {
    title: "Обучающий Caprigo",
    description: "Понятное обучающее видео по работе в системе «Базис» для сотрудников компании Caprigo.",
    task: "Сведение видео с нескольких камер в один ролик, настройка красивых цветов, добавление легкой анимации и работа со звуком."
  },
  oVqtn1J5sip4R8aNBMY1mi: {
    title: "Фильтры Барьер",
    description: "Понятная видео-инструкция о том, как самому поменять фильтры для воды «Барьер».",
    task: "Сборка ролика, улучшение картинки, затирание лишних деталей, добавление простой анимации, привязка всплывающего текста к объектам в кадре и создание качественного звукового оформления."
  },

  // Architecture
  ibJsptvZeqt8fe3BBdXvQm: {
    title: "Become Legendary, Майами",
    description: "Красивое видео элитной недвижимости для международного застройщика, показывающее масштаб и дизайн домов.",
    task: "Монтаж с эффектными ускорениями и замедлениями времени, улучшение картинки, удаление лишних объектов из кадра. Использованы видео с двух камер и квадрокоптера."
  },
  "7UV55F6RMQseCjQ1fyRTtd": {
    title: "Become Legendary, LA",
    description: "Красивое видео элитной недвижимости для международного застройщика, показывающее масштаб и дизайн домов.",
    task: "Эффектный монтаж с играми скорости (замедление/ускорение), сочная картинка и чистка кадров от визуального мусора. Собрано из видео с двух камер и дрона."
  },
  kXnZpxvucX5VKdytAgUAW8: {
    title: "Become Legendary, Palm Ave 2201",
    description: "Красивое видео элитной недвижимости для международного застройщика, показывающее масштаб и дизайн домов.",
    task: "Создание захватывающего видео с плавными переходами скорости, работа над красивым цветом и удаление лишних деталей. Использованы кадры с двух камер и дрона."
  },
  o8r8qjE3fzudh7MGUruDFv: {
    title: "Become Legendary, Palm Ave 2141",
    description: "Видеообзор элитной недвижимости для международного застройщика, подчеркивающий масштаб и архитектуру домов.",
    task: "Ритмичный монтаж с эффектными замедлениями и ускорениями, улучшение цветов и скрытие мелких недостатков в кадре. Видео собрано из съемок с двух камер и коптера."
  },

  // Products
  vFFSNV1fcvUEAPjk5gGMV7: {
    title: "HOFF Книжка",
    description: "Рекламное видео о новых механизмах раскладывания диванов для магазина HOFF.",
    task: "Сборка ритмичного видео, работа с цветом и удаление случайных изъянов в кадре."
  },
  arCgJWNsD245SvtkZ4FVAL: {
    title: "HOFF Аккордеон",
    description: "Рекламное видео о новых механизмах раскладывания диванов для магазина HOFF.",
    task: "Монтаж бодрого ролика, настройка красивой картинки и скрытие мелких визуальных дефектов."
  },
  "6cL2AVoFUHmKCTZSbXsNWR": {
    title: "Caprigo, раковины",
    description: "Рекламный ролик новой коллекции раковин для бренда мебели Caprigo.",
    task: "Создание ритмичного видео, улучшение цветов и аккуратное удаление мелких визуальных недостатков, попавших в кадр при съемке."
  },
  ebBJHKSLagRdp7HoKkZ6E8: {
    title: "Caprigo, 3 вида мебели",
    description: "Рекламный ролик новой коллекции тумбочек для бренда мебели Caprigo.",
    task: "Создание ритмичного видео, красивая цветокоррекция и закрашивание мелких недочетов на видео."
  },
  bcowrcjUyKEj4dUjVzHpMZ: {
    title: "Cartier, Man'S Collection_1",
    description: "Красивое видео, представляющее новую мужскую коллекцию украшений Cartier.",
    task: "Быстрый монтаж энергичного видео и настройка цветов прямо во время съемок."
  },
  "7Wp7zYWRmNBA35cMfwwUEv": {
    title: "Cartier, Man'S Collection_2",
    description: "Красивое видео, представляющее новую мужскую коллекцию украшений Cartier.",
    task: "Быстрый сбор энергичного ролика и улучшение цветов прямо на съемочной площадке."
  },

  // Reports
  "9sZonV2HK653PfPqxqdGbH": {
    title: "Тренировка, День спорта",
    description: "Видео-отчет о главных моментах спортивного праздника.",
    task: "Создание бодрого видео с яркими и насыщенными цветами."
  },
  o1R5MSC6VZDRYGdvkejSkN: {
    title: "Йога, День матери",
    description: "Видео-отчет о главных моментах мероприятия в честь Дня матери.",
    task: "Создание ритмичного видео с красивой и сочной картинкой."
  },
  "7cXtKnBp5idm5iTAgDFKEN": {
    title: "Форум Малая Родина",
    description: "Видео-отчет о главных событиях форума «Малая Родина, Сила России».",
    task: "Быстрый монтаж и цветокоррекция ролика прямо на месте проведения форума, используя записи с пяти разных камер."
  },
  cA7pGxKbCP8XFNYUjNSbpr: {
    title: "Баня FEST",
    description: "Видео-отчет о самых ярких моментах фестиваля «Баня FEST».",
    task: "Быстрый монтаж и улучшение качества картинки прямо во время мероприятия, используя видео с двух камер и квадрокоптера."
  }
};

const SERVICES = [
  {
    title: "Видеосъёмка для бизнеса",
    description: "Снимаю рекламные ролики, интервью, Reels и event-видео для брендов и бизнеса в Нижнем Новгороде. Помогаю выстроить идею, подготовить съёмку и довести проект до готового результата.",
    icon: <Camera className="w-6 h-6" />
  },
  {
    title: "Монтаж и постпродакшн",
    description: "Монтирую рекламные ролики, Reels, интервью и коммерческие видео с акцентом на ритм, структуру и современную визуальную подачу.",
    icon: <Video className="w-6 h-6" />
  },
  {
    title: "Фотосъёмка для брендов",
    description: "Дополняю видеопроекты фотосъёмкой для брендов, соцсетей и бизнеса. Снимаю портреты, репортаж и визуальный контент в едином стиле с видео.",
    icon: <ImageIcon className="w-6 h-6" />
  }
];

const CATEGORY_DESCRIPTION_TEMPLATES: Record<string, string[]> = {
  "Лучшие кейсы": [
    "Флагманский ролик с акцентом на бренд и уверенную подачу",
    "Ключевая видео-история с плотным монтажным ритмом",
    "Сильный кейс с акцентом на визуал и финальный результат"
  ],
  "Event и концерты": [
    "Концертный ролик с живой энергией сцены и зала",
    "Видео события с фокусом на эмоции и динамику",
    "Музыкальный кейс с плотной ритмической сборкой"
  ],
  "Интервью и подкасты": [
    "Интервью-формат с акцентом на героя и смысл",
    "Разговорный ролик с чистой драматургией кадра",
    "Видео с фокусом на подачу, интонацию и темп"
  ],
  "Рекламные тизеры": [
    "Короткий тизер для быстрого захвата внимания",
    "Тизерный формат с ярким стартом и точным ритмом",
    "Лаконичный промо-ролик для анонса проекта"
  ],
  "Обучающие видео": [
    "Обучающий ролик с понятной логикой подачи",
    "Видео-инструкция с простым и ясным объяснением",
    "Образовательный формат с аккуратным монтажом"
  ],
  "Архитектура и интерьеры": [
    "Архитектурный ролик с акцентом на форму и масштаб",
    "Видео про пространство, фактуру и детали объекта",
    "Спокойная визуальная подача с чистой геометрией кадра"
  ],
  "Reels для бизнеса": [
    "Вертикальный reels-формат с быстрым входом в тему",
    "Короткое видео под соцсети с упором на удержание",
    "Мобильный ролик с энергичным и точным монтажом"
  ],
  "Съёмка товаров": [
    "Продуктовый ролик с акцентом на детали и подачу",
    "Коммерческое видео о товаре с чистым визуалом",
    "Видео-кейс с фокусом на образ и преимущества продукта"
  ],
  "Event-отчёты": [
    "Отчетный ролик с понятной хронологией события",
    "Видео-отчет с акцентом на ключевые моменты проекта",
    "Краткая сборка результатов в уверенной подаче"
  ],
  "Презентационные видео": [
    "Презентационный ролик для бизнеса и встреч с клиентами",
    "Имиджевое видео для представления продукта и команды",
    "Подача проекта в формате ясной и аккуратной презентации"
  ],
  "Промышленная видеосъёмка": [
    "Видео-кейс о производстве с акцентом на масштаб",
    "Ролик о процессе с фокусом на надежность и детали",
    "Промышленный формат с уверенной документальной подачей"
  ]
};

const getProjectDescription = (category: string, title: string, index: number) => {
  const fallback = [
    "Короткий ролик с акцентом на подачу и динамику",
    "Видео-кейс с чистым монтажом и понятной структурой",
    "Проект с фокусом на эмоцию, ритм и итоговый результат"
  ];
  const pool = CATEGORY_DESCRIPTION_TEMPLATES[category] || fallback;
  const template = pool[index % pool.length];
  return `${template}: «${title}».`;
};

const getProjectMeta = (category: string, project: { embedId: string; title: string }, index: number): ProjectMeta => {
  const override = PROJECT_TEXT_OVERRIDES[project.embedId] || {};
  const title = override.title || project.title;
  const description = override.description || getProjectDescription(category, title, index);
  const task = override.task || "Монтаж";

  return { title, description, task };
};

const getReelsGroupName = (title: string) => title.replace(/\s+\d+$/u, "").trim();

const SLUG_OVERRIDES: Record<string, string> = {
  deV36JQbK25yhFKf2zHs3G: "metro-gorkovskaya",
  wrf4URJ9Q7P7g5B1SZ5A7W: "sber-architecture-course",
};

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const transliterateToLatin = (input: string) =>
  input
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN_MAP[char] ?? char)
    .join("");

const slugifyProjectTitle = (input: string) =>
  transliterateToLatin(input)
    .replace(/['’"«»]/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

// --- Constants ---

const SPRING_CONFIG = { mass: 1, tension: 120, friction: 14 };
const NOTHING_EASE = [0.16, 1, 0.3, 1];
const COOKIE_CONSENT_KEY = "cookie_consent_v1";
const DEFAULT_DEV_API_URL = "http://localhost:3001";
const DEFAULT_PROD_API_URL = "/.netlify/functions";
const LEGAL_OPERATOR = {
  name: "Елыгин Юрий Сергеевич",
  inn: "526219298988",
  ogrn: "не применяется (самозанятый, НПД)",
  contact: "Плательщик налога на профессиональный доход (самозанятый)",
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    }
  }
};

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: NOTHING_EASE
    }
  }
};

const TEXT_REVEAL = {
  hidden: { y: "100%" },
  show: { 
    y: 0,
    transition: {
      duration: 1,
      ease: NOTHING_EASE
    }
  }
};

// --- Components ---

const MagneticButton = ({ children, className, distance = 60, strength = 0.3 }: { children: React.ReactNode, className?: string, distance?: number, strength?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 20, stiffness: 150 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (dist < distance) {
      x.set(deltaX * strength);
      y.set(deltaY * strength);
    } else {
      x.set(0);
      y.set(0);
    }
  }, [distance, strength, x, y]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <motion.div
      ref={ref}
      className={cn("relative inline-block", className)}
      style={{ x: xSpring, y: ySpring }}
    >
      {children}
    </motion.div>
  );
};

const NoiseOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] noise-overlay" />
);

const DotGrid = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 dot-grid" />
  </div>
);

const MagneticCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const cursorSize = useMotionValue(32);
  const springConfig = { damping: 30, stiffness: 300 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);
  const cursorSizeSpring = useSpring(cursorSize, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      
      const target = e.target as HTMLElement;
      if (target.closest('a, button, .group')) {
        cursorSize.set(64);
      } else {
        cursorSize.set(32);
      }
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY, cursorSize]);

  return (
    <motion.div
      className="fixed top-0 left-0 rounded-full border border-nothing-black z-[10000] pointer-events-none mix-blend-difference hidden md:flex items-center justify-center"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        width: cursorSizeSpring,
        height: cursorSizeSpring,
        translateX: "-50%",
        translateY: "-50%",
      }}
    >
      <motion.div 
        className="w-1 h-1 bg-nothing-black rounded-full"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
};

const RotatingText = ({ words, className }: { words: string[], className?: string }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [words]);

  return (
    <span className={cn("relative h-[1.2em] overflow-hidden inline-flex align-bottom", className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="whitespace-nowrap"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
      {/* Hidden placeholder to maintain width based on current word */}
      <span className="invisible pointer-events-none whitespace-nowrap select-none">
        {words[index]}
      </span>
    </span>
  );
};

const Marquee = ({ compact = false }: { compact?: boolean }) => {
  return (
    <section
      className={cn(
        "clients-strip overflow-hidden bg-nothing-white relative border-y border-nothing-black/5",
        compact ? "py-4 md:py-5" : "py-10 md:py-12"
      )}
    >
      {!compact && (
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs opacity-80 uppercase tracking-widest">Клиенты</span>
            <div className="w-8 h-px bg-nothing-red" />
            <span className="font-mono text-[10px] opacity-70 uppercase tracking-[0.28em]">С кем уже работал</span>
          </div>
        </div>
      )}
      <div className={cn("absolute left-0 top-0 bottom-0 z-10", compact ? "w-16 md:w-24" : "w-40")} />
      <div className={cn("absolute right-0 top-0 bottom-0 z-10", compact ? "w-16 md:w-24" : "w-40")} />
      <div className={cn("absolute left-0 top-0 bottom-0 bg-gradient-to-r from-nothing-white to-transparent z-10", compact ? "w-16 md:w-24" : "w-40")} />
      <div className={cn("absolute right-0 top-0 bottom-0 bg-gradient-to-l from-nothing-white to-transparent z-10", compact ? "w-16 md:w-24" : "w-40")} />
      
      <div className={cn("marquee-track flex items-center", compact ? "gap-10 md:gap-16" : "gap-24")}>
        {[...CLIENTS, ...CLIENTS].map((client, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <span className="font-mono text-xs opacity-70 group-hover:opacity-100 transition-opacity">/</span>
            <span className={cn(
              "font-bold uppercase tracking-tighter opacity-80 group-hover:opacity-100 group-hover:text-nothing-red transition-all duration-500 cursor-default",
              compact ? "text-[1.85rem] md:text-[3.25rem]" : "text-4xl md:text-6xl"
            )}>
              {client}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

const Testimonials = () => {
  const [showAll, setShowAll] = useState(false);
  const displayedTestimonials = showAll ? TESTIMONIALS : TESTIMONIALS.slice(0, 6);

  return (
    <section id="testimonials" className="py-20 md:py-32 bg-nothing-black text-nothing-white overflow-hidden relative is-hidden">
      <div className="absolute top-0 left-0 w-full h-full dot-grid opacity-10 pointer-events-none" />
      
      <div className="px-6 md:px-12 max-w-[1600px] mx-auto relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={STAGGER_CONTAINER}
          className="flex items-baseline justify-between mb-20"
        >
          <div className="flex items-baseline gap-4">
            <motion.span variants={STAGGER_ITEM} className="font-mono text-xs opacity-80">03</motion.span>
            <div className="text-mask">
              <motion.h2 variants={TEXT_REVEAL} className="text-5xl sm:text-6xl md:text-9xl font-bold tracking-tighter uppercase leading-none">Отзывы</motion.h2>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {displayedTestimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.author + i}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  duration: 0.5, 
                  delay: showAll ? 0 : i * 0.1,
                  ease: NOTHING_EASE 
                }}
                className="p-8 border border-nothing-white/10 bg-nothing-white/5 backdrop-blur-sm hover:bg-nothing-white/10 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 mb-8">
                    {[...Array(3)].map((_, starIndex) => (
                      <div key={starIndex} className="w-1 h-4 bg-nothing-red opacity-40 group-hover:opacity-100 transition-opacity" />
                    ))}
                  </div>
                  
                  <p className="text-xl md:text-2xl font-semibold leading-relaxed mb-12 italic opacity-100 text-nothing-white">
                    "{testimonial.quote}"
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-nothing-white/10 flex items-center justify-center font-mono text-lg border border-nothing-white/5">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold uppercase tracking-tight">{testimonial.author}</h4>
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-80">
                      {testimonial.role} @ {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!showAll && TESTIMONIALS.length > 6 && (
          <div className="mt-20 flex justify-center">
            <button 
              onClick={() => setShowAll(true)}
              className="group relative px-12 py-6 overflow-hidden border border-nothing-white/20 hover:border-nothing-red transition-colors"
            >
              <div className="absolute inset-0 bg-nothing-red translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 font-mono text-xs uppercase tracking-widest">
                Показать все отзывы ({TESTIMONIALS.length})
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const VideoModal = ({
  isOpen,
  onClose,
  embedId,
  ratio,
  title,
  description,
  task
}: {
  isOpen: boolean;
  onClose: () => void;
  embedId: string;
  ratio: string;
  title: string;
  description: string;
  task: string;
}) => {
  const isVertical = ratio === "177.78%";
  const previewRatio = isVertical ? "177.78%" : ratio;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-nothing-black/40 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={cn(
              "relative w-full liquid-glass overflow-hidden rounded-3xl p-4 md:p-6",
              isVertical ? "max-w-[780px]" : "max-w-6xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "grid gap-4 md:gap-5",
                isVertical
                  ? "md:grid-cols-[minmax(280px,360px)_340px] md:justify-center"
                  : "md:grid-cols-[minmax(0,1fr)_340px]"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl overflow-hidden bg-nothing-black/90 p-2 md:p-3",
                  isVertical && "md:w-full md:max-w-[360px] md:justify-self-center"
                )}
              >
                <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingTop: previewRatio }}>
                  <iframe 
                    src={`https://kinescope.io/embed/${embedId}?autoplay=1`} 
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" 
                    frameBorder="0" 
                    allowFullScreen 
                    style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }}
                  />
                </div>
              </div>

              <aside className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="p-3 bg-white/90 text-nothing-black rounded-full hover:bg-nothing-red hover:text-white transition-all backdrop-blur-md border border-nothing-black/10"
                    aria-label="Закрыть окно проекта"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="rounded-2xl border border-nothing-black/10 bg-white/80 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-65 mb-1">Проект</p>
                  <p className="text-sm md:text-base font-bold text-nothing-black">{title}</p>
                </div>
                <div className="rounded-2xl border border-nothing-black/10 bg-white/80 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-65 mb-1">Описание</p>
                  <p className="text-sm md:text-base font-semibold text-nothing-black">{description}</p>
                </div>
                <div className="rounded-2xl border border-nothing-black/10 bg-white/80 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-65 mb-1">Задача</p>
                  <p className="text-sm md:text-base font-semibold text-nothing-black">{task}</p>
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const LegacyPrivacyContent = () => (
  <div className="max-w-4xl">
    <span className="font-mono text-xs uppercase tracking-widest opacity-80">Политика конфиденциальности</span>
    <h3 id="privacy-title" className="mt-4 text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tighter uppercase">
      Обработка персональных данных
    </h3>
  <div className="mt-8 space-y-4 text-sm sm:text-base leading-relaxed text-nothing-black/85">
    <p>
      1. Общие положения
      <br />
      Настоящая политика обработки персональных данных составлена в соответствии с требованиями Федерального закона
      от 27.07.2006. №152-ФЗ «О персональных данных» (далее - Закон о персональных данных) и определяет порядок
      обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые Ильинский
      Антон Игоревич (далее – Оператор).
    </p>
    <p>
      1.1. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод
      человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной
      жизни, личную и семейную тайну.
    </p>
    <p>
      1.2. Настоящая политика Оператора в отношении обработки персональных данных (далее – Политика) применяется ко всей
      информации, которую Оператор может получить о посетителях веб-сайта https://birdhouse.team.
    </p>

    <p>2. Основные понятия, используемые в Политике</p>
    <p>
      2.1. Автоматизированная обработка персональных данных – обработка персональных данных с помощью средств
      вычислительной техники.
    </p>
    <p>
      2.2. Блокирование персональных данных – временное прекращение обработки персональных данных (за исключением
      случаев, если обработка необходима для уточнения персональных данных).
    </p>
    <p>
      2.3. Веб-сайт – совокупность графических и информационных материалов, а также программ для ЭВМ и баз данных,
      обеспечивающих их доступность в сети интернет по сетевому адресу https://birdhouse.team.
    </p>
    <p>
      2.4. Информационная система персональных данных — совокупность содержащихся в базах данных персональных данных, и
      обеспечивающих их обработку информационных технологий и технических средств.
    </p>
    <p>
      2.5. Обезличивание персональных данных — действия, в результате которых невозможно определить без использования
      дополнительной информации принадлежность персональных данных конкретному Пользователю или иному субъекту
      персональных данных.
    </p>
    <p>
      2.6. Обработка персональных данных – любое действие (операция) или совокупность действий (операций), совершаемых с
      использованием средств автоматизации или без использования таких средств с персональными данными, включая сбор,
      запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование,
      передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение персональных
      данных.
    </p>
    <p>
      2.7. Оператор – государственный орган, муниципальный орган, юридическое или физическое лицо, самостоятельно или
      совместно с другими лицами организующие и (или) осуществляющие обработку персональных данных, а также определяющие
      цели обработки персональных данных, состав персональных данных, подлежащих обработке, действия (операции),
      совершаемые с персональными данными.
    </p>
    <p>
      2.8. Персональные данные – любая информация, относящаяся прямо или косвенно к определенному или определяемому
      Пользователю веб-сайта https://birdhouse.team.
    </p>
    <p>
      2.9. Персональные данные, разрешенные субъектом персональных данных для распространения, - персональные данные,
      доступ неограниченного круга лиц к которым предоставлен субъектом персональных данных путем дачи согласия на
      обработку персональных данных, разрешенных субъектом персональных данных для распространения в порядке,
      предусмотренном Законом о персональных данных (далее - персональные данные, разрешенные для распространения).
    </p>
    <p>
      2.10. Пользователь – любой посетитель веб-сайта https://birdhouse.team.
    </p>
    <p>
      2.11. Предоставление персональных данных – действия, направленные на раскрытие персональных данных определенному
      лицу или определенному кругу лиц.
    </p>
    <p>
      2.12. Распространение персональных данных – любые действия, направленные на раскрытие персональных данных
      неопределенному кругу лиц (передача персональных данных) или на ознакомление с персональными данными
      неограниченного круга лиц, в том числе обнародование персональных данных в средствах массовой информации, размещение
      в информационно-телекоммуникационных сетях или предоставление доступа к персональным данным каким-либо иным
      способом.
    </p>
    <p>
      2.13. Трансграничная передача персональных данных – передача персональных данных на территорию иностранного
      государства органу власти иностранного государства, иностранному физическому или иностранному юридическому лицу.
    </p>
    <p>
      2.14. Уничтожение персональных данных – любые действия, в результате которых персональные данные уничтожаются
      безвозвратно с невозможностью дальнейшего восстановления содержания персональных данных в информационной системе
      персональных данных и (или) уничтожаются материальные носители персональных данных.
    </p>

    <p>3. Основные права и обязанности Оператора</p>
    <p>3.1. Оператор имеет право:</p>
    <p>– получать от субъекта персональных данных достоверные информацию и/или документы, содержащие персональные данные;</p>
    <p>
      – в случае отзыва субъектом персональных данных согласия на обработку персональных данных Оператор вправе
      продолжить обработку персональных данных без согласия субъекта персональных данных при наличии оснований,
      указанных в Законе о персональных данных;
    </p>
    <p>
      – самостоятельно определять состав и перечень мер, необходимых и достаточных для обеспечения выполнения
      обязанностей, предусмотренных Законом о персональных данных и принятыми в соответствии с ним нормативными правовыми
      актами, если иное не предусмотрено Законом о персональных данных или другими федеральными законами.
    </p>
    <p>3.2. Оператор обязан:</p>
    <p>– предоставлять субъекту персональных данных по его просьбе информацию, касающуюся обработки его персональных данных;</p>
    <p>– организовывать обработку персональных данных в порядке, установленном действующим законодательством РФ;</p>
    <p>
      – отвечать на обращения и запросы субъектов персональных данных и их законных представителей в соответствии с
      требованиями Закона о персональных данных;
    </p>
    <p>
      – сообщать в уполномоченный орган по защите прав субъектов персональных данных по запросу этого органа необходимую
      информацию в течение 30 дней с даты получения такого запроса;
    </p>
    <p>
      – публиковать или иным образом обеспечивать неограниченный доступ к настоящей Политике в отношении обработки
      персональных данных;
    </p>
    <p>
      – принимать правовые, организационные и технические меры для защиты персональных данных от неправомерного или
      случайного доступа к ним, уничтожения, изменения, блокирования, копирования, предоставления, распространения
      персональных данных, а также от иных неправомерных действий в отношении персональных данных;
    </p>
    <p>
      – прекратить передачу (распространение, предоставление, доступ) персональных данных, прекратить обработку и
      уничтожить персональные данные в порядке и случаях, предусмотренных Законом о персональных данных;
    </p>
    <p>– исполнять иные обязанности, предусмотренные Законом о персональных данных.</p>

    <p>4. Основные права и обязанности субъектов персональных данных</p>
    <p>4.1. Субъекты персональных данных имеют право:</p>
    <p>
      – получать информацию, касающуюся обработки его персональных данных, за исключением случаев, предусмотренных
      федеральными законами. Сведения предоставляются субъекту персональных данных Оператором в доступной форме, и в них
      не должны содержаться персональные данные, относящиеся к другим субъектам персональных данных, за исключением
      случаев, когда имеются законные основания для раскрытия таких персональных данных. Перечень информации и порядок
      ее получения установлен Законом о персональных данных;
    </p>
    <p>
      – требовать от оператора уточнения его персональных данных, их блокирования или уничтожения в случае, если
      персональные данные являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми
      для заявленной цели обработки, а также принимать предусмотренные законом меры по защите своих прав;
    </p>
    <p>
      – выдвигать условие предварительного согласия при обработке персональных данных в целях продвижения на рынке товаров,
      работ и услуг;
    </p>
    <p>– на отзыв согласия на обработку персональных данных;</p>
    <p>
      – обжаловать в уполномоченный орган по защите прав субъектов персональных данных или в судебном порядке неправомерные
      действия или бездействие Оператора при обработке его персональных данных;
    </p>
    <p>– на осуществление иных прав, предусмотренных законодательством РФ.</p>
    <p>4.2. Субъекты персональных данных обязаны:</p>
    <p>– предоставлять Оператору достоверные данные о себе;</p>
    <p>– сообщать Оператору об уточнении (обновлении, изменении) своих персональных данных.</p>
    <p>
      4.3. Лица, передавшие Оператору недостоверные сведения о себе, либо сведения о другом субъекте персональных данных
      без согласия последнего, несут ответственность в соответствии с законодательством РФ.
    </p>

    <p>5. Оператор может обрабатывать следующие персональные данные Пользователя</p>
    <p>5.1. Фамилия, имя, отчество.</p>
    <p>5.2. Номера телефонов.</p>
    <p>
      5.3. Также на сайте происходит сбор и обработка обезличенных данных о посетителях (в т.ч. файлов «cookie») с помощью
      сервисов интернет-статистики (Яндекс Метрика и Гугл Аналитика и других).
    </p>
    <p>5.4. Вышеперечисленные данные далее по тексту Политики объединены общим понятием Персональные данные.</p>
    <p>
      5.5. Обработка специальных категорий персональных данных, касающихся расовой, национальной принадлежности,
      политических взглядов, религиозных или философских убеждений, интимной жизни, Оператором не осуществляется.
    </p>
    <p>
      5.6. Обработка персональных данных, разрешенных для распространения, из числа специальных категорий персональных
      данных, указанных в ч. 1 ст. 10 Закона о персональных данных, допускается, если соблюдаются запреты и условия,
      предусмотренные ст. 10.1 Закона о персональных данных.
    </p>
    <p>
      5.7. Согласие Пользователя на обработку персональных данных, разрешенных для распространения, оформляется отдельно
      от других согласий на обработку его персональных данных. При этом соблюдаются условия, предусмотренные, в частности,
      ст. 10.1 Закона о персональных данных. Требования к содержанию такого согласия устанавливаются уполномоченным органом
      по защите прав субъектов персональных данных.
    </p>
    <p>5.7.1 Согласие на обработку персональных данных, разрешенных для распространения, Пользователь предоставляет Оператору непосредственно.</p>
    <p>
      5.7.2 Оператор обязан в срок не позднее трех рабочих дней с момента получения указанного согласия Пользователя
      опубликовать информацию об условиях обработки, о наличии запретов и условий на обработку неограниченным кругом лиц
      персональных данных, разрешенных для распространения.
    </p>
    <p>
      5.7.3 Передача (распространение, предоставление, доступ) персональных данных, разрешенных субъектом персональных
      данных для распространения, должна быть прекращена в любое время по требованию субъекта персональных данных. Данное
      требование должно включать в себя фамилию, имя, отчество (при наличии), контактную информацию (номер телефона, адрес
      электронной почты или почтовый адрес) субъекта персональных данных, а также перечень персональных данных, обработка
      которых подлежит прекращению. Указанные в данном требовании персональные данные могут обрабатываться только Оператором,
      которому оно направлено.
    </p>
    <p>
      5.7.4 Согласие на обработку персональных данных, разрешенных для распространения, прекращает свое действие с момента
      поступления Оператору требования, указанного в п. 5.7.3 настоящей Политики в отношении обработки персональных данных.
    </p>

    <p>6. Принципы обработки персональных данных</p>
    <p>6.1. Обработка персональных данных осуществляется на законной и справедливой основе.</p>
    <p>
      6.2. Обработка персональных данных ограничивается достижением конкретных, заранее определенных и законных целей. Не
      допускается обработка персональных данных, несовместимая с целями сбора персональных данных.
    </p>
    <p>
      6.3. Не допускается объединение баз данных, содержащих персональные данные, обработка которых осуществляется в целях,
      несовместимых между собой.
    </p>
    <p>6.4. Обработке подлежат только персональные данные, которые отвечают целям их обработки.</p>
    <p>
      6.5. Содержание и объем обрабатываемых персональных данных соответствуют заявленным целям обработки. Не допускается
      избыточность обрабатываемых персональных данных по отношению к заявленным целям их обработки.
    </p>
    <p>
      6.6. При обработке персональных данных обеспечивается точность персональных данных, их достаточность, а в необходимых
      случаях и актуальность по отношению к целям обработки персональных данных. Оператор принимает необходимые меры и/или
      обеспечивает их принятие по удалению или уточнению неполных или неточных данных.
    </p>
    <p>
      6.7. Хранение персональных данных осуществляется в форме, позволяющей определить субъекта персональных данных, не
      дольше, чем этого требуют цели обработки персональных данных, если срок хранения персональных данных не установлен
      федеральным законом, договором, стороной которого, выгодоприобретателем или поручителем по которому является субъект
      персональных данных. Обрабатываемые персональные данные уничтожаются либо обезличиваются по достижении целей обработки
      или в случае утраты необходимости в достижении этих целей, если иное не предусмотрено федеральным законом.
    </p>

    <p>7. Цели обработки персональных данных</p>
    <p>7.1. Цель обработки персональных данных Пользователя:</p>
    <p>– предоставление доступа Пользователю к сервисам, информации и/или материалам, содержащимся на веб-сайте https://birdhouse.team.</p>
    <p>
      7.2. Также Оператор имеет право направлять Пользователю уведомления о новых продуктах и услугах, специальных
      предложениях и различных событиях. Пользователь всегда может отказаться от получения информационных сообщений,
      направив Оператору письмо на адрес электронной почты anton.i@birdhousestudio.ru с пометкой «Отказ от уведомлений о
      новых продуктах и услугах и специальных предложениях».
    </p>
    <p>
      7.3. Обезличенные данные Пользователей, собираемые с помощью сервисов интернет-статистики, служат для сбора
      информации о действиях Пользователей на сайте, улучшения качества сайта и его содержания.
    </p>

    <p>8. Правовые основания обработки персональных данных</p>
    <p>8.1. Правовыми основаниями обработки персональных данных Оператором являются:</p>
    <p>– уставные (учредительные) документы Оператора;</p>
    <p>– федеральные законы, иные нормативно-правовые акты в сфере защиты персональных данных;</p>
    <p>– согласия Пользователей на обработку их персональных данных, на обработку персональных данных, разрешенных для распространения.</p>
    <p>
      8.2. Оператор обрабатывает персональные данные Пользователя только в случае их заполнения и/или отправки Пользователем
      самостоятельно через специальные формы, расположенные на сайте https://birdhouse.team или направленные Оператору
      посредством электронной почты. Заполняя соответствующие формы и/или отправляя свои персональные данные Оператору,
      Пользователь выражает свое согласие с данной Политикой.
    </p>
    <p>
      8.3. Оператор обрабатывает обезличенные данные о Пользователе в случае, если это разрешено в настройках браузера
      Пользователя (включено сохранение файлов «cookie» и использование технологии JavaScript).
    </p>
    <p>
      8.4. Субъект персональных данных самостоятельно принимает решение о предоставлении его персональных данных и дает
      согласие свободно, своей волей и в своем интересе.
    </p>

    <p>9. Условия обработки персональных данных</p>
    <p>9.1. Обработка персональных данных осуществляется с согласия субъекта персональных данных на обработку его персональных данных.</p>
    <p>
      9.2. Обработка персональных данных необходима для достижения целей, предусмотренных международным договором Российской
      Федерации или законом, для осуществления возложенных законодательством Российской Федерации на оператора функций,
      полномочий и обязанностей.
    </p>
    <p>
      9.3. Обработка персональных данных необходима для осуществления правосудия, исполнения судебного акта, акта другого
      органа или должностного лица, подлежащих исполнению в соответствии с законодательством Российской Федерации об
      исполнительном производстве.
    </p>
    <p>
      9.4. Обработка персональных данных необходима для исполнения договора, стороной которого либо выгодоприобретателем
      или поручителем по которому является субъект персональных данных, а также для заключения договора по инициативе
      субъекта персональных данных или договора, по которому субъект персональных данных будет являться выгодоприобретателем
      или поручителем.
    </p>
    <p>
      9.5. Обработка персональных данных необходима для осуществления прав и законных интересов оператора или третьих лиц
      либо для достижения общественно значимых целей при условии, что при этом не нарушаются права и свободы субъекта
      персональных данных.
    </p>
    <p>
      9.6. Осуществляется обработка персональных данных, доступ неограниченного круга лиц к которым предоставлен субъектом
      персональных данных либо по его просьбе (далее – общедоступные персональные данные).
    </p>
    <p>
      9.7. Осуществляется обработка персональных данных, подлежащих опубликованию или обязательному раскрытию в соответствии
      с федеральным законом.
    </p>

    <p>
      10. Порядок сбора, хранения, передачи и других видов обработки персональных данных Безопасность персональных данных,
      которые обрабатываются Оператором, обеспечивается путем реализации правовых, организационных и технических мер,
      необходимых для выполнения в полном объеме требований действующего законодательства в области защиты персональных данных.
    </p>
    <p>10.1. Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие доступ к персональным данным неуполномоченных лиц.</p>
    <p>
      10.2. Персональные данные Пользователя никогда, ни при каких условиях не будут переданы третьим лицам, за исключением
      случаев, связанных с исполнением действующего законодательства либо в случае, если субъектом персональных данных дано
      согласие Оператору на передачу данных третьему лицу для исполнения обязательств по гражданско-правовому договору.
    </p>
    <p>
      10.3. В случае выявления неточностей в персональных данных, Пользователь может актуализировать их самостоятельно,
      путем направления Оператору уведомление на адрес электронной почты Оператора anton.i@birdhousestudio.ru с пометкой
      «Актуализация персональных данных».
    </p>
    <p>
      10.4. Срок обработки персональных данных определяется достижением целей, для которых были собраны персональные данные,
      если иной срок не предусмотрен договором или действующим законодательством. Пользователь может в любой момент отозвать
      свое согласие на обработку персональных данных, направив Оператору уведомление посредством электронной почты на
      электронный адрес Оператора anton.i@birdhousestudio.ru с пометкой «Отзыв согласия на обработку персональных данных».
    </p>
    <p>
      10.5. Вся информация, которая собирается сторонними сервисами, в том числе платежными системами, средствами связи и
      другими поставщиками услуг, хранится и обрабатывается указанными лицами (Операторами) в соответствии с их Пользовательским
      соглашением и Политикой конфиденциальности. Субъект персональных данных и/или Пользователь обязан самостоятельно
      своевременно ознакомиться с указанными документами. Оператор не несет ответственность за действия третьих лиц, в том
      числе указанных в настоящем пункте поставщиков услуг.
    </p>
    <p>
      10.6. Установленные субъектом персональных данных запреты на передачу (кроме предоставления доступа), а также на
      обработку или условия обработки (кроме получения доступа) персональных данных, разрешенных для распространения, не
      действуют в случаях обработки персональных данных в государственных, общественных и иных публичных интересах,
      определенных законодательством РФ.
    </p>
    <p>10.7. Оператор при обработке персональных данных обеспечивает конфиденциальность персональных данных.</p>
    <p>
      10.8. Оператор осуществляет хранение персональных данных в форме, позволяющей определить субъекта персональных данных,
      не дольше, чем этого требуют цели обработки персональных данных, если срок хранения персональных данных не установлен
      федеральным законом, договором, стороной которого, выгодоприобретателем или поручителем по которому является субъект
      персональных данных.
    </p>
    <p>
      10.9. Условием прекращения обработки персональных данных может являться достижение целей обработки персональных данных,
      истечение срока действия согласия субъекта персональных данных или отзыв согласия субъектом персональных данных, а также
      выявление неправомерной обработки персональных данных.
    </p>

    <p>11. Перечень действий, производимых Оператором с полученными персональными данными</p>
    <p>
      11.1. Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение),
      извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление
      и уничтожение персональных данных.
    </p>
    <p>
      11.2. Оператор осуществляет автоматизированную обработку персональных данных с получением и/или передачей полученной
      информации по информационно-телекоммуникационным сетям или без таковой.
    </p>

    <p>12. Трансграничная передача персональных данных</p>
    <p>
      12.1. Оператор до начала осуществления трансграничной передачи персональных данных обязан убедиться в том, что
      иностранным государством, на территорию которого предполагается осуществлять передачу персональных данных,
      обеспечивается надежная защита прав субъектов персональных данных.
    </p>
    <p>
      12.2. Трансграничная передача персональных данных на территории иностранных государств, не отвечающих вышеуказанным
      требованиям, может осуществляться только в случае наличия согласия в письменной форме субъекта персональных данных на
      трансграничную передачу его персональных данных и/или исполнения договора, стороной которого является субъект
      персональных данных.
    </p>

    <p>
      13. Конфиденциальность персональных данных Оператор и иные лица, получившие доступ к персональным данным, обязаны не
      раскрывать третьим лицам и не распространять персональные данные без согласия субъекта персональных данных, если иное
      не предусмотрено федеральным законом.
    </p>

    <p>14. Заключительные положения</p>
    <p>
      14.1. Пользователь может получить любые разъяснения по интересующим вопросам, касающимся обработки его персональных
      данных, обратившись к Оператору с помощью электронной почты anton.i@birdhousestudio.ru.
    </p>
    <p>
      14.2. В данном документе будут отражены любые изменения политики обработки персональных данных Оператора. Политика
      действует бессрочно до замены ее новой версией.
    </p>
    <p>14.3. Актуальная версия Политики в свободном доступе расположена в сети Интернет по адресу https://birdhouse.team/privacy.</p>
  </div>
  </div>
);


const PrivacyContent = () => (
  <div className="max-w-4xl">
    <span className="font-mono text-xs uppercase tracking-widest opacity-80">Политика конфиденциальности</span>
    <h3 id="privacy-title" className="mt-4 text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tighter uppercase">
      Политика в отношении обработки персональных данных
    </h3>
    <div className="mt-8 space-y-4 text-sm sm:text-base leading-relaxed text-nothing-black/85">
      <p>1. Общие положения</p>
      <p>
        Настоящая политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006. № 152-ФЗ «О персональных данных» (далее — Закон о персональных данных) и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые Елыгин Юрий Сергеевич (далее — Оператор).
      </p>
      <p>1.1. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну.</p>
      <p>1.2. Настоящая политика Оператора в отношении обработки персональных данных (далее — Политика) применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта https://yelyginn.ru.</p>

      <p>2. Основные понятия, используемые в Политике</p>
      <p>2.1. Автоматизированная обработка персональных данных — обработка персональных данных с помощью средств вычислительной техники.</p>
      <p>2.2. Блокирование персональных данных — временное прекращение обработки персональных данных (за исключением случаев, если обработка необходима для уточнения персональных данных).</p>
      <p>2.3. Веб-сайт — совокупность графических и информационных материалов, а также программ для ЭВМ и баз данных, обеспечивающих их доступность в сети интернет по сетевому адресу https://yelyginn.ru.</p>
      <p>2.4. Информационная система персональных данных — совокупность содержащихся в базах данных персональных данных и обеспечивающих их обработку информационных технологий и технических средств.</p>
      <p>2.5. Обезличивание персональных данных — действия, в результате которых невозможно определить без использования дополнительной информации принадлежность персональных данных конкретному Пользователю или иному субъекту персональных данных.</p>
      <p>2.6. Обработка персональных данных — любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение персональных данных.</p>
      <p>2.7. Оператор — государственный орган, муниципальный орган, юридическое или физическое лицо, самостоятельно или совместно с другими лицами организующие и/или осуществляющие обработку персональных данных, а также определяющие цели обработки персональных данных, состав персональных данных, подлежащих обработке, действия (операции), совершаемые с персональными данными.</p>
      <p>2.8. Персональные данные — любая информация, относящаяся прямо или косвенно к определенному или определяемому Пользователю веб-сайта https://yelyginn.ru.</p>
      <p>2.9. Персональные данные, разрешенные субъектом персональных данных для распространения, — персональные данные, доступ неограниченного круга лиц к которым предоставлен субъектом персональных данных путем дачи согласия на обработку персональных данных, разрешенных субъектом персональных данных для распространения в порядке, предусмотренном Законом о персональных данных (далее — персональные данные, разрешенные для распространения).</p>
      <p>2.10. Пользователь — любой посетитель веб-сайта https://yelyginn.ru.</p>
      <p>2.11. Предоставление персональных данных — действия, направленные на раскрытие персональных данных определенному лицу или определенному кругу лиц.</p>
      <p>2.12. Распространение персональных данных — любые действия, направленные на раскрытие персональных данных неопределенному кругу лиц (передача персональных данных) или на ознакомление с персональными данными неограниченного круга лиц, в том числе обнародование персональных данных в средствах массовой информации, размещение в информационно-телекоммуникационных сетях или предоставление доступа к персональным данным каким-либо иным способом.</p>
      <p>2.13. Трансграничная передача персональных данных — передача персональных данных на территорию иностранного государства органу власти иностранного государства, иностранному физическому или иностранному юридическому лицу.</p>
      <p>2.14. Уничтожение персональных данных — любые действия, в результате которых персональные данные уничтожаются безвозвратно с невозможностью дальнейшего восстановления содержания персональных данных в информационной системе персональных данных и/или уничтожаются материальные носители персональных данных.</p>

      <p>3. Основные права и обязанности Оператора</p>
      <p>3.1. Оператор имеет право:</p>
      <p>— получать от субъекта персональных данных достоверные информацию и/или документы, содержащие персональные данные;</p>
      <p>— в случае отзыва субъектом персональных данных согласия на обработку персональных данных, а также, направления обращения с требованием о прекращении обработки персональных данных, Оператор вправе продолжить обработку персональных данных без согласия субъекта персональных данных при наличии оснований, указанных в Законе о персональных данных;</p>
      <p>— самостоятельно определять состав и перечень мер, необходимых и достаточных для обеспечения выполнения обязанностей, предусмотренных Законом о персональных данных и принятыми в соответствии с ним нормативными правовыми актами, если иное не предусмотрено Законом о персональных данных или другими федеральными законами.</p>
      <p>3.2. Оператор обязан:</p>
      <p>— предоставлять субъекту персональных данных по его просьбе информацию, касающуюся обработки его персональных данных;</p>
      <p>— организовывать обработку персональных данных в порядке, установленном действующим законодательством РФ;</p>
      <p>— отвечать на обращения и запросы субъектов персональных данных и их законных представителей в соответствии с требованиями Закона о персональных данных;</p>
      <p>— сообщать в уполномоченный орган по защите прав субъектов персональных данных по запросу этого органа необходимую информацию в течение 10 дней с даты получения такого запроса;</p>
      <p>— публиковать или иным образом обеспечивать неограниченный доступ к настоящей Политике в отношении обработки персональных данных;</p>
      <p>— принимать правовые, организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа к ним, уничтожения, изменения, блокирования, копирования, предоставления, распространения персональных данных, а также от иных неправомерных действий в отношении персональных данных;</p>
      <p>— прекратить передачу (распространение, предоставление, доступ) персональных данных, прекратить обработку и уничтожить персональные данные в порядке и случаях, предусмотренных Законом о персональных данных;</p>
      <p>— исполнять иные обязанности, предусмотренные Законом о персональных данных.</p>

      <p>4. Основные права и обязанности субъектов персональных данных</p>
      <p>4.1. Субъекты персональных данных имеют право:</p>
      <p>— получать информацию, касающуюся обработки его персональных данных, за исключением случаев, предусмотренных федеральными законами. Сведения предоставляются субъекту персональных данных Оператором в доступной форме, и в них не должны содержаться персональные данные, относящиеся к другим субъектам персональных данных, за исключением случаев, когда имеются законные основания для раскрытия таких персональных данных. Перечень информации и порядок ее получения установлен Законом о персональных данных;</p>
      <p>— требовать от оператора уточнения его персональных данных, их блокирования или уничтожения в случае, если персональные данные являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми для заявленной цели обработки, а также принимать предусмотренные законом меры по защите своих прав;</p>
      <p>— выдвигать условие предварительного согласия при обработке персональных данных в целях продвижения на рынке товаров, работ и услуг;</p>
      <p>— на отзыв согласия на обработку персональных данных, а также, на направление требования о прекращении обработки персональных данных;</p>
      <p>— обжаловать в уполномоченный орган по защите прав субъектов персональных данных или в судебном порядке неправомерные действия или бездействие Оператора при обработке его персональных данных;</p>
      <p>— на осуществление иных прав, предусмотренных законодательством РФ.</p>
      <p>4.2. Субъекты персональных данных обязаны:</p>
      <p>— предоставлять Оператору достоверные данные о себе;</p>
      <p>— сообщать Оператору об уточнении (обновлении, изменении) своих персональных данных.</p>
      <p>4.3. Лица, передавшие Оператору недостоверные сведения о себе, либо сведения о другом субъекте персональных данных без согласия последнего, несут ответственность в соответствии с законодательством РФ.</p>

      <p>5. Принципы обработки персональных данных</p>
      <p>5.1. Обработка персональных данных осуществляется на законной и справедливой основе.</p>
      <p>5.2. Обработка персональных данных ограничивается достижением конкретных, заранее определенных и законных целей. Не допускается обработка персональных данных, несовместимая с целями сбора персональных данных.</p>
      <p>5.3. Не допускается объединение баз данных, содержащих персональные данные, обработка которых осуществляется в целях, несовместимых между собой.</p>
      <p>5.4. Обработке подлежат только персональные данные, которые отвечают целям их обработки.</p>
      <p>5.5. Содержание и объем обрабатываемых персональных данных соответствуют заявленным целям обработки. Не допускается избыточность обрабатываемых персональных данных по отношению к заявленным целям их обработки.</p>
      <p>5.6. При обработке персональных данных обеспечивается точность персональных данных, их достаточность, а в необходимых случаях и актуальность по отношению к целям обработки персональных данных. Оператор принимает необходимые меры и/или обеспечивает их принятие по удалению или уточнению неполных или неточных данных.</p>
      <p>5.7. Хранение персональных данных осуществляется в форме, позволяющей определить субъекта персональных данных, не дольше, чем этого требуют цели обработки персональных данных, если срок хранения персональных данных не установлен федеральным законом, договором, стороной которого, выгодоприобретателем или поручителем по которому является субъект персональных данных. Обрабатываемые персональные данные уничтожаются либо обезличиваются по достижении целей обработки или в случае утраты необходимости в достижении этих целей, если иное не предусмотрено федеральным законом.</p>

      <p>6. Цели обработки персональных данных</p>
      <p>Цель обработки заключение, исполнение и прекращение гражданско-правовых договоров</p>
      <p>Персональные данные</p>
      <p>фамилия, имя, отчество</p>
      <p>электронный адрес</p>
      <p>номера телефонов</p>
      <p>Правовые основания</p>
      <p>договоры, заключаемые между оператором и субъектом персональных данных</p>
      <p>Виды обработки персональных данных</p>
      <p>Сбор, запись, систематизация, накопление, хранение, уничтожение и обезличивание персональных данных</p>
      <p>Отправка информационных писем на адрес электронной почты</p>

      <p>7. Условия обработки персональных данных</p>
      <p>7.1. Обработка персональных данных осуществляется с согласия субъекта персональных данных на обработку его персональных данных.</p>
      <p>7.2. Обработка персональных данных необходима для достижения целей, предусмотренных международным договором Российской Федерации или законом, для осуществления возложенных законодательством Российской Федерации на оператора функций, полномочий и обязанностей.</p>
      <p>7.3. Обработка персональных данных необходима для осуществления правосудия, исполнения судебного акта, акта другого органа или должностного лица, подлежащих исполнению в соответствии с законодательством Российской Федерации об исполнительном производстве.</p>
      <p>7.4. Обработка персональных данных необходима для исполнения договора, стороной которого либо выгодоприобретателем или поручителем по которому является субъект персональных данных, а также для заключения договора по инициативе субъекта персональных данных или договора, по которому субъект персональных данных будет являться выгодоприобретателем или поручителем.</p>
      <p>7.5. Обработка персональных данных необходима для осуществления прав и законных интересов оператора или третьих лиц либо для достижения общественно значимых целей при условии, что при этом не нарушаются права и свободы субъекта персональных данных.</p>
      <p>7.6. Осуществляется обработка персональных данных, доступ неограниченного круга лиц к которым предоставлен субъектом персональных данных либо по его просьбе (далее — общедоступные персональные данные).</p>
      <p>7.7. Осуществляется обработка персональных данных, подлежащих опубликованию или обязательному раскрытию в соответствии с федеральным законом.</p>

      <p>8. Порядок сбора, хранения, передачи и других видов обработки персональных данных</p>
      <p>Безопасность персональных данных, которые обрабатываются Оператором, обеспечивается путем реализации правовых, организационных и технических мер, необходимых для выполнения в полном объеме требований действующего законодательства в области защиты персональных данных.</p>
      <p>8.1. Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие доступ к персональным данным неуполномоченных лиц.</p>
      <p>8.2. Персональные данные Пользователя никогда, ни при каких условиях не будут переданы третьим лицам, за исключением случаев, связанных с исполнением действующего законодательства либо в случае, если субъектом персональных данных дано согласие Оператору на передачу данных третьему лицу для исполнения обязательств по гражданско-правовому договору.</p>
      <p>8.3. В случае выявления неточностей в персональных данных, Пользователь может актуализировать их самостоятельно, путем направления Оператору уведомление на адрес электронной почты Оператора y.elyginn@gmail.com с пометкой «Актуализация персональных данных».</p>
      <p>8.4. Срок обработки персональных данных определяется достижением целей, для которых были собраны персональные данные, если иной срок не предусмотрен договором или действующим законодательством.</p>
      <p>Пользователь может в любой момент отозвать свое согласие на обработку персональных данных, направив Оператору уведомление посредством электронной почты на электронный адрес Оператора y.elyginn@gmail.com с пометкой «Отзыв согласия на обработку персональных данных».</p>
      <p>8.5. Вся информация, которая собирается сторонними сервисами, в том числе платежными системами, средствами связи и другими поставщиками услуг, хранится и обрабатывается указанными лицами (Операторами) в соответствии с их Пользовательским соглашением и Политикой конфиденциальности. Субъект персональных данных и/или с указанными документами. Оператор не несет ответственность за действия третьих лиц, в том числе указанных в настоящем пункте поставщиков услуг.</p>
      <p>8.6. Установленные субъектом персональных данных запреты на передачу (кроме предоставления доступа), а также на обработку или условия обработки (кроме получения доступа) персональных данных, разрешенных для распространения, не действуют в случаях обработки персональных данных в государственных, общественных и иных публичных интересах, определенных законодательством РФ.</p>
      <p>8.7. Оператор при обработке персональных данных обеспечивает конфиденциальность персональных данных.</p>
      <p>8.8. Оператор осуществляет хранение персональных данных в форме, позволяющей определить субъекта персональных данных, не дольше, чем этого требуют цели обработки персональных данных, если срок хранения персональных данных не установлен федеральным законом, договором, стороной которого, выгодоприобретателем или поручителем по которому является субъект персональных данных.</p>
      <p>8.9. Условием прекращения обработки персональных данных может являться достижение целей обработки персональных данных, истечение срока действия согласия субъекта персональных данных, отзыв согласия субъектом персональных данных или требование о прекращении обработки персональных данных, а также выявление неправомерной обработки персональных данных.</p>

      <p>9. Перечень действий, производимых Оператором с полученными персональными данными</p>
      <p>9.1. Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление и уничтожение персональных данных.</p>
      <p>9.2. Оператор осуществляет автоматизированную обработку персональных данных с получением и/или передачей полученной информации по информационно-телекоммуникационным сетям или без таковой.</p>

      <p>10. Трансграничная передача персональных данных</p>
      <p>10.1. Оператор до начала осуществления деятельности по трансграничной передаче персональных данных обязан уведомить уполномоченный орган по защите прав субъектов персональных данных о своем намерении осуществлять трансграничную передачу персональных данных (такое уведомление направляется отдельно от уведомления о намерении осуществлять обработку персональных данных).</p>
      <p>10.2. Оператор до подачи вышеуказанного уведомления, обязан получить от органов власти иностранного государства, иностранных физических лиц, иностранных юридических лиц, которым планируется трансграничная передача персональных данных, соответствующие сведения.</p>

      <p>11. Конфиденциальность персональных данных</p>
      <p>Оператор и иные лица, получившие доступ к персональным данным, обязаны не раскрывать третьим лицам и не распространять персональные данные без согласия субъекта персональных данных, если иное не предусмотрено федеральным законом.</p>

      <p>12. Заключительные положения</p>
      <p>12.1. Пользователь может получить любые разъяснения по интересующим вопросам, касающимся обработки его персональных данных, обратившись к Оператору с помощью электронной почты y.elyginn@gmail.com.</p>
      <p>12.2. В данном документе будут отражены любые изменения политики обработки персональных данных Оператором. Политика действует бессрочно до замены ее новой версией.</p>
      <p>12.3. Актуальная версия Политики в свободном доступе расположена в сети Интернет по адресу https://yelyginn.ru/privacy-policy.html.</p>
    </div>
  </div>
);

const CookieBanner = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COOKIE_CONSENT_KEY) !== "accepted";
  });

  const acceptCookies = () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[210] rounded-2xl border border-nothing-black/12 bg-white/95 px-4 py-3 shadow-[0_16px_40px_-24px_rgba(10,10,10,0.35)] sm:left-6 sm:right-6 md:left-auto md:max-w-xl">
      <p className="text-xs sm:text-sm leading-relaxed text-nothing-black/85">
        Сайт использует cookie и localStorage для корректной работы. Продолжая использование сайта, вы соглашаетесь с{" "}
        <a href="/privacy-policy.html" className="underline underline-offset-4 hover:text-nothing-red transition-colors">
          политикой обработки персональных данных
        </a>
        .
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={acceptCookies}
          className="rounded-full bg-nothing-black px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white hover:bg-nothing-red transition-colors"
        >
          Принять
        </button>
      </div>
    </div>
  );
};

const ProjectCard = ({ project, index, onClick }: { project: any, index: number, onClick: () => void, key?: string | number }) => {
  const [isHovered, setIsHovered] = useState(false);
  const previewSrc = getKinescopePreviewUrl(project.embedId);

  return (
    <motion.div
      variants={STAGGER_ITEM}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative group cursor-pointer overflow-hidden hardware-border rounded-[1.5rem] sm:rounded-[2.5rem] bg-nothing-black/5 w-full aspect-video"
    >
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <iframe
          key={project.embedId}
          src={previewSrc}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="eager"
          className="absolute inset-0 w-full h-full border-0 object-cover scale-110 group-hover:scale-100 transition-transform duration-700 pointer-events-none"
          title={project.title}
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-20 p-4 sm:p-8 flex flex-col justify-end bg-gradient-to-t from-nothing-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <motion.div
          animate={{ y: isHovered ? 0 : 20 }}
          transition={{ duration: 0.5, ease: NOTHING_EASE }}
        >
          <span className="ndot text-[8px] sm:text-[10px] text-nothing-white/60 mb-1 sm:mb-2 block uppercase tracking-widest">Project {index + 1}</span>
          <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-nothing-white uppercase tracking-tighter leading-none">
            {project.title}
          </h3>
        </motion.div>
      </div>

      {/* Play Icon */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-30 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full liquid-glass flex items-center justify-center">
          <Play className="w-4 h-4 sm:w-5 h-5 text-nothing-black fill-current" />
        </div>
      </div>
    </motion.div>
  );
};

const PROJECT_CATALOG = PORTFOLIO_DATA.flatMap((category) =>
  category.projects.map((project, index) => ({ category: category.category, project, index }))
);

const PROJECT_ROUTE_ENTRIES = (() => {
  const slugUsageCount = new Map<string, number>();

  return PROJECT_CATALOG.map((item) => {
    const meta = getProjectMeta(item.category, item.project, item.index);
    const baseSlug =
      SLUG_OVERRIDES[item.project.embedId] ||
      slugifyProjectTitle(meta.title) ||
      slugifyProjectTitle(item.project.title) ||
      `case-${item.index + 1}`;
    const usageCount = slugUsageCount.get(baseSlug) || 0;
    const slug = usageCount === 0 ? baseSlug : `${baseSlug}-${usageCount + 1}`;
    slugUsageCount.set(baseSlug, usageCount + 1);

    return { ...item, meta, slug };
  });
})();

const PROJECT_BY_EMBED_ID = new Map(
  PROJECT_ROUTE_ENTRIES.map((entry) => [entry.project.embedId, entry])
);

const PROJECT_BY_SLUG = new Map(
  PROJECT_ROUTE_ENTRIES.map((entry) => [entry.slug, entry])
);

const getProjectUrl = (embedId: string) => {
  const entry = PROJECT_BY_EMBED_ID.get(embedId);
  if (!entry) return `/project.html?id=${encodeURIComponent(embedId)}`;
  return `/portfolio/${entry.slug}`;
};

const PortfolioGrid = () => {
  const [activeCategory, setActiveCategory] = useState(PORTFOLIO_DATA[0].category);
  const [activeReelsGroup, setActiveReelsGroup] = useState<string | null>(null);

  const currentProjects = PORTFOLIO_DATA.find(c => c.category === activeCategory)?.projects || [];
  const isReelsCategory = activeCategory === "Reels для бизнеса";

  useEffect(() => {
    setActiveReelsGroup(null);
  }, [activeCategory]);

  const reelsGroups = isReelsCategory
    ? Object.values(
        currentProjects.reduce((acc, project) => {
          const groupName = getReelsGroupName(project.title);
          if (!acc[groupName]) {
            acc[groupName] = {
              groupName,
              projects: [] as typeof currentProjects,
            };
          }
          acc[groupName].projects.push(project);
          return acc;
        }, {} as Record<string, { groupName: string; projects: typeof currentProjects }>)
      )
    : [];

  const reelsGroupMap = isReelsCategory
    ? reelsGroups.reduce((acc, group) => {
        acc[group.groupName] = group;
        return acc;
      }, {} as Record<string, { groupName: string; projects: typeof currentProjects }>)
    : {};

  const visibleProjects = isReelsCategory
    ? activeReelsGroup
      ? currentProjects.filter((project) => getReelsGroupName(project.title) === activeReelsGroup)
      : currentProjects.reduce((acc, project) => {
          const groupName = getReelsGroupName(project.title);
          const group = reelsGroupMap[groupName];
          if (!group) {
            acc.push(project);
            return acc;
          }

          if (group.projects.length === 1) {
            acc.push(project);
            return acc;
          }

          const alreadyAdded = acc.some(
            (item) => "_groupName" in item && item._groupName === groupName
          );

          if (!alreadyAdded) {
            acc.push({
              title: group.groupName,
              embedId: group.projects[0].embedId,
              size: group.projects[0].size,
              ratio: group.projects[0].ratio,
              _isGroupCard: true,
              _groupName: group.groupName,
              _groupCount: group.projects.length,
            });
          }

          return acc;
        }, [] as Array<
          (typeof currentProjects)[number] & {
            _isGroupCard?: boolean;
            _groupName?: string;
            _groupCount?: number;
          }
        >)
    : currentProjects;

  const projectsWithMeta = visibleProjects.map((project, i) => {
    if ("_isGroupCard" in project && project._isGroupCard) {
      const groupCount =
        "_groupCount" in project && typeof project._groupCount === "number" ? project._groupCount : 1;

      return {
        ...project,
        title: `${project.title} (${groupCount})`,
        description: `Серия reels: ${groupCount} роликов.`,
        task: "Открыть серию",
      };
    }

    return {
      ...project,
      ...getProjectMeta(activeCategory, project, i),
    };
  });

  return (
    <section id="projects" className="portfolio-section pt-[clamp(2.6rem,9vw,5rem)] pb-[clamp(3.2rem,10vw,6.5rem)] px-[clamp(14px,4vw,22px)] sm:px-6 md:px-10 xl:px-12 max-w-[1720px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 sm:gap-10 mb-[clamp(1.8rem,7vw,5.5rem)]">
        <div className="max-w-2xl">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.8 }}
            className="ndot text-xs mb-4 block uppercase tracking-widest"
          >
            01 / Кейсы и видеопроекты
          </motion.span>
          <div className="text-mask">
            <motion.h2 
              initial={{ y: "100%" }}
              whileInView={{ y: 0 }}
              transition={{ duration: 1, ease: NOTHING_EASE }}
              className="text-[clamp(2.05rem,11.4vw,5.4rem)] font-bold tracking-tighter uppercase leading-[0.92] text-nothing-black"
            >
              Кейсы
            </motion.h2>
          </div>
        </div>
        
        <div className="flex flex-nowrap md:flex-wrap md:content-start gap-2 sm:gap-3 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {PORTFOLIO_DATA.map((cat) => (
            <button
              key={cat.category}
              onClick={() => {
                if (cat.category === "Reels для бизнеса") {
                  setActiveCategory("Reels для бизнеса");
                  setActiveReelsGroup(null);
                  return;
                }

                setActiveCategory(cat.category);
                setActiveReelsGroup(null);
              }}
              className={cn(
                "px-3.5 sm:px-6 py-2 sm:py-3 rounded-full font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-widest transition-all border whitespace-nowrap",
                activeCategory === cat.category 
                  ? "bg-nothing-black text-nothing-white border-transparent" 
                  : "border-nothing-black/20 hover:border-nothing-red"
              )}
            >
              {cat.category}
            </button>
          ))}
        </div>
      </div>

      {isReelsCategory && activeReelsGroup && (
        <div className="mb-6 sm:mb-8 flex items-center gap-3">
          <button
            onClick={() => setActiveReelsGroup(null)}
            className="px-4 py-2 rounded-full border border-nothing-black/20 hover:border-nothing-red font-mono text-[10px] sm:text-xs uppercase tracking-widest transition-all"
          >
            ← Все серии Reels для бизнеса
          </button>
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest opacity-70">
            {activeReelsGroup}
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {projectsWithMeta.map((project, i) => (
            <ProjectCard 
              key={project.embedId}
              project={project}
              index={i}
              onClick={() => {
                const groupName =
                  "_groupName" in project && typeof project._groupName === "string" ? project._groupName : null;

                if ("_isGroupCard" in project && project._isGroupCard && groupName) {
                  setActiveReelsGroup(groupName);
                  return;
                }

                window.location.href = getProjectUrl(project.embedId);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};

// --- Main App ---

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [moscowTime, setMoscowTime] = useState(getMoscowTime);
  const isDarkMode = false; // Switch to light mode for better readability as requested

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMoscowTime(getMoscowTime());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.2]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  const bgY = useTransform(scrollYProgress, [0, 0.5], [0, 200]);
  const bg2Y = useTransform(scrollYProgress, [0, 0.5], [0, -150]);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [personalDataAccepted, setPersonalDataAccepted] = useState(false);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const isContactValid = formContact.includes("@");
  const showContactError = (formContact.trim().length > 0 || submitAttempted) && !isContactValid;
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isPrivacyPolicyPage = pathname === "/privacy-policy" || pathname === "/privacy-policy.html";
  const isPortfolioPage = pathname === "/portfolio" || pathname === "/portfolio.html";
  const isPortfolioSlugPage = pathname.startsWith("/portfolio/");
  const isProjectPage = pathname === "/project" || pathname === "/project.html" || isPortfolioSlugPage;
  const projectSearchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const legacyProjectId = projectSearchParams?.get("id") || "";
  const slugFromPath = isPortfolioSlugPage ? pathname.replace(/^\/portfolio\//u, "").replace(/\/+$/u, "") : "";
  const slugFromQuery = projectSearchParams?.get("slug") || "";
  const projectSlug = slugFromPath || slugFromQuery;

  const openPrivacy = useCallback(() => setPrivacyOpen(true), []);
  const closePrivacy = useCallback(() => setPrivacyOpen(false), []);

  useEffect(() => {
    document.body.classList.toggle('modal-open', privacyOpen);
    return () => document.body.classList.remove('modal-open');
  }, [privacyOpen]);

  useEffect(() => {
    if (!privacyOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPrivacyOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [privacyOpen]);

  const matchedProjectEntry = (projectSlug && PROJECT_BY_SLUG.get(projectSlug)) || (legacyProjectId && PROJECT_BY_EMBED_ID.get(legacyProjectId)) || null;
  const matchedProject = matchedProjectEntry || null;
  const matchedProjectMeta = matchedProject?.meta || null;
  const projectId = matchedProject?.project.embedId || legacyProjectId;
  const projectTitle = matchedProjectMeta?.title || "Проект";
  const projectDescription = matchedProjectMeta?.description || "Описание проекта";
  const projectTask = matchedProjectMeta?.task || "Задача проекта";
  const projectRatio = matchedProject?.project.ratio || "56.25%";
  const numericRatio = Number.parseFloat(projectRatio);
  const isVerticalProject = Number.isFinite(numericRatio) ? numericRatio > 100 : false;

  useEffect(() => {
    if (!isProjectPage || typeof document === "undefined") return;
    document.title = `${projectTitle} | ELYGIN PROJECT`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        "content",
        `${projectDescription}. ${projectTask}. Видео для брендов и бизнеса в Нижнем Новгороде.`
      );
    }
  }, [isProjectPage, projectDescription, projectTask, projectTitle]);

  useEffect(() => {
    if (!isPortfolioPage || typeof document === "undefined") return;
    document.title = "Портфолио видеопроектов — рекламные ролики, Reels и event-кейсы | Yelyginn";
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        "content",
        "Портфолио видеопроектов: рекламные ролики, Reels, интервью, event-видео, архитектура и продуктовые кейсы. Продакшн и монтаж в Нижнем Новгороде."
      );
    }
  }, [isPortfolioPage]);

  const handleFormSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!privacyAccepted || !personalDataAccepted || isSubmitting) return;

    const name = formName.trim();
    const contact = formContact.trim();
    const message = formMessage.trim();
    if (!contact.includes("@")) {
      setSubmitStatus("error");
      setSubmitError("Введите Telegram (@username) или email");
      return;
    }
    if (!name || !contact || !message) {
      setSubmitStatus("error");
      setSubmitError("Заполните все поля формы.");
      return;
    }

    const envApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/u, "");
    const baseApiUrl = envApiUrl || (import.meta.env.DEV ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL);


    const endpoint = `${baseApiUrl}/send-form`;
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitError("");

    try {
      const payload = { name, contact, message };
      console.log("[form] request", {
        endpoint,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      console.log("[form] response", {
        status: response.status,
        ok: response.ok,
        body: result
      });

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Ошибка отправки");
      }

      setSubmitStatus("success");
      setFormName("");
      setFormContact("");
      setFormMessage("");
      setSubmitAttempted(false);
      setPrivacyAccepted(false);
      setPersonalDataAccepted(false);
    } catch (error) {
      console.error("[form] error", error);
      const message = error instanceof Error ? error.message : "";
      const isNetworkError = /failed to fetch|load failed|networkerror/iu.test(message);
      setSubmitStatus("error");
      setSubmitError(isNetworkError ? "Ошибка отправки" : "Ошибка отправки");
    } finally {
      setIsSubmitting(false);
    }
  }, [formName, formContact, formMessage, isSubmitting, personalDataAccepted, privacyAccepted]);

  const handleNavAnchorClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (typeof window === "undefined") return;
    const onHomePage = pathname === "/" || pathname === "/index.html";
    if (!onHomePage) return;

    event.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;

    const navHeight = window.innerWidth >= 640 ? 86 : 74;
    const y = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    if (isMenuOpen) setIsMenuOpen(false);
  }, [isMenuOpen, pathname]);

  const renderNav = (className: string) => (
    <nav className={className}>
      <div className="flex items-center gap-3 sm:gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: NOTHING_EASE }}
          className="font-mono text-[9px] sm:text-[10px] font-bold tracking-tighter uppercase flex items-center gap-2 sm:gap-3 text-nothing-black"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-2.5 h-2.5 sm:w-3 h-3 bg-nothing-red/20 rounded-full animate-ping" />
            <span className="relative w-1 h-1 sm:w-1.5 h-1.5 bg-nothing-red rounded-full" />
          </div>
          <span className="opacity-90 hidden xs:inline">ELYGIN.OS</span>
          <span className="w-[1px] h-3 bg-nothing-black/10 hidden xs:inline" />
          <span>V.2026</span>
        </motion.div>

        <div className="flex items-center p-0.5 sm:p-1 bg-nothing-black/5 rounded-full border border-nothing-black/10">
          <a
            href="/"
            className={cn(
              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2",
              true
                ? "bg-nothing-black text-nothing-white shadow-sm" 
                : "text-nothing-black/70 hover:text-nothing-black"
            )}
          >
            <Video className="w-2.5 h-2.5 sm:w-3 h-3" />
            <span className="hidden xxs:inline">Видео</span>
          </a>
          <a
            href="/photo.html"
            className={cn(
              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2",
              "text-nothing-black/70 hover:text-nothing-black"
            )}
          >
            <ImageIcon className="w-2.5 h-2.5 sm:w-3 h-3" />
            <span className="hidden xxs:inline">Фото</span>
          </a>
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6">
        <motion.div 
          initial="hidden"
          animate="show"
          variants={STAGGER_CONTAINER}
          className="hidden md:flex gap-8 font-mono text-[9px] uppercase tracking-[0.2em] text-nothing-black font-medium"
        >
          <motion.a variants={STAGGER_ITEM} href="#projects" onClick={(event) => handleNavAnchorClick(event, "projects")} className="group flex items-center gap-2 hover:text-nothing-red transition-all">
            <span className="text-nothing-red opacity-0 group-hover:opacity-100 transition-opacity">01</span> Кейсы
          </motion.a>
          <motion.a variants={STAGGER_ITEM} href="#services" onClick={(event) => handleNavAnchorClick(event, "services")} className="group flex items-center gap-2 hover:text-nothing-red transition-all">
            <span className="text-nothing-red opacity-0 group-hover:opacity-100 transition-opacity">02</span> Услуги
          </motion.a>
          <motion.a variants={STAGGER_ITEM} href="#contact" onClick={(event) => handleNavAnchorClick(event, "contact")} className="group flex items-center gap-2 hover:text-nothing-red transition-all">
            <span className="text-nothing-red opacity-0 group-hover:opacity-100 transition-opacity">04</span> Контакты
          </motion.a>
        </motion.div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-1.5 sm:p-2 text-nothing-black"
        >
          {isMenuOpen ? <X className="w-4 h-4 sm:w-5 h-5" /> : <Menu className="w-4 h-4 sm:w-5 h-5" />}
        </button>
      </div>
    </nav>
  );

  if (isPrivacyPolicyPage) {
    return (
      <div ref={containerRef} className="min-h-screen bg-nothing-white px-4 sm:px-6 md:px-10 xl:px-12 py-8 sm:py-10 md:py-12">
        <main className="max-w-[1100px] mx-auto">
          <a href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-nothing-black/70 hover:text-nothing-red transition-colors">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </a>
          <div className="mt-6 rounded-[2rem] border border-nothing-black/10 bg-white/90 p-6 sm:p-8 md:p-10">
            <PrivacyContent />
          </div>
        </main>
        <CookieBanner />
      </div>
    );
  }

  if (isPortfolioPage) {
    return (
      <div ref={containerRef} className="relative min-h-screen bg-nothing-white selection:bg-nothing-red selection:text-nothing-white overflow-x-hidden">
        <NoiseOverlay />
        <DotGrid />
        {renderNav("site-nav fixed top-[max(10px,env(safe-area-inset-top))] sm:top-6 left-1/2 -translate-x-1/2 z-50 px-3.5 sm:px-6 lg:px-8 py-1.5 sm:py-3 flex justify-between items-center glass rounded-full w-[calc(100%-0.75rem)] sm:w-[95%] max-w-[1720px] border-white/20")}
        <main className="relative z-10 pt-[clamp(5.5rem,13vw,8.5rem)] pb-[clamp(2.8rem,7vw,5rem)]">
          <section className="px-[clamp(14px,4vw,22px)] sm:px-6 md:px-10 xl:px-12 max-w-[1720px] mx-auto mb-[clamp(1.8rem,6vw,4rem)]">
            <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.28em] text-nothing-black/65">Портфолио</span>
            <h1 className="mt-2 text-[clamp(2.1rem,9.8vw,5.6rem)] font-display font-bold tracking-[-0.045em] uppercase leading-[0.9] text-nothing-black">
              Архив кейсов
            </h1>
            <p className="mt-4 max-w-3xl text-[clamp(0.98rem,3.3vw,1.24rem)] leading-[1.4] text-nothing-black/78 font-medium">
              Подборка рекламных роликов, Reels, интервью и event-видео. Нажмите на кейс, чтобы открыть отдельную страницу проекта.
            </p>
          </section>
          <PortfolioGrid />
        </main>
        <CookieBanner />
      </div>
    );
  }

  if (isProjectPage) {
    if (!projectId || !matchedProject) {
      return (
        <div className="min-h-screen bg-nothing-white px-4 sm:px-6 md:px-10 xl:px-12 py-8 sm:py-10 md:py-12">
          <main className="max-w-[900px] mx-auto">
            <a href="/#projects" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-nothing-black/70 hover:text-nothing-red transition-colors">
              <ArrowLeft className="w-4 h-4" />
              К портфолио
            </a>
            <div className="mt-6 rounded-[2rem] border border-nothing-black/10 bg-white/90 p-6 sm:p-8 md:p-10">
              <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-4">Проект не найден</h1>
              <p className="text-base sm:text-lg text-nothing-black/85 leading-relaxed">
                Проверьте ссылку или откройте проект заново из раздела кейсов.
              </p>
            </div>
          </main>
          <CookieBanner />
        </div>
      );
    }

    return (
      <div ref={containerRef} className="relative min-h-screen bg-nothing-white selection:bg-nothing-red selection:text-nothing-white overflow-x-hidden">
        <NoiseOverlay />
        <DotGrid />
        <main className="relative z-10 max-w-[1080px] mx-auto px-4 sm:px-6 md:px-8 pb-20 pt-6 sm:pt-8">
          <a
            href="/#projects"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-nothing-black/75 hover:text-nothing-red transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            К портфолио
          </a>

          <section className="mt-5 sm:mt-8">
            <div
              className={cn(
                "w-full mx-auto overflow-hidden bg-nothing-black hardware-border",
                isVerticalProject
                  ? "max-w-[420px] rounded-[1.35rem] sm:rounded-[1.75rem]"
                  : "rounded-[1.35rem] sm:rounded-[2rem]"
              )}
            >
              <div
                className={cn("relative w-full", isVerticalProject ? "pt-[177.78%]" : "pt-[56.25%]")}
              >
                <iframe
                  src={`https://kinescope.io/embed/${projectId}`}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                  frameBorder="0"
                  allowFullScreen
                  title={projectTitle}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </section>

          <section className="mt-8 sm:mt-12 space-y-4 sm:space-y-5">
            <article className="rounded-[1.25rem] sm:rounded-[1.6rem] border border-nothing-black/10 bg-white/75 p-5 sm:p-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-75 block mb-2">Проект</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-nothing-black leading-tight">
                {projectTitle}
              </h1>
            </article>
            <article className="rounded-[1.25rem] sm:rounded-[1.6rem] border border-nothing-black/10 bg-white/75 p-5 sm:p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-75 mb-2">Описание</h2>
              <p className="text-lg sm:text-xl font-semibold leading-relaxed text-nothing-black">{projectDescription}</p>
            </article>
            <article className="rounded-[1.25rem] sm:rounded-[1.6rem] border border-nothing-black/10 bg-white/75 p-5 sm:p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-75 mb-2">Задача</h2>
              <p className="text-base sm:text-lg leading-relaxed text-nothing-black/90">{projectTask}</p>
            </article>
          </section>
        </main>
        <CookieBanner />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-nothing-white selection:bg-nothing-red selection:text-nothing-white overflow-x-hidden">
      <NoiseOverlay />
      <DotGrid />
      
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-nothing-red z-[100] origin-left"
        style={{ scaleX: smoothProgress }}
      />

      {/* Navigation */}
      {renderNav("site-nav fixed top-[max(10px,env(safe-area-inset-top))] sm:top-6 left-1/2 -translate-x-1/2 z-50 px-3.5 sm:px-6 lg:px-8 py-1.5 sm:py-3 flex justify-between items-center glass rounded-full w-[calc(100%-0.75rem)] sm:w-[95%] max-w-[1720px] border-white/20 lg:hidden")}

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[100] bg-nothing-white/95 flex flex-col items-center justify-center md:hidden"
          >
            <motion.button 
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-8 right-8 p-4 rounded-full glass border-white/20 text-nothing-black"
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            <motion.div 
              variants={STAGGER_CONTAINER}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center gap-8"
            >
                {[
                { label: "Кейсы", href: "#projects", targetId: "projects" },
                { label: "Услуги", href: "#services", targetId: "services" },
                { label: "Контакты", href: "#contact", targetId: "contact" }
              ].map((link, i) => (
                <motion.a
                  key={link.label}
                  variants={STAGGER_ITEM}
                  href={link.href}
                  onClick={(event) => {
                    handleNavAnchorClick(event, link.targetId);
                    setIsMenuOpen(false);
                  }}
                  className="text-4xl sm:text-6xl font-bold uppercase tracking-tighter hover:text-nothing-red transition-colors text-nothing-black"
                >
                  <span className="font-mono text-xs opacity-80 mr-4">0{i + 1}</span>
                  {link.label}
                </motion.a>
              ))}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-12 flex gap-8"
            >
              <a href="#" className="font-mono text-xs uppercase tracking-widest opacity-80 text-nothing-black">Instagram</a>
              <a href="#" className="font-mono text-xs uppercase tracking-widest opacity-80 text-nothing-black">Telegram</a>
              <a href="#" className="font-mono text-xs uppercase tracking-widest opacity-80 text-nothing-black">Vimeo</a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key="video-portfolio"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6, ease: NOTHING_EASE }}
        >
            {/* Hero Section */}
            <section className="hero-section relative overflow-hidden">
              <div className="absolute inset-0 dot-grid -z-10" />

              <div className="relative h-[100dvh] min-h-[620px] md:min-h-[680px] overflow-hidden bg-nothing-black">
                <motion.div
                  style={{ y: bgY }}
                  className="absolute inset-0 z-0 overflow-hidden"
                >
                  <iframe
                    src="https://kinescope.io/embed/hCJmSvmN6S7P8uAnexguQ5?autoplay=1&muted=1&loop=1&playsinline=1&background=1&controls=0&title=0&byline=0&preload=auto"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                    frameBorder="0"
                    allowFullScreen
                    title="Hero background video"
                    loading="eager"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="absolute top-[52%] md:top-[51%] left-1/2 h-[116%] w-[186vw] sm:w-[164vw] md:w-[132vw] lg:w-[122vw] xl:w-[114vw] -translate-x-1/2 -translate-y-1/2 pointer-events-none transform-gpu"
                  />
                </motion.div>

                <div className="absolute inset-0 z-10 bg-gradient-to-t from-nothing-black/72 via-nothing-black/35 to-nothing-black/15" />
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-nothing-black/60 via-transparent to-nothing-black/20" />
                <div className="absolute inset-0 z-10 noise-overlay opacity-25 pointer-events-none" />

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.25, ease: NOTHING_EASE }}
                  className="hero-rail hidden lg:grid lg:grid-cols-[minmax(130px,160px)_minmax(0,1fr)_minmax(130px,160px)] items-center gap-6 px-[clamp(32px,5vw,96px)] pt-8 relative z-20"
                >
                  <div className="hero-rail-note flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/85">
                    <span>Видеопродакшн / Фото</span>
                    <span>Нижний Новгород</span>
                  </div>
                  {renderNav("site-nav site-nav-inline relative left-auto top-auto translate-x-0 z-20 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex justify-between items-center glass rounded-full w-full max-w-none border-white/20 text-white")}
                  <div className="hero-rail-note flex flex-col items-end gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/85 text-right">
                    <span>На связи</span>
                    <span>Свободные даты</span>
                  </div>
                </motion.div>

                <motion.div
                  style={{ opacity: heroOpacity }}
                  initial="hidden"
                  animate="show"
                  variants={STAGGER_CONTAINER}
                  className="absolute inset-0 z-20 flex flex-col justify-end gap-[clamp(8px,1vh,14px)] px-[clamp(14px,4.2vw,26px)] sm:px-8 md:px-10 lg:px-[clamp(32px,5vw,96px)] pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-[max(18px,env(safe-area-inset-bottom))] md:pb-[clamp(44px,5vh,72px)] pt-[max(18px,env(safe-area-inset-top))] sm:pt-[clamp(24px,3.4vh,44px)]"
                >
                  <div className="hero-copy-wrap max-w-[1240px] relative z-10">
                    <motion.div variants={STAGGER_ITEM} className="flex items-start gap-2.5 sm:gap-4 mb-2.5 sm:mb-6">
                      <div className="w-6 sm:w-12 h-[1px] mt-1 bg-nothing-red" />
                      <h2 className="font-mono text-[9px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.38em] text-white/88 leading-relaxed">
                        Рекламные ролики, Reels и видео для бизнеса
                      </h2>
                    </motion.div>

                    <h1 className="hero-headline text-[clamp(1.85rem,12.2vw,3.8rem)] sm:text-[clamp(2.35rem,9.1vw,5rem)] lg:text-[clamp(4.2rem,6.5vw,8rem)] xl:text-[clamp(4.8rem,6vw,8.8rem)] font-display font-bold leading-[0.88] tracking-[-0.052em] uppercase text-white max-w-[11ch] sm:max-w-[12ch]">
                      <div className="text-mask">
                        <motion.span variants={TEXT_REVEAL} className="block">Снимаю рекламные</motion.span>
                      </div>
                      <div className="text-mask">
                        <motion.span variants={TEXT_REVEAL} className="block">ролики и</motion.span>
                      </div>
                      <div className="text-mask text-nothing-red">
                        <motion.span variants={TEXT_REVEAL} className="block">Reels контент</motion.span>
                      </div>
                    </h1>

                    <motion.div
                      variants={STAGGER_ITEM}
                    className="hero-cta-wrap mt-2.5 sm:mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-start gap-2 sm:gap-3 w-full sm:w-auto max-w-[min(94vw,620px)]"
                    >
                      <a
                        href="#contact"
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-nothing-black/85 px-4 sm:px-6 py-3 sm:py-4 text-nothing-white transition-all duration-500 hover:bg-nothing-red"
                      >
                        <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.35em]">Обсудить проект</span>
                        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </a>
                      <a
                        href="#projects"
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border border-white/30 bg-white/8 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-white transition-all duration-500 hover:border-white/70 hover:bg-white/12"
                      >
                        <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.35em]">Посмотреть кейсы</span>
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                      </a>
                    </motion.div>
                  </div>
                  <motion.div
                    variants={STAGGER_ITEM}
                    className="mt-[clamp(8px,1.35vh,14px)] sm:mt-[clamp(12px,1.8vh,20px)] pt-[clamp(8px,1.15vh,12px)] sm:pt-[clamp(12px,1.6vh,18px)] border-t border-white/20 max-w-[860px] lg:max-w-[980px] relative z-10"
                  >
                    <p className="max-w-[38rem] text-[clamp(0.95rem,4.2vw,1.12rem)] sm:text-[clamp(1rem,2.3vw,1.25rem)] xl:text-[1.3rem] font-semibold leading-[1.3] sm:leading-[1.38] text-white/92">
                      Создаю рекламные ролики, Reels, интервью и event-видео для бизнеса в Нижнем Новгороде.
                      Делаю визуальный контент, который хочется досмотреть до конца. При необходимости дополняю
                      проект фотосъёмкой.
                    </p>

                    <div className="hero-features mt-2.5 sm:mt-4.5 hidden md:flex flex-col items-start gap-y-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 xl:gap-x-8 sm:gap-y-3.5">
                      <div className="flex items-center gap-3">
                        <Camera className="w-4 h-4 text-nothing-red" />
                        <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.22em] sm:tracking-widest text-white/90">Рекламные ролики и Reels</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Video className="w-4 h-4 text-nothing-red" />
                        <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.22em] sm:tracking-widest text-white/90">Съёмка событий и интервью</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-4 h-4 text-nothing-red" />
                        <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.22em] sm:tracking-widest text-white/90">Фотосъёмка для бренда</span>
                      </div>
                    </div>
                  </motion.div>

                  <div className="absolute z-0 inset-x-0 bottom-0 h-10 sm:h-16 md:h-20 lg:h-28 bg-gradient-to-b from-transparent via-nothing-black/10 to-nothing-white pointer-events-none transform-gpu" />
                </motion.div>
              </div>

              <div className="relative z-20">
                <Marquee compact />
              </div>
            </section>

      {/* Portfolio Section */}
      <PortfolioGrid />

      {/* Services Section */}
      <section id="services" className="services-section pt-[clamp(2.8rem,9vw,5rem)] pb-[clamp(3.5rem,10vw,7rem)] px-[clamp(14px,4vw,22px)] sm:px-6 md:px-10 xl:px-12 bg-nothing-gray/30 relative overflow-hidden">
        <div className="max-w-[1720px] mx-auto relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={STAGGER_CONTAINER}
            className="mb-[clamp(1.8rem,7vw,5.5rem)]"
          >
            <motion.span variants={STAGGER_ITEM} className="font-mono text-xs opacity-90">02</motion.span>
            <div className="text-mask">
              <motion.h2 variants={TEXT_REVEAL} className="text-[clamp(2rem,9.3vw,4.8rem)] font-bold tracking-tighter uppercase leading-[0.92]">Услуги видеопродакшна</motion.h2>
            </div>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={STAGGER_CONTAINER}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
          >
            <motion.div variants={STAGGER_ITEM} className="p-5 sm:p-7 md:p-10 hardware-border hover:bg-nothing-black hover:text-nothing-white transition-all duration-500 group rounded-[1.35rem] sm:rounded-[2rem] bg-nothing-white">
              <div className="mb-5 sm:mb-8 p-3 sm:p-4 w-fit rounded-xl sm:rounded-2xl bg-nothing-black/5 group-hover:bg-nothing-white/10 transition-colors">
                <Camera className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-[clamp(1.2rem,5.5vw,1.95rem)] font-display font-bold uppercase mb-3 sm:mb-5 tracking-tighter leading-[0.98]">Видеосъёмка для бизнеса</h3>
              <p className="text-[clamp(0.86rem,3.2vw,0.98rem)] font-medium opacity-90 group-hover:opacity-100 leading-relaxed mb-5 sm:mb-8">
                Снимаю рекламные ролики, интервью, Reels и event-видео для брендов и бизнеса в Нижнем Новгороде.
                Помогаю выстроить идею, подготовить съёмку и довести проект до готового результата.
              </p>
              <ul className="space-y-2 sm:space-y-3 font-mono text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest opacity-80 group-hover:opacity-90">
                <li>• Рекламные ролики</li>
                <li>• Интервью и event-видео</li>
                <li>• Reels и Shorts для бизнеса</li>
              </ul>
            </motion.div>
            <motion.div variants={STAGGER_ITEM} className="p-5 sm:p-7 md:p-10 hardware-border hover:bg-nothing-black hover:text-nothing-white transition-all duration-500 group rounded-[1.35rem] sm:rounded-[2rem] bg-nothing-white">
              <div className="mb-5 sm:mb-8 p-3 sm:p-4 w-fit rounded-xl sm:rounded-2xl bg-nothing-black/5 group-hover:bg-nothing-white/10 transition-colors">
                <Video className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-[clamp(1.2rem,5.5vw,1.95rem)] font-display font-bold uppercase mb-3 sm:mb-5 tracking-tighter leading-[0.98]">Монтаж и постпродакшн</h3>
              <p className="text-[clamp(0.86rem,3.2vw,0.98rem)] font-medium opacity-90 group-hover:opacity-100 leading-relaxed mb-5 sm:mb-8">
                Монтирую рекламные ролики, Reels, интервью и коммерческие видео с акцентом на ритм,
                структуру и современную визуальную подачу.
              </p>
              <ul className="space-y-2 sm:space-y-3 font-mono text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest opacity-80 group-hover:opacity-90">
                <li>• Динамичный монтаж</li>
                <li>• Цветокоррекция и звук</li>
                <li>• Версии для соцсетей и рекламы</li>
              </ul>
            </motion.div>
            <motion.div variants={STAGGER_ITEM} className="p-5 sm:p-7 md:p-10 hardware-border hover:bg-nothing-black hover:text-nothing-white transition-all duration-500 group rounded-[1.35rem] sm:rounded-[2rem] bg-nothing-white">
              <div className="mb-5 sm:mb-8 p-3 sm:p-4 w-fit rounded-xl sm:rounded-2xl bg-nothing-black/5 group-hover:bg-nothing-white/10 transition-colors">
                <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-[clamp(1.2rem,5.5vw,1.95rem)] font-display font-bold uppercase mb-3 sm:mb-5 tracking-tighter leading-[0.98]">Фотосъёмка для брендов</h3>
              <p className="text-[clamp(0.86rem,3.2vw,0.98rem)] font-medium opacity-90 group-hover:opacity-100 leading-relaxed mb-5 sm:mb-8">
                Дополняю видеопроекты фотосъёмкой для брендов, соцсетей и бизнеса.
                Снимаю портреты, репортаж и визуальный контент в едином стиле с видео.
              </p>
              <ul className="space-y-2 sm:space-y-3 font-mono text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest opacity-80 group-hover:opacity-90">
                <li>• Портретная фотосъёмка</li>
                <li>• Репортажная съёмка</li>
                <li>• Контент для бренда и соцсетей</li>
              </ul>
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 right-0 text-[20vw] font-display font-bold uppercase tracking-tighter text-nothing-black/[0.02] leading-none select-none -z-0">
          КОНТЕНТ
        </div>
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* Contact Section */}
      <section id="contact" className="contact-section py-[clamp(3rem,10vw,7rem)] px-[clamp(14px,4vw,22px)] sm:px-6 md:px-10 xl:px-12 max-w-[1720px] mx-auto">
        <div className="contact-grid grid grid-cols-1 xl:grid-cols-12 xl:items-stretch gap-8 sm:gap-10 lg:gap-14 xl:gap-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={STAGGER_CONTAINER}
            className="contact-copy xl:col-span-6 xl:h-full"
          >
            <div className="mb-[clamp(1.6rem,7vw,5.5rem)]">
              <motion.span variants={STAGGER_ITEM} className="font-mono text-xs opacity-90">03</motion.span>
              <div className="text-mask">
                <motion.h2 variants={TEXT_REVEAL} className="text-[clamp(2rem,9.2vw,4.7rem)] font-display font-bold tracking-tighter uppercase leading-[0.92]">Обсудим видеопроект</motion.h2>
              </div>
            </div>
            <motion.p variants={STAGGER_ITEM} className="text-[clamp(1.2rem,5.8vw,2.35rem)] font-semibold leading-[1.08] opacity-100 mb-7 sm:mb-10">
              Нужны рекламные ролики, Reels, event-видео или фотосъёмка для бизнеса? <br />
              Опишите задачу — помогу подобрать формат съёмки и оптимальное решение для проекта.
            </motion.p>
            
            <motion.div variants={STAGGER_ITEM} className="flex flex-col gap-3 sm:gap-6 mt-7 sm:mt-10 xl:mt-auto">
              <a href="mailto:yelyginn@gmail.com" className="group flex items-center gap-3.5 sm:gap-8 p-4 sm:p-7 hardware-border rounded-[1.25rem] sm:rounded-[2rem] hover:bg-nothing-black hover:text-nothing-white transition-all duration-500 bg-nothing-white">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full glass flex items-center justify-center group-hover:bg-nothing-red group-hover:text-nothing-white transition-all duration-300">
                  <Mail className="w-5 h-5 sm:w-6 h-6" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase opacity-90 mb-1 tracking-widest">Email</p>
                  <p className="text-[clamp(1rem,4.5vw,1.25rem)] font-bold">yelyginn@gmail.com</p>
                </div>
              </a>
              <a href="https://t.me/YuriElygin" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3.5 sm:gap-8 p-4 sm:p-7 hardware-border rounded-[1.25rem] sm:rounded-[2rem] hover:bg-nothing-black hover:text-nothing-white transition-all duration-500 bg-nothing-white">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full glass flex items-center justify-center group-hover:bg-[#0088cc] group-hover:text-nothing-white transition-all duration-300">
                  <Send className="w-5 h-5 sm:w-6 h-6" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase opacity-90 mb-1 tracking-widest">Telegram</p>
                  <p className="text-[clamp(1rem,4.5vw,1.25rem)] font-bold">@YuriElygin</p>
                </div>
              </a>
            </motion.div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: NOTHING_EASE }}
            className="contact-form liquid-glass p-5 sm:p-8 md:p-9 relative overflow-hidden group rounded-[1.5rem] sm:rounded-[2.25rem] shadow-[0_30px_90px_-40px_rgba(10,10,10,0.18)] xl:col-span-6 xl:h-full"
          >
            <div className="relative z-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-70 block mb-2.5 sm:mb-3">
                Заявка на видеосъёмку
              </span>
              <h3 className="text-[clamp(1.3rem,6vw,2.35rem)] font-bold uppercase tracking-tighter mb-2 sm:mb-3 leading-[0.93]">
                Расскажите <br /><span className="text-nothing-red">о видеопроекте</span>.
              </h3>
              <p className="max-w-lg text-[12px] sm:text-[13px] leading-relaxed text-nothing-black/66 mb-4 sm:mb-5">
                Оставьте контакт и короткое описание задачи. Помогу подобрать формат съёмки, визуальную подачу и оптимальное решение для проекта.
              </p>
              
              <form className="space-y-3.5 sm:space-y-4" onSubmit={handleFormSubmit}>
                <div className="contact-form-fields grid gap-3.5 sm:gap-4 xl:grid-cols-2">
                <div className="contact-field contact-field-name space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-90 tracking-[0.3em]">Как вас зовут</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ваше имя или название компании"
                    className="w-full bg-transparent border-b border-nothing-black/16 py-2 sm:py-2.5 focus:border-nothing-red outline-none transition-colors placeholder:opacity-45 font-semibold text-[15px] sm:text-base text-nothing-black"
                  />
                </div>
                <div className="contact-field contact-field-contact space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-90 tracking-[0.3em]">Как с вами связаться</label>
                  <input 
                    type="text" 
                    name="contact"
                    value={formContact}
                    onChange={(e) => {
                      setFormContact(e.target.value);
                      if (submitStatus !== "idle") {
                        setSubmitStatus("idle");
                        setSubmitError("");
                      }
                    }}
                    placeholder="Telegram, email или телефон"
                    aria-invalid={showContactError}
                    className={`w-full bg-transparent border-b py-2 sm:py-2.5 outline-none transition-colors placeholder:opacity-45 font-semibold text-[15px] sm:text-base ${
                      showContactError
                        ? "border-[#ff2b2b] text-[#ff2b2b]"
                        : "border-nothing-black/16 text-nothing-black focus:border-nothing-red"
                    }`}
                  />
                  {showContactError && (
                    <p className="text-[12px] text-[#ff2b2b] leading-relaxed">
                      Введите Telegram (@username) или email
                    </p>
                  )}
                </div>
                </div>
                <div className="contact-field contact-field-full space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-90 tracking-[0.3em]">Какой проект планируем</label>
                  <textarea 
                    rows={2}
                    name="message"
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="Например: рекламный ролик, Reels, интервью, event-видео или контент для бренда"
                    className="min-h-[64px] w-full bg-transparent border-b border-nothing-black/18 py-2 sm:py-2.5 focus:border-nothing-red outline-none transition-colors resize-none placeholder:opacity-50 font-semibold text-[15px] sm:text-base text-nothing-black"
                  />
                </div>
                <div className="space-y-2 rounded-[1.1rem] border border-nothing-black/8 bg-white/45 p-3 sm:p-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-68">
                    Перед отправкой подтвердите согласие
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <span className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="flex h-5 w-5 items-center justify-center rounded-md border border-nothing-black/20 bg-white transition-colors peer-checked:border-nothing-red peer-checked:bg-nothing-red peer-checked:text-white">
                        <Check className="h-3.5 w-3.5 opacity-0 transition-opacity peer-checked:opacity-100" />
                      </span>
                    </span>
                    <span className="text-[12px] sm:text-[13px] leading-relaxed text-nothing-black/76">
                      Я ознакомился с{" "}
                      <a
                        href="/privacy-policy.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline underline-offset-4 hover:text-nothing-red transition-colors"
                      >
                        политикой конфиденциальности
                      </a>
                      {" "}и согласен с условиями обработки данных.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <span className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={personalDataAccepted}
                        onChange={(e) => setPersonalDataAccepted(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="flex h-5 w-5 items-center justify-center rounded-md border border-nothing-black/20 bg-white transition-colors peer-checked:border-nothing-red peer-checked:bg-nothing-red peer-checked:text-white">
                        <Check className="h-3.5 w-3.5 opacity-0 transition-opacity peer-checked:opacity-100" />
                      </span>
                    </span>
                    <span className="text-[12px] sm:text-[13px] leading-relaxed text-nothing-black/76">
                      Даю согласие на обработку персональных данных для связи со мной по заявке.
                    </span>
                  </label>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!privacyAccepted || !personalDataAccepted || !isContactValid || isSubmitting}
                  className="w-full py-4 sm:py-4.5 bg-nothing-black text-nothing-white rounded-full font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.34em] hover:bg-nothing-red transition-all duration-500 mt-2.5 sm:mt-3 nothing-shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-nothing-black"
                >
                  {isSubmitting ? "ОТПРАВКА..." : "Обсудить проект"}
                </motion.button>
                {submitStatus === "success" && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-green-700 leading-relaxed">
                    Заявка отправлена
                  </p>
                )}
                {submitStatus === "error" && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-nothing-red leading-relaxed">
                    {submitError || "Ошибка отправки"}
                  </p>
                )}
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-55 leading-relaxed">
                  После отправки заявки свяжусь с вами в Telegram или по email.
                </p>
              </form>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-nothing-red/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </motion.div>
        </div>
      </section>

          <section id="privacy-policy" className="px-6 md:px-10 xl:px-12 max-w-[1720px] mx-auto pb-20 md:pb-28 is-hidden" aria-hidden="true">
            <div className="rounded-[2rem] border border-nothing-black/10 bg-white/70 p-8 sm:p-10 md:p-12 backdrop-blur-sm">
              <PrivacyContent />
            </div>
          </section>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {privacyOpen && (
          <motion.div
            className="privacy-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePrivacy}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
          >
            <div className="privacy-modal__backdrop" />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: NOTHING_EASE }}
              className="privacy-modal__dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="privacy-modal__header">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">Документ</span>
                <button type="button" className="privacy-modal__close" onClick={closePrivacy} aria-label="Закрыть">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="privacy-modal__content">
                <PrivacyContent />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="site-footer py-[clamp(2.9rem,9vw,6.5rem)] px-[clamp(14px,4vw,22px)] sm:px-6 md:px-10 xl:px-12 border-t border-nothing-black/10 bg-nothing-white transition-colors">
        <div className="max-w-[1720px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-8 sm:gap-10 md:gap-12 mb-12 sm:mb-20">
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <span className="font-display font-bold text-[clamp(2rem,8.5vw,2.9rem)] uppercase tracking-tighter mb-5 sm:mb-8 block text-nothing-black">ELYGIN</span>
              <p className="text-sm font-medium opacity-100 max-w-xs leading-relaxed text-nothing-black">
                Создаю рекламные ролики, Reels, интервью и event-видео для бизнеса в Нижнем Новгороде.
                При необходимости дополняю проект фотосъёмкой.
              </p>
            </div>
            
            <div>
              <span className="font-mono text-xs uppercase tracking-widest opacity-90 mb-8 block text-nothing-black">Навигация</span>
              <ul className="space-y-4 text-sm font-bold text-nothing-black">
                <li><a href="#projects" className="hover:text-nothing-red transition-colors">Кейсы</a></li>
                <li><a href="#services" className="hover:text-nothing-red transition-colors">Услуги</a></li>
                <li><a href="#contact" className="hover:text-nothing-red transition-colors">Контакты</a></li>
                <li><a href="/privacy-policy.html" className="hover:text-nothing-red transition-colors">Политика конфиденциальности</a></li>
              </ul>
            </div>

            <div>
              <span className="font-mono text-xs uppercase tracking-widest opacity-90 mb-8 block text-nothing-black">Сообщества</span>
              <ul className="space-y-4 text-sm font-bold text-nothing-black">
                <li><a href="https://t.me/YuriElygin" className="hover:text-nothing-red transition-colors">Telegram</a></li>
                <li><a href="#" className="hover:text-nothing-red transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-nothing-red transition-colors">Vimeo</a></li>
              </ul>
            </div>

            <div className="flex flex-col items-start md:items-end justify-between">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs uppercase tracking-widest opacity-90 text-nothing-black">Нижний Новгород</span>
                <div className="w-1.5 h-1.5 rounded-full bg-nothing-red animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-widest opacity-80 text-nothing-black">
                  {moscowTime}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center pt-8 sm:pt-12 border-t border-nothing-black/10">
            <div className="text-center">
              <div className="font-mono text-sm md:text-base uppercase tracking-[0.14em] opacity-90 text-nothing-black">
                © 2026 ELYGIN VIDEO & PHOTO / ВИДЕОПРОДАКШН В НИЖНЕМ НОВГОРОДЕ
              </div>
              <p className="mt-2 text-[11px] sm:text-xs text-nothing-black/60">
                Оператор: {LEGAL_OPERATOR.name}. Плательщик налога на профессиональный доход (самозанятый). ИНН: {LEGAL_OPERATOR.inn}.
              </p>
            </div>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
}
