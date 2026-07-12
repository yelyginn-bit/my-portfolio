# Карта сайта yelyginn.ru — структура, разделы, функционал

Архитектура: **гибрид** — статические HTML-страницы (маркетинг/SEO) + React-«острова»
(интерактив монтируется в `<div id="root">`). Маршруты → файлы заданы в `vercel.json`
(rewrites) и `vite.config.ts` (входные точки сборки).

Бренд: основная тема белая, тёмный видеогерой, акцент красный `#fe2c1f`, шрифт Inter.
Уровень — Apple/Nothing/Leica/Hasselblad.

---

## 1. ПУБЛИЧНЫЕ СТРАНИЦЫ (маркетинг + SEO)

| URL | Файл | Назначение |
|---|---|---|
| `/` | `index.html` → `src/App.tsx` | Главная (React-приложение) |
| `/portfolio` | `portfolio.html` | Список работ |
| `/portfolio/reels` | `portfolio-reels.html` → `src/portfolio/` | Портфолио Reels / Shorts |
| `/portfolio/events` | `portfolio-events.html` → `src/portfolio/` | Event-видео и мероприятия |
| `/portfolio/concerts` | `portfolio-concerts.html` → `src/portfolio/` | Концерты и live-выступления |
| `/portfolio/photo` | `portfolio-photo.html` → `src/portfolio/` | Фотопортфолио |
| `/portfolio/editing` | `portfolio-editing.html` → `src/portfolio/` | Портфолио монтажа |
| `/portfolio/:slug`, `/project` | `project.html` | Страница отдельного проекта |
| `/content-day` | `content-day.html` → `src/portfolio/` | Продающая страница «Контент-день» |
| `/photo` | `photo.html` | Раздел фотографии |
| `/reels` | `reels.html` | Лендинг: Reels для бизнеса |
| `/reklamnye-roliki` | `reklamnye-roliki.html` | Лендинг: рекламные ролики |
| `/event-video` | `event-video.html` | Лендинг: event-видео |
| `/video-dlya-marketpleysov` | `video-dlya-marketpleysov.html` | Лендинг: видео для маркетплейсов |
| `/ceny` | `ceny.html` | Цены (статический прайс) |
| `/calculator` | `calculator.html` → `src/calculator/` | **Калькулятор стоимости** (React) |
| `/cases` | `cases.html` → `src/cases/` | **Кейсы-портфолио** (React, из БД) |
| `/journal`, `/journal/:slug` | `journal.html` → `src/journal/` | **Журнал/блог** (React, из БД) |
| `/blog`, `/blog/:slug` | `blog/*.html` | Статьи (статические, 4 шт.) |
| `/privacy-policy` | `legal.html` | Политика обработки персональных данных |
| `/personal-data-consent` | `legal.html` | Согласие на обработку данных |
| `/cookie-policy` | `legal.html` | Политика cookies |
| `/terms` | `legal.html` | Условия оказания услуг |
| `/payment-terms` | `legal.html` | Оплата и ручной чек НПД |
| `/cancellation-refund` | `legal.html` | Отмена и возврат |
| `/gallery-terms` | `legal.html` | Условия клиентских галерей |
| `/data-request` | `legal.html` | Запросы по данным |
| `robots.txt`, `sitemap.xml`, `google…/yandex…html` | — | SEO / верификация |

### Главная `/` (`src/App.tsx`) — секции (якоря)
- **Hero** — заголовок, CTA.
- `#services` — услуги.
- `#projects` (`/#projects`) — проекты/портфолио.
- «Как я работаю», цифры доверия, FAQ, CTA-сетка.
- `#testimonials` — отзывы (тянутся из БД, опубликованные).
- `#contact` — **форма заявки** (имя/контакт/задача → Telegram + сохранение лида).
- Верхнее меню ведёт на: `/`, `#services`, `#projects`, `/calculator`, `/cases`, `/journal`, `/account`, контакты (`t.me/YuriElygin`, `mailto:`).

---

## 2. КАЛЬКУЛЯТОР `/calculator` (`src/calculator/Calculator.tsx`)
- Выбор типа съёмки, опций, количества — расчёт «вилки» цены.
- Цены берутся из БД (`price_rules`) с фолбэком на конфиг (`pricing.config.ts`).
- Скидки по числу завершённых заказов клиента (`discounts.ts`).
- Логика расчёта: `src/lib/calc.ts`, `pricing.runtime.ts`.

---

## 3. КЛИЕНТСКАЯ ГАЛЕРЕЯ `/g/:token` (`src/gallery/Gallery.tsx`)
Доступ по share-ссылке без регистрации. **4 режима доступа**: публичная / по паролю / по ссылке-токену / приватная (клиент).
- **Masonry-сетка** с progressive/blur-загрузкой.
- **Лайтбокс**: zoom, стрелки, клавиши ←/→/Esc.
- **Отметки фото**: ♥ Нравится / ✂ На ретушь / ⎙ На печать (видны фотографу).
- **Комментарии к фото** (панель в лайтбоксе; уведомление фотографу).
- **Альбомы**: фильтр-чипы + секции-заголовки с обложками.
- **Поиск по тегам** (AI) + **фильтр по людям** (распознавание лиц).
- **Скачивание**: web-версия (+водяной знак, если включён) или оригинал по токену (`/api/download`).
- **Видео**: плеер (Cloudflare Stream / нативный).
- **Заказ** (🛒): чек-аут с оплатой (`src/gallery/Checkout.tsx`) — ретушь/печать → ЮKassa/СБП.

---

## 4. ЛИЧНЫЙ КАБИНЕТ `/account` (`src/account/Account.tsx`)
- **Вход через Telegram-бота** (код подтверждения, без SMS).
- Профиль: имя, телефон.
- **Список заказов** со статусами: Новая / Подтверждён / В работе / Завершён / Отменён.
- История по заказам/сменам.

---

## 5. АДМИН-ПАНЕЛЬ `/admin` (`src/admin/Admin.tsx`)
Вход по паролю. Вкладки (`Tab`):

| Вкладка | Файл | Функционал |
|---|---|---|
| **Сводка** | `Dashboard.tsx` | KPI, выручка (без отменённых) |
| **Заказы** | `Admin.tsx` | заказы клиентов, статусы |
| **Клиенты** | `Admin.tsx` | база клиентов |
| **Заявки** | `Admin.tsx` | лиды с форм |
| **Галереи** | `Galleries.tsx` | создание, drag&drop загрузка фото/видео, обложка, доступ (4 режима), **альбомы** (CRUD, реордеринг ‹›, обложка кликом), водяной знак, «Поделиться», «Токен на оригиналы», AI-теги, распознавание лиц, экспорт выбора (C1/LR/Resolve), комментарии клиента |
| **Платежи** | `Admin.tsx` | платежи/транзакции |
| **Отзывы** | `Reviews.tsx` | модерация (публикация/удаление) |
| **Кейсы** | `Cases.tsx` | портфолио-кейсы (создание/публикация) |
| **Блог** | `BlogAdmin.tsx` | посты журнала (markdown, SEO-поля) |
| **Прайс** | `PriceRules.tsx` | редактор цен калькулятора (БД), сид из конфига |
| **Тарифы и скидки** | `Admin.tsx` | уровни скидок |
| **Настройки** | `SettingsPanel.tsx` | уровни скидок, реквизиты студии, политика скачивания |
| **Уведомления** | `Notifications.tsx` | журнал событий (lead/share/payment/comment) + статус доставки |
| **История** | `AuditLog.tsx` | audit trail: кто/что/до→после |

---

## 6. SERVERLESS API (`api/`)
| Эндпоинт | Назначение |
|---|---|
| `send-form.js` | заявка с формы → Telegram |
| `notify.js` | уведомления админу (lead/share/payment/comment) |
| `auth-request/verify/session/status.js` | вход клиента через Telegram-OTP |
| `admin-login.js` | вход админа (JWT) |
| `telegram-webhook.js`, `telegram-set-webhook.js` | бот: коды входа, кнопки |
| `upload-url.js`, `file-url.js` | R2: presigned загрузка/выдача (с авторизацией) |
| `download.js` | выдача оригиналов по download-token / share-token |
| `stream-upload-url.js` | загрузка видео в Cloudflare Stream |
| `payment-create.js`, `payment-webhook.js`, `payment-status.js` | оплаты ЮKassa/СБП |
| `_lib/` | db, jwt, r2, telegram, util (общие хелперы) |

---

## 7. ДАННЫЕ И ЛОГИКА (`src/lib/`)
- `store.ts` / `supabaseStore.ts` — абстракция данных (localStorage в dev, Supabase в проде).
- `types.ts` — все сущности (Gallery, Asset, Album, Order, Lead, Client, Review, PortfolioCase, BlogPost, PriceRule, Notification, AdminAction, PhotoComment, DownloadToken…).
- `auth.ts`, `storage.ts`, `download.ts`, `video.ts`, `products.ts`, `export.ts`, `ai.ts`, `face.ts`, `audit.ts`, `notify.ts`, `discounts.ts`, `calc.ts`, `pricing.*`.

---

## 8. КАРТА ПЕРЕХОДОВ (навигация)
```
Главная /
├── меню → #services, #projects, /calculator, /cases, /journal, /account
├── форма #contact → заявка
├── лендинги услуг: /reels /reklamnye-roliki /event-video /video-dlya-marketpleysov
├── /ceny, /photo, /portfolio → /portfolio/:slug
├── /portfolio → /portfolio/reels, /events, /concerts, /photo, /editing
├── /content-day → /portfolio/reels, Telegram
├── /cases (кейсы) , /journal → /journal/:slug , /blog → /blog/:slug
├── /calculator → расчёт → заявка
├── /account (вход TG) → заказы
├── /g/:token (галерея клиента) → отбор/коммент/скачать/🛒 заказ → оплата
└── /admin (по паролю) → 15 вкладок управления
```
