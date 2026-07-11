-- ============================================================================
-- RLS-политики (Этап A2). Применять ПОСЛЕ schema.sql.
--
-- МОДЕЛЬ ДОСТУПА
--  • anon (без входа) — только публичное чтение опубликованного контента.
--  • клиент (JWT, sub = clients.user_id, role='authenticated') — видит/меняет своё.
--  • админ (JWT role='admin', выдаётся /api/admin-login) — полный доступ.
--  • service_role (serverless: вебхуки/джобы) — обходит RLS всегда.
--  • гость галереи — через серверный endpoint с проверкой share-токена.
--
-- JWT-мост (см. SUPABASE_AUTH.md): вход у нас через Telegram-OTP/админ-пароль,
-- поэтому сессию Supabase подделывать не нужно — сервер подписывает JWT секретом
-- проекта (SUPABASE_JWT_SECRET) с нужными claim'ами, клиент шлёт его в PostgREST.
--
-- Все записи CRM, OTP, заявок, заказов и гостевых действий галереи выполняются
-- серверными endpoint с service_role после валидации и проверки доступа.
-- ============================================================================

-- helper: текущий клиент по auth.uid()
create or replace function current_client_id() returns uuid
language sql stable as $$ select id from clients where user_id = auth.uid() $$;

-- helper: админ? Кастомный claim app_role='admin' (НЕ role: role маппится на роль
-- Postgres и должен быть 'authenticated'; админство несём отдельным claim).
create or replace function is_admin() returns boolean
language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role') = 'admin', false) $$;

-- ── clients ───────────────────────────────────────────────────────────────
alter table clients enable row level security;
drop policy if exists clients_read on clients;
create policy clients_read   on clients for select using (user_id = auth.uid() or is_admin());
drop policy if exists clients_insert on clients;
drop policy if exists clients_update on clients;
create policy clients_update on clients for update using (user_id = auth.uid() or is_admin());

-- ── orders / order_items / payments ─────────────────────────────────────────
alter table orders enable row level security;
drop policy if exists orders_read on orders;
create policy orders_read   on orders for select using (client_id = current_client_id() or is_admin());
drop policy if exists orders_insert on orders;
drop policy if exists orders_update on orders;
create policy orders_update on orders for update using (is_admin());

alter table order_items enable row level security;
drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.client_id = current_client_id() or is_admin())));
drop policy if exists order_items_insert on order_items;

alter table payments enable row level security;
drop policy if exists payments_read on payments;
create policy payments_read on payments for select
  using (exists (select 1 from orders o where o.id = order_id and (o.client_id = current_client_id() or is_admin())));
-- INSERT/UPDATE платежей — ТОЛЬКО service_role (вебхуки). Политик для anon/JWT нет.

-- ── galleries / assets ──────────────────────────────────────────────────────
alter table galleries enable row level security;
drop policy if exists galleries_read on galleries;
create policy galleries_read on galleries for select
  using (visibility = 'public' or client_id = current_client_id() or is_admin());
drop policy if exists galleries_write on galleries;
create policy galleries_write on galleries for all using (is_admin()) with check (is_admin());

alter table assets enable row level security;
drop policy if exists assets_read on assets;
create policy assets_read on assets for select
  using (exists (select 1 from galleries g where g.id = gallery_id
                 and (g.visibility = 'public' or g.client_id = current_client_id() or is_admin())));
drop policy if exists assets_write on assets;
create policy assets_write on assets for all using (is_admin()) with check (is_admin());

alter table share_links enable row level security;
drop policy if exists share_links_admin on share_links;
create policy share_links_admin on share_links for all using (is_admin()) with check (is_admin());
-- Чтение по токену гостем выполняет server/api/gallery-access.js.

-- ── selections (отбор фото; гость отмечает по share-ссылке) ──────────────────
alter table selections enable row level security;
drop policy if exists selections_all on selections;
drop policy if exists selections_client_read on selections;
create policy selections_client_read on selections for select using (client_id = current_client_id() or is_admin());
drop policy if exists selections_admin_write on selections;
create policy selections_admin_write on selections for all using (is_admin()) with check (is_admin());

-- ── leads / reviews ──────────────────────────────────────────────────────────
alter table leads enable row level security;
drop policy if exists leads_insert on leads;
drop policy if exists leads_admin on leads;
create policy leads_admin  on leads for select using (is_admin());

alter table reviews enable row level security;
drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews for select using (published or is_admin());
drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews for insert with check (current_client_id() is not null or is_admin());
drop policy if exists reviews_admin_write on reviews;
create policy reviews_admin_write on reviews for update using (is_admin());
drop policy if exists reviews_admin_delete on reviews;
create policy reviews_admin_delete on reviews for delete using (is_admin());

-- ── контент: портфолио-кейсы / блог — публичное чтение, запись только админ ───
alter table portfolio_cases enable row level security;
drop policy if exists cases_read on portfolio_cases;
create policy cases_read  on portfolio_cases for select using ((published and publish_allowed) or is_admin());
drop policy if exists cases_write on portfolio_cases;
create policy cases_write on portfolio_cases for all using (is_admin()) with check (is_admin());

alter table blog_posts enable row level security;
drop policy if exists posts_read on blog_posts;
create policy posts_read  on blog_posts for select using (published or is_admin());
drop policy if exists posts_write on blog_posts;
create policy posts_write on blog_posts for all using (is_admin()) with check (is_admin());

alter table blog_categories enable row level security;
drop policy if exists cats_read on blog_categories;
create policy cats_read  on blog_categories for select using (true);
drop policy if exists cats_write on blog_categories;
create policy cats_write on blog_categories for all using (is_admin()) with check (is_admin());

-- ── настройки / Telegram / OTP / AI-лица — только админ / service_role ────────
alter table settings enable row level security;
drop policy if exists settings_read on settings;
create policy settings_read on settings for select using (key in ('studio','discount_tiers') or is_admin());
drop policy if exists settings_write on settings;
create policy settings_write on settings for all using (is_admin()) with check (is_admin());

alter table telegram_links enable row level security;   -- доступ только service_role (политик нет)
alter table auth_otp enable row level security;         -- доступ только service_role (политик нет)
alter table face_groups enable row level security;
drop policy if exists face_groups_admin on face_groups;
create policy face_groups_admin on face_groups for all using (is_admin()) with check (is_admin());
alter table face_instances enable row level security;
drop policy if exists face_instances_admin on face_instances;
create policy face_instances_admin on face_instances for all using (is_admin()) with check (is_admin());
alter table ai_tags enable row level security;
drop policy if exists ai_tags_admin on ai_tags;
create policy ai_tags_admin on ai_tags for all using (is_admin()) with check (is_admin());
alter table asset_descriptions enable row level security;
drop policy if exists asset_desc_admin on asset_descriptions;
create policy asset_desc_admin on asset_descriptions for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- RPC: доступ к галерее по токену share-ссылки (работает БЕЗ регистрации).
-- security definer обходит RLS, но строго по валидному токену/паролю/сроку.
-- ============================================================================
create or replace function gallery_by_token(p_token text, p_password text default null)
returns table (gallery_id uuid, can_download boolean)
language plpgsql security definer set search_path = public as $$
declare s share_links%rowtype;
begin
  select * into s from share_links where token = p_token;
  if not found then return; end if;
  if s.expires_at is not null and s.expires_at < now() then return; end if;
  if s.password_hash is not null
     and s.password_hash <> crypt(coalesce(p_password,''), s.password_hash) then
    return;
  end if;
  return query select s.gallery_id, s.can_download;
end $$;

-- Полный просмотр галереи по токену (галерея + ассеты) одним вызовом — для гостя.
create or replace function gallery_view(p_token text, p_password text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare g uuid; cd boolean; result jsonb;
begin
  select gallery_id, can_download into g, cd from gallery_by_token(p_token, p_password);
  if g is null then return null; end if;
  select jsonb_build_object(
    'gallery', to_jsonb(gl.*),
    'can_download', cd,
    'assets', coalesce((select jsonb_agg(to_jsonb(a.*) order by a.sort_order) from assets a where a.gallery_id = g), '[]'::jsonb)
  ) into result from galleries gl where gl.id = g;
  return result;
end $$;

-- Прямой вызов устаревших RPC из браузера запрещён. Проверка пароля, токена,
-- срока и принадлежности ассетов выполняется серверным endpoint.
revoke execute on function gallery_by_token(text, text) from anon, authenticated;
revoke execute on function gallery_view(text, text) from anon, authenticated;

-- ============================================================================
-- RLS для сущностей v2 (ARCHITECTURE-v2.md §4)
-- ============================================================================
alter table albums enable row level security;
drop policy if exists albums_read on albums;
create policy albums_read on albums for select using (
  exists (select 1 from galleries g where g.id = gallery_id
          and (g.visibility = 'public' or g.client_id = current_client_id() or is_admin())));
drop policy if exists albums_write on albums;
create policy albums_write on albums for all using (is_admin()) with check (is_admin());

alter table photo_comments enable row level security;
drop policy if exists comments_insert on photo_comments;
drop policy if exists comments_client_read on photo_comments;
create policy comments_client_read on photo_comments for select using (client_id = current_client_id() or is_admin());
drop policy if exists comments_read on photo_comments;
create policy comments_read on photo_comments for select using (is_admin() or client_id = current_client_id());

alter table download_tokens enable row level security;
drop policy if exists dltok_admin on download_tokens;
create policy dltok_admin on download_tokens for all using (is_admin()) with check (is_admin());
-- Гостевая валидация/инкремент — через serverless (api/download, service_role).

alter table notifications enable row level security;
drop policy if exists notif_admin_read on notifications;
create policy notif_admin_read on notifications for select using (is_admin());
-- insert/update — только service_role.

alter table admin_actions enable row level security;
drop policy if exists audit_admin_read on admin_actions;
create policy audit_admin_read on admin_actions for select using (is_admin());
-- insert — только service_role (атомарно с операцией админа).

alter table price_rules enable row level security;
drop policy if exists price_read on price_rules;
create policy price_read  on price_rules for select using (true);              -- прайс публичен (калькулятор)
drop policy if exists price_write on price_rules;
create policy price_write on price_rules for all using (is_admin()) with check (is_admin());

-- CRM и служебные журналы изменяются только сервером с service_role.
revoke insert, update, delete on clients, orders, order_items, payments, leads, auth_otp, telegram_links, admin_actions, notifications from anon, authenticated;
revoke insert, update, delete on selections, photo_comments from anon;
