# Активация прод-режима (без деплоя)

Единый чек-лист перевода сайта с dev (localStorage / имитация) на боевые сервисы.
Деталь по каждому сервису — в `SUPABASE_SETUP.md`, `SUPABASE_AUTH.md`,
`TELEGRAM_AUTH_SETUP.md`. Здесь — порядок и что от чего зависит.

Принцип: **пусто = фича недоступна в production**. Локально dev-режим
сохраняет безопасные заглушки для разработки, но опубликованный сайт не выдаёт
имитацию за реальную авторизацию, оплату или отправленную заявку.

---

## 0. Подготовка
- [ ] `cp .env.example .env`, заполнять по ходу (или Project Settings → Env Vars хостинга).
- [ ] `npm i` → `npm run build` локально проходит (база здоровья).

## 1. Supabase — БД и RLS (фундамент)
1. Создай проект на supabase.com.
2. SQL Editor → выполни **по порядку**:
   - [ ] `db/schema.sql` (таблицы, индексы, расширения; идемпотентен — 30/30 `if not exists`).
   - [ ] `db/policies.sql` (RLS + хелперы + гостевые RPC; идемпотентен — каждый `create policy` со своим `drop policy if exists`, можно перезапускать).
3. Settings → API, заполни env:
   - [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (публичные)
   - [ ] `SUPABASE_URL` (= тот же URL, для serverless)
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` (секрет, только сервер)
   - [ ] `SUPABASE_JWT_SECRET` (Settings → API → JWT Secret)
> Как только заданы `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, фронт уходит
> с localStorage на Postgres (см. `getStore()`).

## 2. Админка
- [ ] `ADMIN_PASSWORD` (серверный, не в бандле) — основной.
- [ ] Не задавать `VITE_ADMIN_PASSWORD` в production: клиентский пароль попадает в бандл.

## 3. Telegram — вход клиентов + уведомления
- [ ] `TELEGRAM_BOT_TOKEN` (BotFather), `TELEGRAM_BOT_USERNAME` (без @).
- [ ] `TELEGRAM_CHAT_ID` — куда падают лиды/оплаты/комментарии.
- [ ] `TELEGRAM_WEBHOOK_SECRET` — любая случайная строка.
- [ ] Установить вебхук: открыть `https://<домен>/api/telegram-set-webhook?secret=<тот_же_секрет>` (ответ `ok:true`).
> Включает: OTP-вход, уведомления `lead.new` / `gallery.shared` / `payment.succeeded` / `comment.new`.
> В production вход в кабинет без настроенного Telegram-бота отключён. Код на экране доступен только локально.

## 4. Cloudflare R2 — файлы галерей
- [ ] Создай бакет; API-токен S3 (Account → R2 → Manage API Tokens).
- [ ] env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
- [ ] (опц.) `R2_PUBLIC_BASE` — публичный домен бакета; иначе ссылки подписываются.
- [ ] **CORS бакета**: разрешить `PUT` и `GET` с домена сайта (для presigned-загрузки/превью).
- [ ] Переключить **последним**: `VITE_STORAGE_PROVIDER="r2"`.
> До переключения провайдера в "r2" не трогай — иначе галереи не загрузятся.

## 5. Cloudflare Stream — видео (опц.)
- [ ] `VITE_CF_STREAM_CUSTOMER` (код плеера), `CF_STREAM_ACCOUNT_ID`, `CF_STREAM_TOKEN` (права Stream).
- [ ] `CF_STREAM_MAX_DURATION` — лимит в секундах (по умолчанию 3600).

## 6. ЮKassa — оплаты (опц.)
- [ ] `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET` (ЛК ЮKassa).
- [ ] Вебхук `payment.succeeded` → `https://<домен>/api/payment-webhook`.
> Без этих переменных production-оплата возвращает понятную ошибку и не помечает заказ оплаченным.

## 7. Аналитика и согласие
- [ ] `VITE_GA_ID` — идентификатор Google Analytics 4, если используется.
- [ ] `VITE_YANDEX_METRIKA_ID` — числовой идентификатор Яндекс Метрики, если используется.
> Счётчики загружаются только после согласия пользователя в cookie-баннере.
> Цели Метрики: `lead_submit`, `telegram_click`, `calculator_use`,
> `portfolio_view`, `discuss_project_click`.

## 7.1. Что видит клиент до подключения интеграций
- Форма заявки открывает Telegram с заполненным брифом, если серверная доставка не настроена.
- Кабинет сообщает о подключении защищённого входа и предлагает связаться напрямую.
- Галерея заменяет недоступную онлайн-оплату согласованием заказа в Telegram.
- Локальные коды, имитация платежей и localStorage-админка в production не выдаются за реальные сервисы.

---

## 8. Проверка после активации
- [ ] `/admin` — вход по `ADMIN_PASSWORD`; вкладки грузятся из БД (не пусто после действий).
- [ ] Создать галерею → загрузить фото (R2) → «Поделиться» → открыть `/g/<token>` инкогнито.
- [ ] В `/g`: отметка, комментарий → прилетает в Telegram (`comment.new`); скачивание web с водяным знаком (если включён).
- [ ] «Токен на оригиналы» / `?share=` → `/api/download` отдаёт оригинал; чужой ключ через `/api/file-url` — отклоняется (харден).
- [ ] Лид с главной → запись в `/admin → Заявки` + Telegram.
- [ ] Прайс: «Засеять из конфига» → калькулятор берёт цены из БД.
- [ ] `/admin → История` пишет действия; `/admin → Уведомления` — события доставки.
- [ ] Проверить canonical, sitemap и robots.txt на боевом домене.
- [ ] Проверить GA4/Метрику после принятия cookie и отсутствие запросов до согласия.
- [ ] Lighthouse: основные страницы без критических ошибок по Performance, Accessibility, Best Practices и SEO.

## Откат
Локальный dev возвращается к localStorage очисткой `VITE_SUPABASE_*`.
В production отключённый сервис остаётся недоступным и показывает ошибку конфигурации.
