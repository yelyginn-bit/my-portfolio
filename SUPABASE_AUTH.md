# Этап A2 — RLS + сессия (JWT-мост)

Вход на сайте кастомный (Telegram-OTP для клиентов, пароль для админа), поэтому
для работы RLS сервер подписывает **Supabase-совместимый JWT** секретом проекта,
а клиент шлёт его в PostgREST. Никакого SMS/Supabase-Auth не требуется.

## Как это работает
- **Клиент** входит через Telegram-бота → `/api/auth-session` проверяет подтверждённый
  OTP, гарантирует `clients.user_id` (uuid) и подписывает JWT `{ sub: user_id }`.
  Клиент кладёт токен через `setSupabaseToken()` → запросы идут с `Authorization: Bearer`.
  RLS: `auth.uid() = clients.user_id` → клиент видит/правит только своё.
- **Админ** входит паролем → `/api/admin-login` (серверная проверка `ADMIN_PASSWORD`)
  → JWT с кастомным claim `app_role:'admin'`. RLS-функция `is_admin()` это читает →
  полный доступ к галереям/контенту/настройкам.
- **Гость галереи** — без токена, через security-definer RPC `gallery_view(token,password)`.
- **Вебхуки/джобы** — `service_role` (обходит RLS).

> `role` в JWT всегда `authenticated` (он маппится на роль Postgres). Админство несём
> отдельным claim `app_role`, поэтому `is_admin()` читает `auth.jwt()->>'app_role'`.

## Включение (когда Supabase живой)
1. Применить `db/schema.sql`, затем **`db/policies.sql`** (включает RLS + политики + RPC).
2. Env (серверные, не VITE_): `SUPABASE_SERVICE_ROLE_KEY`, **`SUPABASE_JWT_SECRET`**
   (Supabase → Settings → API → JWT Secret), `ADMIN_PASSWORD`.
3. Клиентские: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Redeploy. Логин-флоу не меняется — токен подтягивается автоматически.

## Без настройки
Если `SUPABASE_JWT_SECRET`/Supabase не заданы — `/api/auth-session` и `/api/admin-login`
возвращают «ок без токена», сайт работает как раньше (localStorage/anon), RLS не задействован.
`setSupabaseToken` просто не вызывается. То есть A2 безопасно «спит» до прод-настройки.

## Файлы
- `db/policies.sql` — RLS + `current_client_id()` / `is_admin()` + RPC `gallery_by_token`/`gallery_view`.
- `api/_lib/jwt.js` — подпись HS256. `api/auth-session.js` — клиентский JWT. `api/admin-login.js` — админский JWT.
- `src/lib/supabaseClient.ts` — `setSupabaseToken()` + Authorization-заголовок.
- `src/lib/auth.ts` — `bridgeSupabaseSession()` (вызывается после OTP). `signOut()` чистит токен.

## Запись данных
`clients/orders/shop/leads/selections/photo_comments` не допускают anon-insert.
Запись выполняют server endpoints с service_role после проверки согласия,
авторизации или валидного share-токена. См. `db/policies.sql` и миграцию compliance.
