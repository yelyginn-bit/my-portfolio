# Yelygin Studio Platform — Архитектура v2 (ЭТАП 2)

Целевая модель **поверх существующего проекта**. Приоритет: целостность системы
(hardening) + premium UX + активация прод-сервисов, НЕ добавление функций ради функций.
Закрывает пробелы из ANALYSIS: Album, Notification, AdminAction(audit), DownloadToken,
per-photo comments, watermark/rights, PriceRule в БД, SEO-пререндер DB-контента.

Документ — СПЕЦИФИКАЦИЯ (утверждается логически). DDL применяется на этапе реализации,
не сейчас. Принцип: расширять, не ломать; дефолты обратносовместимы.

---

## 1. Архитектурная схема (слои)
```
МАРКЕТИНГ (статика + острова, SEO)   APP (острова: кабинет/галерея/админка)
        │                                     │
        └──────────────┬──────────────────────┘
                       ▼
      API / Edge (Vercel functions + Supabase Edge)
   auth-* · admin-login · upload/file-url · stream · payment-* ·
   telegram-* · download · notify · admin-action · prerender(build)
                       ▼
   Supabase: Postgres + RLS + RPC + pgvector   |   JWT-мост (HS256 секретом проекта)
                       ▼
   Storage Layer (R2/S3/B2/local) · Video (Stream/local) · AI/Face (mock→real)
                       ▼
   Платежи (ЮKassa: карта+СБП; webhook → access)
```

## 2. Сущности и связи (полный список ТЗ)
Легенда: ✅ есть · ➕ добавляем (v2) · 🔁 переносим в БД.

```
User(JWT)──┐
Client ✅ ──┼──< Order ✅ ──< OrderItem ✅ ──< Payment ✅ ──▶ открывает Access
           ├──< Lead ✅ (источник→Client)
           ├──< Review ✅
           ├──< Notification ➕ (журнал отправок)
           └──< Gallery ✅ ──< Album ➕ ──< Asset(Photo/Video) ✅
                    │            └──(asset.album_id, nullable)
                    ├──< ShareLink/AccessToken ✅ (token/password/expiry)
                    ├──< DownloadToken ➕ (право+срок+лимит на скачивание)
                    ├──< Selection ✅ (like/pick/retouch/print)
                    └──< PhotoComment ➕ (коммент к конкретному asset)
Service ✅            PriceRule 🔁 (прайс калькулятора в БД)   DiscountLevel ✅(discount_tiers)
Case ✅   BlogPost ✅   Settings ✅(KV)
AdminAction ➕ (audit trail — все мутации админа)
AI: ai_tags/face_groups ✅(mock)   AssetDescription ✅(pgvector-ready)
```

## 3. Новые сущности — DDL-спецификация (v2)
> Применяется поверх `db/schema.sql`; всё обратносовместимо (nullable/seed).

**Album** — под-структура галереи (сейчас assets плоско в gallery):
```sql
create table albums (
  id uuid pk default gen_random_uuid(),
  gallery_id uuid not null references galleries(id) on delete cascade,
  title text not null, cover_asset_id uuid references assets(id) on delete set null,
  sort_order int not null default 0, created_at timestamptz default now()
);
alter table assets add column album_id uuid references albums(id) on delete set null;
-- assets без album_id = «без альбома» (текущее поведение сохраняется)
create index on albums(gallery_id, sort_order);
create index on assets(album_id);
```

**PhotoComment** — комментарии к фото в галерее:
```sql
create table photo_comments (
  id uuid pk default gen_random_uuid(),
  gallery_id uuid not null references galleries(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  viewer_key text,                       -- гость по share-токену
  author_name text, text text not null,
  created_at timestamptz default now()
);
create index on photo_comments(asset_id, created_at);
```

**DownloadToken** — право скачивания (срок/лимит/качество), вместо прямого доступа:
```sql
create type download_quality_e as enum ('original','web');  -- (или переиспользовать download_quality)
create table download_tokens (
  id uuid pk default gen_random_uuid(),
  token text unique not null,
  gallery_id uuid not null references galleries(id) on delete cascade,
  asset_id uuid references assets(id) on delete cascade,   -- null = вся галерея/zip
  quality download_quality not null default 'web',
  expires_at timestamptz, max_uses int, used_count int not null default 0,
  created_by text, created_at timestamptz default now()
);
create index on download_tokens(token);
```

**Notification** — журнал исходящих уведомлений (вместо ad-hoc Telegram):
```sql
create type notif_status as enum ('pending','sent','failed');
create table notifications (
  id uuid pk default gen_random_uuid(),
  type text not null,                    -- 'lead.new'|'payment.succeeded'|'gallery.shared'|...
  channel text not null default 'telegram',  -- telegram|email
  recipient text, payload jsonb,
  entity_type text, entity_id uuid,
  status notif_status not null default 'pending',
  error text, created_at timestamptz default now(), sent_at timestamptz
);
create index on notifications(created_at desc);
```

**AdminAction (audit trail)** — ОБЯЗАТЕЛЬНО, каждая мутация админа:
```sql
create table admin_actions (
  id uuid pk default gen_random_uuid(),
  actor text not null,                   -- sub/идентификатор админа
  action text not null,                  -- 'gallery.update'|'access.create'|'discount.change'|'notification.send'|...
  entity_type text, entity_id uuid,
  before jsonb, after jsonb,
  ip text, created_at timestamptz default now()
);
create index on admin_actions(created_at desc);
create index on admin_actions(entity_type, entity_id);
```

**PriceRule (🔁 прайс калькулятора в БД)** — заменяет конфиг `pricing.data.ts`:
```sql
create table price_rules (
  id uuid pk default gen_random_uuid(),
  shoot_type text not null,              -- «Репортаж», «Промо», ...
  kind text not null,                    -- 'base' | 'option'
  name text not null, unit text not null default 'project',  -- project|day|hour|person
  price_min int not null, price_max int not null,
  sort_order int not null default 0, active boolean not null default true
);
create index on price_rules(shoot_type, kind, sort_order);
```
Миграция: при первом запуске **сидим `price_rules` из `pricing.data.ts`** (остаётся как
seed/fallback). `calc.ts`/калькулятор читают активные правила из БД через hydrate-паттерн
(как уже сделано для `discount_tiers`): `getStore().listPriceRules()` → если пусто, конфиг.
Админ-панель «Тарифы» становится редактором БД-прайса. Скидки уже редактируемы.

**Gallery — поля v2:** `watermark_text text`, `watermark_enabled boolean default false`
(водяной знак на web-превью; оригиналы без знака — только по DownloadToken).

## 4. Роли и права (матрица; enforced через RLS + JWT)
| Сущность | anon | client (JWT sub) | admin (JWT app_role) | service_role |
|---|---|---|---|---|
| galleries/albums/assets | read public | read свои | full | full |
| share_links/download_tokens | — (через RPC) | — | full | full |
| selections/photo_comments | insert по share-доступу | свои | read all | full |
| orders/order_items | insert (воронка) | read свои | full | full |
| payments | — | read свои | read | insert/update (webhook) |
| clients | insert(upsert) | read/upd свой | full | full |
| leads | insert | — | read | full |
| reviews | read published | insert свой | moderate | full |
| cases/blog_posts | read published | — | full | full |
| price_rules/discount_tiers/settings/services | read | read | full | full |
| notifications/admin_actions | — | — | read | insert |

Hardening-замечание: anon-insert в воронку (orders/clients/selections) оставлен для
работы без регистрации; для строгой модели — перенести на serverless (service_role).

## 5. Токены доступа (явно)
- **AccessToken = `share_links.token`** — доступ к ПРОСМОТРУ галереи. Несёт `password_hash?`,
  `can_download`, `expires_at`. Резолв гостем — только через `gallery_view(token,password)` RPC.
- **DownloadToken** — отдельное право на СКАЧИВАНИЕ (качество/срок/лимит/конкретный asset|вся
  галерея). Скачивание идёт через `api/download?token=…` → валидация → подписанный URL из Storage
  → инкремент `used_count` → запись в `downloads` (лог). Разводит «смотреть» и «скачать».
- **Session JWT** — клиентский (sub=clients.user_id) / админский (app_role=admin), HS256
  секретом проекта (мост уже есть, Этап A2).

## 6. Доступ к галерее — 4 режима (явно)
1. **public share link** — `visibility='public'|'token'` + `share_links.token`; без авторизации;
   качать можно если `can_download` и есть DownloadToken/политика.
2. **password protected** — `share_links.password_hash`; парольный гейт перед просмотром (RPC проверяет).
3. **client-authenticated** — вошедший клиент видит свои галереи: RLS `client_id=current_client_id()`.
4. **admin/internal** — `app_role=admin`: видит/правит все.
Приоритет резолва: admin > client(own) > share-token(+password) > public. DownloadToken — поверх любого режима.

## 7. Потоки / жизненные циклы
- **Lead:** форма → `leads(new)` → Notification(lead.new) → админ: in_progress → won/lost → (конвертация в Client).
- **Order(смета):** калькулятор → `orders(new)` → confirmed → in_progress → done | cancelled.
- **ShopOrder:** чек-аут → `pending` → Payment(succeeded) → `paid` → Notification → доступ/скачивание.
- **Payment:** create(ЮKassa, карта|СБП) → webhook/перепроверка → `succeeded` → открывает access + статус.
- **Gallery:** draft → upload(albums/assets) → publish → share_link(active) → expired. Watermark на web.
- **Client access:** phone → Telegram-OTP → session(+JWT) → свои галереи/заказы/скидка/офферы.
- **Discount:** completedOrders → tier(`discount_tiers`) → авто-применение к новому заказу.
- **Selection/Comments:** гость/клиент отмечает/комментирует → админ видит → Export.
- **Export:** selections → CSV + списки (Capture One/Lightroom/Resolve).
- **Publication(case/post):** draft → published → пререндер в статику → индексация.
- **Audit:** любая мутация админа → `admin_actions(before/after)` (через серверный wrapper).

## 8. Security model
- RLS включён на всех таблицах (`db/policies.sql`), `is_admin()` по claim `app_role`,
  `current_client_id()` по `auth.uid()`. Платежи/notifications/admin_actions — пишет только
  service_role. Новые таблицы (albums/comments/download_tokens/price_rules) получают политики
  по матрице §4. Гостевой просмотр/скачивание — только через security-definer RPC/endpoint.
- **Audit обязателен:** админские записи идут через `api/admin-action`-обёртку (или серверные
  эндпоинты), которая пишет `admin_actions` атомарно с операцией. Клиентский admin-DataStore
  на переходный период логирует через endpoint; целевое — мутации на serverless.

## 9. SEO-индексация DB-контента (решение, не «улучшение»)
Проблема: `/cases`,`/journal` рендерятся на клиенте → пустой шелл для краулеров.
**Решение — build-time пререндер:** шаг в `buildCommand` после `vite build`:
`scripts/prerender.mjs` читает опубликованные cases/posts (из Supabase по env, иначе из
локального снапшота/JSON) и пишет статические `dist/cases/<slug>.html`, `dist/journal/<slug>.html`
с полным `<title>/meta/OG/JSON-LD(BlogPosting/CreativeWork)` + контентом в HTML; остров
гидратирует. Листинги `/cases`,`/journal` тоже получают пререндер-снимок. Приватные
(`/account`,`/admin`,`/g/:token`) — `noindex` (уже стоит). Sitemap дополняетсяслагами при сборке.

## 10. Роутинг (дополнения)
Текущие rewrites сохраняются. Добавить (прод): `/cases/:slug`→cases.html, `/journal/:slug`
(есть), `/g/:token` (+ `?album=`), `api/download`. В dev пути с `:slug`/`:token` — через `?…`.

## 11. План внедрения (что 1-м, 2-м, 3-м)
**0. Гигиена (под-шаг перед реализацией):** удалить дубли (`ai-studio-zip-project/`,
`netlify-deploy/`, `unpacked-site/`, `*.zip`), инициировать git-коммиты по этапам. *(destructive — по подтверждению.)*
**1. PROD ACTIVATION (сквозной трек, конфиг):** Supabase+R2+Stream+ЮKassa+бот, применить
`schema.sql`+`policies.sql`, env, деплой. Разблокирует реальные данные; параллелится.
**2. SCHEMA v2:** DDL §3 в `schema.sql` + DataStore-методы (Local+Supabase) + RLS §4 +
сид PriceRule. *(чисто данные, без UI — основа целостности.)*
**3. UI (ЭТАП 3):** premium-редизайн (главная + единый язык островов).
**4. AUTH-полировка:** edge-кейсы сессии, персональные офферы в кабинете.
**5. GALLERY-добивка:** albums, per-photo comments, watermark, expiry-UI, DownloadToken-флоу.
**6. CRM:** audit-журнал (AdminAction), фильтры/поиск/массовые операции, notifications-панель.
**7. SEO:** пререндер (§9), посадочные под города/ниши, перелинковка.

Ваша последовательность (Architecture → UI) сохраняется: §3-8 — «жёсткая фиксация», далее UI.
Треки 1-2 (активация+схема) можно вести параллельно UI, т.к. они data/ops, не верстка.
```
