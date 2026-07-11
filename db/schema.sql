-- ============================================================================
-- Yelygin Studio Platform — схема БД (PostgreSQL / Supabase)
-- ============================================================================
-- Назначение: единая БД для маркетинга, кабинета клиента, галерей, заказов,
-- платежей, CRM и админки. Файлы (фото/видео) НЕ хранятся в БД — только
-- метаданные и ключ в объектном хранилище (Storage Layer: R2/S3/B2/Supabase).
--
-- Применять в Supabase SQL Editor. Безопасно к повторному запуску (IF NOT EXISTS).
-- RLS-политики в конце — включаются на этапе подключения Supabase Auth (Фаза A).
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";      -- эмбеддинги для AI-поиска / лиц (pgvector)

-- ─── ENUMs ──────────────────────────────────────────────────────────────────
do $$ begin
  create type asset_type        as enum ('photo','video');
  create type gallery_visibility as enum ('public','private','password','token');
  create type download_quality   as enum ('original','web','none');
  create type selection_kind     as enum ('like','pick','retouch','print');
  create type order_status        as enum ('new','confirmed','in_progress','done','cancelled');
  create type order_item_kind     as enum ('shoot','retouch','print','extra_photo','extra_edit','photobook','certificate','other');
  create type payment_provider    as enum ('yookassa','cloudpayments','stripe');
  create type payment_status      as enum ('pending','succeeded','canceled','refunded');
  create type lead_status         as enum ('new','in_progress','won','lost');
exception when duplicate_object then null; end $$;

-- ─── Клиенты / CRM-ядро ───────────────────────────────────────────────────────
-- Связь с Supabase Auth: clients.user_id → auth.users.id (phone-OTP вход).
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique,                       -- auth.users.id (nullable до первого входа)
  phone           text unique not null,              -- нормализованный 7XXXXXXXXXX
  name            text,
  email           text,
  notes           text,                              -- заметки для CRM
  created_at      timestamptz not null default now()
);
create index if not exists idx_clients_phone on clients(phone);

create table if not exists login_history (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ─── Каталог услуг и скидки (читает калькулятор и магазин) ─────────────────────
create table if not exists services (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  description  text,
  category     text not null,                        -- 'photo' | 'video' | 'addon'
  base_price   integer not null default 0,           -- в рублях
  unit         text not null default 'project',      -- 'project'|'day'|'hour'|'person'|'item'
  active       boolean not null default true,
  sort_order   integer not null default 0
);

create table if not exists discount_tiers (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,                  -- 'new'|'repeat'|'regular'|'vip'
  label       text not null,
  min_orders  integer not null,                      -- порог по завершённым заказам
  percent     integer not null,                      -- 0..100
  active      boolean not null default true
);

-- ─── Галереи и медиа ──────────────────────────────────────────────────────────
create table if not exists galleries (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references clients(id) on delete set null,
  title           text not null,
  slug            text unique,
  description     text,
  shoot_date      date,
  cover_asset_id  uuid,                               -- FK добавлен после assets (ниже)
  visibility      gallery_visibility not null default 'private',
  password_hash   text,                               -- если visibility='password'
  download_policy download_quality not null default 'web',
  published       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Файл (фото/видео). storage_provider+storage_key — это и есть Storage Layer.
create table if not exists assets (
  id               uuid primary key default gen_random_uuid(),
  gallery_id       uuid references galleries(id) on delete cascade,
  type             asset_type not null,
  storage_provider text not null default 'r2',        -- 'r2'|'s3'|'b2'|'supabase'|'local'
  storage_key      text not null,                      -- путь/ключ оригинала
  web_key          text,                               -- сжатая web-версия
  thumb_key        text,                               -- превью
  filename         text,
  mime             text,
  width            integer,
  height           integer,
  duration_sec     numeric,                            -- для видео
  size_bytes       bigint,
  blurhash         text,                               -- placeholder для progressive loading
  video_provider   text,                               -- 'cloudflare_stream'|'mux'|null
  video_uid        text,                               -- id во внешнем видео-сервисе
  ai_tags          text[] default '{}',                 -- AI-теги (Этап I)
  face_group       text,                                -- группа лица (Этап I)
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_assets_gallery on assets(gallery_id, sort_order);

alter table galleries
  drop constraint if exists galleries_cover_fk,
  add  constraint galleries_cover_fk foreign key (cover_asset_id) references assets(id) on delete set null;

-- Шаринговые ссылки: токен / пароль / срок. Работают без регистрации.
create table if not exists share_links (
  id            uuid primary key default gen_random_uuid(),
  gallery_id    uuid not null references galleries(id) on delete cascade,
  token         text unique not null,                 -- случайный, в URL
  password_hash text,
  can_download  boolean not null default false,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_share_links_token on share_links(token);

-- Выбор клиента: лайк / в работу / на ретушь / на печать.
create table if not exists selections (
  id          uuid primary key default gen_random_uuid(),
  gallery_id  uuid not null references galleries(id) on delete cascade,
  asset_id    uuid not null references assets(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  viewer_key  text not null,                            -- 'phone:<..>' (вошёл) | 'token:<..>' (гость)
  kind        selection_kind not null,
  created_at  timestamptz not null default now(),
  unique (asset_id, viewer_key, kind)                   -- защита от дублей
);
create index if not exists idx_selections_gallery on selections(gallery_id, kind);

-- Лог скачиваний.
create table if not exists downloads (
  id            uuid primary key default gen_random_uuid(),
  gallery_id    uuid references galleries(id) on delete set null,
  asset_id      uuid references assets(id) on delete set null,   -- null для zip всей галереи
  client_id     uuid references clients(id) on delete set null,
  share_link_id uuid references share_links(id) on delete set null,
  scope         text not null,                         -- 'single'|'multi'|'zip'
  quality       download_quality not null default 'web',
  ip            text,
  created_at    timestamptz not null default now()
);

-- ─── Заказы и платежи ─────────────────────────────────────────────────────────
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references clients(id) on delete set null,
  gallery_id       uuid references galleries(id) on delete set null,
  status           order_status not null default 'new',
  subtotal         integer not null default 0,
  discount_percent integer not null default 0,
  total            integer not null default 0,
  currency         text not null default 'RUB',
  comment          text,
  source           text,                               -- 'calculator'|'gallery'|'homepage'
  selection_json   jsonb,                              -- снимок выбора калькулятора (OrderSelection)
  breakdown_json   jsonb,                              -- полная вилка цен (PriceBreakdown: min/max до/после скидки)
  created_at       timestamptz not null default now()
);
create index if not exists idx_orders_client on orders(client_id, created_at desc);

-- Ручной учёт чеков НПД. Сайт не формирует и не регистрирует чек автоматически.
do $$ begin
  create type receipt_status as enum ('not_required','pending','issued','cancelled');
exception when duplicate_object then null; end $$;
alter table orders add column if not exists payment_confirmed_at timestamptz;
alter table orders add column if not exists receipt_status receipt_status not null default 'not_required';
alter table orders add column if not exists receipt_issued_at timestamptz;
alter table orders add column if not exists receipt_number text;
alter table orders add column if not exists receipt_url text;
alter table orders add column if not exists receipt_delivery_method text;
alter table orders add column if not exists receipt_sent_at timestamptz;
alter table orders add column if not exists receipt_admin_comment text;

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  service_id  uuid references services(id) on delete set null,
  kind        order_item_kind not null default 'other',
  title       text not null,
  qty         integer not null default 1,
  unit_price  integer not null default 0,
  total       integer not null default 0,
  asset_ids   jsonb                                    -- какие фото (ретушь/печать/доп)
);

create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  provider            payment_provider not null,
  provider_payment_id text,                            -- id платежа у провайдера
  amount              integer not null,
  currency            text not null default 'RUB',
  status              payment_status not null default 'pending',
  raw                 jsonb,                            -- сырой ответ/вебхук
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);
create index if not exists idx_payments_order on payments(order_id);
create unique index if not exists uq_payments_provider_id on payments(provider, provider_payment_id);

-- ─── Портфолио / Блог / Отзывы ────────────────────────────────────────────────
create table if not exists portfolio_cases (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  client_name  text,
  title        text not null,
  task         text,                                   -- задача
  solution     text,                                   -- решение
  result       text,                                   -- результат
  cover_asset_id uuid references assets(id) on delete set null,
  gallery_id   uuid references galleries(id) on delete set null,  -- медиа кейса
  published    boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Административные поля проверки прав; публичные запросы их не выводят.
alter table portfolio_cases add column if not exists rights_status text;
alter table portfolio_cases add column if not exists client_permission_status text;
alter table portfolio_cases add column if not exists people_consent_status text;
alter table portfolio_cases add column if not exists music_license_status text;
alter table portfolio_cases add column if not exists brand_usage_status text;
alter table portfolio_cases add column if not exists project_role text;
alter table portfolio_cases add column if not exists production_team text;
alter table portfolio_cases add column if not exists rights_note text;
alter table portfolio_cases add column if not exists publish_allowed boolean not null default false;

create table if not exists blog_categories (
  id     uuid primary key default gen_random_uuid(),
  slug   text unique not null,
  title  text not null
);

create table if not exists blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  excerpt         text,
  body_md         text,                                 -- markdown
  cover_asset_id  uuid references assets(id) on delete set null,
  category_id     uuid references blog_categories(id) on delete set null,
  tags            text[] default '{}',
  seo_title       text,
  seo_description text,
  og_image_url    text,
  published       boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete set null,
  author_name text,
  rating      integer check (rating between 1 and 5),
  text        text,
  gallery_id  uuid references galleries(id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Заявки (лиды) ─────────────────────────────────────────────────────────────
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  contact     text,
  message     text,
  source      text,
  status      lead_status not null default 'new',
  created_at  timestamptz not null default now()
);

-- ─── AI / распознавание лиц (архитектурно готово, заполняется воркерами) ────────
create table if not exists face_groups (
  id             uuid primary key default gen_random_uuid(),
  gallery_id     uuid not null references galleries(id) on delete cascade,
  label          text,                                 -- имя человека (опц.)
  cover_asset_id uuid references assets(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists face_instances (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references assets(id) on delete cascade,
  face_group_id uuid references face_groups(id) on delete set null,
  bbox          jsonb,                                  -- {x,y,w,h}
  embedding     vector(512),                            -- для поиска похожих лиц
  confidence    numeric,
  source        text default 'mock'                     -- 'mock'|'rekognition'|'insightface'
);

create table if not exists ai_tags (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references assets(id) on delete cascade,
  tag         text not null,
  confidence  numeric,
  source      text default 'mock'
);

create table if not exists asset_descriptions (
  asset_id    uuid primary key references assets(id) on delete cascade,
  description  text,
  embedding    vector(1536),                            -- для семантического поиска по галереям
  source       text default 'mock',
  created_at   timestamptz not null default now()
);

-- ─── Telegram-вход (OTP через бота) ──────────────────────────────────────────
-- Привязка телефона к чату Telegram (бот может писать только тем, кто его запустил).
create table if not exists telegram_links (
  id          uuid primary key default gen_random_uuid(),
  phone       text unique not null,                   -- нормализованный 7XXXXXXXXXX
  chat_id     bigint not null,                         -- куда бот шлёт коды
  tg_user_id  bigint,
  username    text,
  first_name  text,
  linked_at   timestamptz not null default now()
);
create index if not exists idx_tg_links_chat on telegram_links(chat_id);

-- Запросы на вход: код + токен (для deep-link/опроса статуса). Один раз, с TTL.
create table if not exists auth_otp (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code        text,                                    -- legacy, не использовать для новых OTP
  code_hash   text,                                    -- SHA-256 шестизначного OTP
  token       text unique not null,                    -- для deep-link и polling статуса
  method      text not null default 'code',            -- 'code' | 'link' | 'confirm'
  status      text not null default 'pending',         -- 'pending' | 'confirmed' | 'expired'
  chat_id     bigint,                                   -- куда отправлен код (если привязка есть)
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_auth_otp_phone on auth_otp(phone, created_at desc);
create index if not exists idx_auth_otp_token on auth_otp(token);
alter table auth_otp add column if not exists attempts integer not null default 0;
alter table auth_otp add column if not exists used_at timestamptz;
alter table auth_otp add column if not exists session_issued_at timestamptz;
alter table auth_otp add column if not exists request_ip inet;

-- ─── Настройки / KV ────────────────────────────────────────────────────────────
create table if not exists settings (
  key         text primary key,
  value       jsonb,                                  -- nullable: паритет с LocalDataStore (null == отсутствие)
  updated_at  timestamptz not null default now()
);

-- ─── Сущности v2 (ARCHITECTURE-v2.md) ────────────────────────────────────────
-- Альбомы внутри галереи + привязка ассета к альбому (обратносовместимо).
create table if not exists albums (
  id             uuid primary key default gen_random_uuid(),
  gallery_id     uuid not null references galleries(id) on delete cascade,
  title          text not null,
  cover_asset_id uuid references assets(id) on delete set null,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists idx_albums_gallery on albums(gallery_id, sort_order);
alter table assets add column if not exists album_id uuid references albums(id) on delete set null;
create index if not exists idx_assets_album on assets(album_id);

-- Водяной знак на галерее (оригиналы без знака — по download-токену).
alter table galleries add column if not exists watermark_enabled boolean not null default false;
alter table galleries add column if not exists watermark_text text;

-- Комментарии к фото.
create table if not exists photo_comments (
  id          uuid primary key default gen_random_uuid(),
  gallery_id  uuid not null references galleries(id) on delete cascade,
  asset_id    uuid not null references assets(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  viewer_key  text,
  author_name text,
  text        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_photo_comments_asset on photo_comments(asset_id, created_at);

-- Download-токены: право скачивания (срок/лимит/качество).
create table if not exists download_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  gallery_id  uuid not null references galleries(id) on delete cascade,
  asset_id    uuid references assets(id) on delete cascade,   -- null = вся галерея/zip
  quality     download_quality not null default 'web',
  expires_at  timestamptz,
  max_uses    integer,
  used_count  integer not null default 0,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_download_tokens_token on download_tokens(token);

-- Журнал уведомлений.
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  channel     text not null default 'telegram',
  recipient   text,
  payload     jsonb,
  entity_type text,
  entity_id   uuid,
  status      text not null default 'pending',          -- pending|sent|failed
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index if not exists idx_notifications_created on notifications(created_at desc);

-- Audit trail — мутации админа.
create table if not exists admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_admin_actions_created on admin_actions(created_at desc);
create index if not exists idx_admin_actions_entity on admin_actions(entity_type, entity_id);

-- Прайс калькулятора в БД (сид из src/lib/pricing.data.ts).
create table if not exists price_rules (
  id          uuid primary key default gen_random_uuid(),
  shoot_type  text not null,
  kind        text not null,                            -- 'base' | 'option'
  name        text not null,
  unit        text not null default 'project',
  price_min   integer not null,
  price_max   integer not null,
  sort_order  integer not null default 0,
  active      boolean not null default true
);
create index if not exists idx_price_rules_type on price_rules(shoot_type, kind, sort_order);

-- ============================================================================
-- RLS (включить на Фазе A после подключения Supabase Auth)
-- Принципы:
--  • клиент видит только свои строки (client_id = profile),
--  • публичный доступ к галерее — только через security-definer RPC по token/паролю,
--  • админ — через сервисный ключ (server-side) или claim role='admin'.
-- Политики ниже — каркас, раскомментировать при включении.
-- ============================================================================
-- alter table galleries enable row level security;
-- create policy gallery_owner on galleries for select
--   using (client_id = (select id from clients where user_id = auth.uid()));
-- ... (полный набор политик — в Фазе A)
