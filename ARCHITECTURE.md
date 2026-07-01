# Yelygin Studio Platform — Архитектура

Превращение `yelyginn.ru` из сайта в платформу уровня Pixieset / Pic-Time / Wfolio
**поверх существующего проекта**, без отдельного продукта. Документ — основа для
поэтапной реализации. Ничего не удаляем; строим слоями.

---

## 1. Анализ существующего проекта

| Слой | Что есть сейчас |
|---|---|
| Фронтенд | Vite + React 19 + TS. Главная — SPA (`src/App.tsx`). Контент-страницы (`reels/event-video/photo/ceny/...`) — отдельные статичные HTML + React-острова (`calculator/account/admin`). Роутинг — мульти-entry Vite + `vercel.json` rewrites. |
| Стиль | Tailwind v4, тёмные контент-страницы (`#fe2c1f/#0a0a0a/#f5f5f4`), светлая главная. |
| Бэкенд | Vercel serverless (`api/send-form.js` → Telegram). |
| Данные | **Фазы 1–2 уже сделаны:** типы, прайс, движок скидок, **абстракция `DataStore`** (localStorage), OTP-вход (dev), кабинет, калькулятор, лёгкая админка. |
| Хостинг | **Vercel** (read-only FS, лимиты serverless ~4.5MB body / 10–60s). |

**Что переиспользуем как есть:** `src/lib/{types,pricing.*,discounts,calc,store,auth}.ts`.
Интерфейс `DataStore` уже спроектирован под замену localStorage → Supabase — это
ключ к дешёвой миграции.

### Ограничения Vercel, определяющие архитектуру
1. **Большие файлы (RAW/фото/видео) нельзя грузить через serverless** → только
   прямая загрузка в хранилище по **presigned URL**.
2. **ZIP всей галереи и транскод видео нельзя делать в serverless** (таймаут/память)
   → выносим в воркеры / провайдеров.
3. **Кабинет с галереями ≠ набор статичных островов** → нужен полноценный
   app-SPA с клиентским роутингом (React Router), маркетинг остаётся статикой ради SEO.

---

## 2. Целевая архитектура (слои)

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Vercel)                                            │
│  • Маркетинг: статичные HTML + React-острова (SEO)           │
│  • App-SPA (React Router): /cabinet, /g/:token (галерея),    │
│    /admin — авторизованная и публично-шаринговая часть       │
├─────────────────────────────────────────────────────────────┤
│ API / EDGE (Vercel functions + Supabase Edge Functions)      │
│  • presigned-upload, zip-job, payment-webhooks, og-image,    │
│    face/ai-callbacks, send-otp                               │
├─────────────────────────────────────────────────────────────┤
│ BACKEND: Supabase                                            │
│  • Postgres (схема в db/schema.sql) + RLS                    │
│  • Auth (phone OTP)  • Realtime (статусы заказов)            │
│  • pgvector (AI-поиск, эмбеддинги лиц)                        │
├─────────────────────────────────────────────────────────────┤
│ STORAGE LAYER (абстракция StorageProvider)                   │
│  • Cloudflare R2 (рекоменд., 0 egress) | S3 | B2 | Supabase  │
├─────────────────────────────────────────────────────────────┤
│ MEDIA / AI СЕРВИСЫ (интерфейсы, mock → прод)                 │
│  • VideoService: Cloudflare Stream / Mux (h264/h265, mp4/mov)│
│  • FaceService: mock → Rekognition / InsightFace-воркер      │
│  • AIService: теги/описания/поиск (vision + embeddings)      │
├─────────────────────────────────────────────────────────────┤
│ PAYMENTS (вебхуки)                                           │
│  • ЮKassa (осн., РФ) | CloudPayments | Stripe (вне РФ)       │
└─────────────────────────────────────────────────────────────┘
```

### Почему так
- **Supabase** уже выбран в Фазе 2: закрывает БД + phone-OTP auth + Storage +
  RLS + pgvector одним сервисом, есть дашборд-админка для подстраховки.
- **Cloudflare R2** для доставки медиа: S3-совместим, **без платы за egress** —
  критично для отдачи фото/видео. Абстрагирован, можно сменить на B2/S3/Supabase.
- **Cloudflare Stream / Mux** для видео: ingest mp4/mov, транскод в h264/h265,
  адаптивный плеер, подписанные ссылки. Своё ffmpeg-решение — дороже в эксплуатации.
- **ЮKassa** — основной платёж: **Stripe не работает с РФ-юрлицами**, поэтому он
  только запасной/для зарубежных клиентов.

---

## 3. Storage Layer (абстракция)

```ts
interface StorageProvider {
  presignUpload(key, mime): Promise<{ url, fields }>; // прямая загрузка с клиента
  getSignedUrl(key, ttl): Promise<string>;            // временная ссылка на отдачу
  delete(key): Promise<void>;
  copy(from, to): Promise<void>;
}
// Реализации: R2Provider (S3 API), S3Provider, B2Provider, SupabaseProvider, LocalProvider(dev)
// Выбор провайдера — по env, как сейчас getStore().
```
Конвенция ключей: `galleries/{galleryId}/orig/{assetId}.{ext}`, `.../web/...`, `.../thumb/...`.

---

## 4. Поток данных: галерея и доставка

1. **Загрузка (админ):** drag&drop → `presignUpload` → файл летит напрямую в R2 →
   создаётся `assets` (метаданные + blurhash + web/thumb-версии генерит воркер).
2. **Просмотр (клиент/гость):** `/g/:token` → RPC проверяет `share_links` (token/
   пароль/срок) → отдаёт подписанные ссылки на `thumb/web` → masonry + progressive
   (blurhash → web → original по zoom), lazy loading.
3. **Отбор:** лайк/в работу/ретушь/печать → `selections` (Realtime, админ видит сразу).
4. **Скачивание:** single/multi — подписанные ссылки; **zip всей галереи** — job в
   Edge Function/воркере (стрим в R2 → ссылка), по `download_policy`.
5. **Покупка допов** (ретушь/печать/фотокнига): `order_items` с `asset_ids` →
   оплата ЮKassa → вебхук → `payments.succeeded` → триггер открывает доступ/статус.

---

## 5. Схема БД (обзор; DDL — в `db/schema.sql`)

```
clients ──< orders ──< order_items
   │           │
   │           └──< payments                 galleries ──< assets
   ├──< login_history                           │   │        ├──< selections
   │                                             │   │        ├──< face_instances >── face_groups
clients ──< reviews                             │   │        ├──< ai_tags / asset_descriptions
                                                 │   └──< share_links
services      discount_tiers                     └──< downloads
portfolio_cases ─→ galleries        blog_posts >── blog_categories
leads          settings
```

Ключевые сущности: **clients** (CRM-ядро, привязка к Supabase Auth по `user_id`),
**galleries/assets/share_links/selections/downloads** (Pixieset-часть),
**orders/order_items/payments** (продажи), **portfolio_cases/blog_posts/reviews**
(контент), **face_groups/face_instances/ai_tags/asset_descriptions** (AI/лица,
pgvector), **services/discount_tiers/settings/leads** (конфиг и CRM).

- Скидка: уровень = по числу завершённых `orders` клиента → `discount_tiers`
  (логика уже в `discounts.ts`), применяется автоматически в калькуляторе и заказе.
- Доступ: RLS — клиент видит своё; публичная галерея — через security-definer RPC
  по токену; админ — сервисный ключ / claim `role=admin`.

---

## 6. Фронтенд: маршрутизация

- **Маркетинг (как сейчас, статика + острова, SEO):** `/`, `/photo`, `/video`,
  `/cases`, `/blog`, `/ceny`, `/calculator`, `/contacts`.
- **App-SPA (новый bundle `app.html` + React Router):**
  - `/cabinet` — фотосессии, видео, заказы, скидка/уровень, скачивания, отзывы;
  - `/g/:token` — публичная/приватная галерея (работает без регистрации);
  - `/admin/*` — Dashboard, Clients, Orders, Payments, Galleries, Photos, Videos,
    Blog, Reviews, Discounts, Settings.
- Острова `account/admin` из Фаз 2/5 станут стартовой точкой App-SPA (не выбрасываем).

---

## 7. План миграции (поверх Фаз 1–5, non-destructive)

| Этап | Содержание | Нужно от тебя |
|---|---|---|
| **A. Supabase foundation** | Создать проект, применить `db/schema.sql`, реализовать `SupabaseDataStore` (замена localStorage за тем же интерфейсом), реальный phone-OTP + SMS, RLS, перенос services/discount_tiers/leads. | Аккаунт Supabase + SMS-провайдер (SMS.ru/SMSC) |
| **B. Storage Layer + загрузка** | `StorageProvider` (R2), модель `assets`, админ drag&drop через presigned, генерация web/thumb/blurhash. | Аккаунт Cloudflare R2 |
| **C. Галереи (Pixieset-core)** | App-SPA + React Router, CRUD галерей, masonry/fullscreen/progressive/lazy, share_links (token/пароль/публичный), `selections` (лайк/пик/ретушь/печать), Realtime для админа. | — |
| **D. Скачивание** | single/multi (подписанные ссылки), zip-job, `download_policy`, лог. | — |
| **E. Видео** | VideoService (Cloudflare Stream), ingest mp4/mov, плеер, подписанные ссылки. | Аккаунт Stream/Mux |
| **F. Магазин + платежи** | `order_items` (ретушь/печать/фотокнига/сертификаты), ЮKassa + вебхуки → авто-доступ и статус. | ЮKassa (shopId+ключ) |
| **G. CRM + Админка** | Dashboard, Clients, Orders, Payments, Reviews, Discounts, Settings; управление галереями/доступом. | — |
| **H. Контент + SEO** | Портфолио-кейсы и блог из БД, schema.org, sitemap, robots, OpenGraph, Twitter Cards, OG-картинки. | — |
| **I. AI / Лица / Экспорт** | FaceService (mock→прод, pgvector-поиск), AI-теги/описания/поиск, экспорт списков выбранных файлов для Capture One / DaVinci Resolve / Lightroom. | Ключи AI/Face (по выбору) |

App-SPA вводится на этапе C; до этого кабинет/админка работают как острова.

---

## 8. Дизайн-система (50% Apple / 20% Nothing / 15% Leica / 15% Hasselblad)

- Палитра: графит/уголь `#0a0a0a`, чистый light `#f5f5f4`, единственный акцент
  `#fe2c1f`. Нейтральная шкала серого. Без градиентных «фотографских» клише.
- Типографика: крупные дисплейные заголовки (uppercase, tight tracking), моно-лейблы.
- Сетка: много воздуха, тонкие 1px-разделители, карточки с крупным радиусом.
- Медиа в центре: фото подаются как в Leica/Hasselblad — тёмный фон, минимум хрома,
  fullscreen-zoom, blur-placeholder. Микроанимации Apple-уровня (motion), без перегруза.

---

## 9. Решения, которые подтвердим перед этапами B/E/F

1. **Хранилище медиа:** Cloudflare R2 (рекоменд.) / Supabase Storage / B2 / S3.
2. **Видео-сервис:** Cloudflare Stream (рекоменд.) / Mux / своё.
3. **Платежи:** ЮKassa (осн.) — нужен статус самозанятого/ИП и магазин в ЮKassa.

Абстракции (`StorageProvider`, `VideoService`, `PaymentProvider`) позволяют начать
на простом варианте и сменить провайдера без переписывания логики.
