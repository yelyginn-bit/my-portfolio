# Подключение Supabase (Этап A) — пошагово

Код уже готов: как только заданы ключи, сайт автоматически переключается с
localStorage на реальную БД (`getStore()` сам выбирает провайдера). Без ключей
всё продолжает работать локально.

## 1. Создать проект
1. Зайти на https://supabase.com → New project.
2. Регион — ближе к РФ (Frankfurt). Сохранить пароль БД.

## 2. Применить схему
1. Supabase → **SQL Editor** → New query.
2. Вставить содержимое `db/schema.sql` → **Run**.
3. (Позже, на Этапе A2 — после включения Auth) применить `db/policies.sql`.

## 3. Прописать ключи
Supabase → **Settings → API**. Скопировать:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` ключ → `VITE_SUPABASE_ANON_KEY`
- `service_role` ключ → `SUPABASE_SERVICE_ROLE_KEY` (**только серверно!**)

Локально — в `.env` (см. `.env.example`). На Vercel — **Settings → Environment
Variables** в проекте `my-portfolio-github-copy`. После добавления — redeploy.

## 4. Засеять услуги и скидки (опц.)
Калькулятор берёт прайс из `src/lib/pricing.*`. Чтобы тарифы/скидки
редактировались из БД — перенести их в таблицы `services` / `discount_tiers`
(сделаю на Этапе G «Settings»). Сейчас не требуется.

## 5. Проверка
1. `.env` с ключами → `npm run build` → открыть `/calculator`, оформить заявку.
2. В Supabase → **Table editor → orders / clients** должна появиться строка.
3. Без ключей данные остаются в localStorage — это нормально.

## Что дальше (Этап A2 — phone-OTP на Supabase Auth)
- Включить **Authentication → Providers → Phone**, подключить SMS-провайдера.
  ⚠️ Supabase из коробки поддерживает Twilio/Vonage/MessageBird/Textlocal.
  Для надёжной доставки на РФ-номера — Twilio (платно) либо кастомный OTP через
  собственный `api/send-otp` + SMS.ru (тогда сессию ведём сами). Выбор обсудим.
- Применить `db/policies.sql` (RLS).
- Рефактор `auth.ts`: `getSession()` → кэш из `supabase.auth` + `onAuthStateChange`,
  чтобы кабинет реагировал на вход без перезагрузки.

> Важно: `service_role` ключ — только в серверных переменных (`api/*`), НИКОГДА
> не в `VITE_*` (они попадают в браузерный бандл).
