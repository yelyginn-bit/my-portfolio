begin;

create table if not exists consent_events (
  id uuid primary key default gen_random_uuid(),
  subject_contact_hash text not null,
  contact_masked text,
  form_id text not null,
  page_url text,
  purpose text not null default 'lead_processing',
  policy_version text not null,
  consent_version text not null,
  document_hash text not null,
  accepted boolean not null default true,
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_consent_events_hash on consent_events(subject_contact_hash, created_at desc);

alter table leads add column if not exists consent_event_id uuid references consent_events(id) on delete set null;
alter table leads add column if not exists delivery_status text not null default 'pending';

alter table auth_otp add column if not exists attempts integer not null default 0;
alter table auth_otp add column if not exists code_hash text;
alter table auth_otp add column if not exists used_at timestamptz;
alter table auth_otp add column if not exists session_issued_at timestamptz;
alter table auth_otp add column if not exists request_ip inet;
comment on column auth_otp.code is 'Legacy; новые коды не сохраняются в открытом виде';
comment on column auth_otp.code_hash is 'SHA-256 шестизначного одноразового кода, созданного сервером через CSPRNG';

create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  subject_hash text,
  ip inet,
  user_agent text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_security_events_created on security_events(created_at desc);

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

create table if not exists payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text unique,
  idempotence_key text unique not null,
  amount integer not null check (amount > 0),
  currency text not null default 'RUB',
  method text not null,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payment_attempts_order on payment_attempts(order_id, created_at desc);

create or replace function finalize_verified_payment(
  p_provider text, p_provider_payment_id text, p_order_id uuid,
  p_amount integer, p_currency text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_attempt payment_attempts%rowtype;
  v_order orders%rowtype;
begin
  select * into v_attempt from payment_attempts
    where provider_payment_id = p_provider_payment_id and order_id = p_order_id
    for update;
  select * into v_order from orders where id = p_order_id for update;
  if v_attempt.id is null or v_order.id is null
    or v_attempt.provider <> p_provider
    or v_attempt.amount <> p_amount
    or v_attempt.currency <> p_currency
    or v_order.total <> p_amount
    or v_order.currency <> p_currency then
    return false;
  end if;
  if exists(select 1 from payments where provider_payment_id = p_provider_payment_id) then
    return false;
  end if;
  insert into payments(order_id,provider,provider_payment_id,amount,currency,status,paid_at)
    values(p_order_id,p_provider::payment_provider,p_provider_payment_id,p_amount,p_currency,'succeeded',now());
  update payment_attempts set status='succeeded',updated_at=now() where id=v_attempt.id;
  update orders set status='confirmed',payment_confirmed_at=now(),receipt_status='pending' where id=p_order_id;
  return true;
end $$;
revoke all on function finalize_verified_payment(text,text,uuid,integer,text) from public, anon, authenticated;
grant execute on function finalize_verified_payment(text,text,uuid,integer,text) to service_role;

alter table portfolio_cases add column if not exists rights_status text;
alter table portfolio_cases add column if not exists client_permission_status text;
alter table portfolio_cases add column if not exists people_consent_status text;
alter table portfolio_cases add column if not exists music_license_status text;
alter table portfolio_cases add column if not exists brand_usage_status text;
alter table portfolio_cases add column if not exists project_role text;
alter table portfolio_cases add column if not exists production_team text;
alter table portfolio_cases add column if not exists rights_note text;
alter table portfolio_cases add column if not exists publish_allowed boolean not null default false;
drop policy if exists cases_read on portfolio_cases;
create policy cases_read on portfolio_cases for select using ((published and publish_allowed) or is_admin());

create or replace function record_lead_with_consent(
  p_name text, p_contact text, p_message text, p_source text,
  p_contact_hash text, p_contact_masked text, p_form_id text, p_page_url text,
  p_policy_version text, p_consent_version text, p_document_hash text,
  p_ip text, p_user_agent text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_consent uuid; v_lead uuid;
begin
  if p_policy_version <> '2.0' or p_consent_version <> '1.0' then raise exception 'inactive document version'; end if;
  if p_form_id not in ('homepage-contact','calculator-lead','data-request') then raise exception 'invalid form'; end if;
  insert into consent_events(subject_contact_hash,contact_masked,form_id,page_url,policy_version,consent_version,document_hash,ip,user_agent)
  values(left(p_contact_hash,64),left(p_contact_masked,120),p_form_id,left(p_page_url,240),p_policy_version,p_consent_version,left(p_document_hash,64),nullif(p_ip,'')::inet,left(p_user_agent,400)) returning id into v_consent;
  insert into leads(name,contact,message,source,consent_event_id)
  values(left(p_name,160),left(p_contact,200),left(p_message,1700),left(p_source,120),v_consent) returning id into v_lead;
  return v_lead;
end $$;
revoke all on function record_lead_with_consent(text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function record_lead_with_consent(text,text,text,text,text,text,text,text,text,text,text,text,text) to service_role;

alter table clients enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table leads enable row level security;
alter table consent_events enable row level security;
alter table auth_otp enable row level security;
alter table telegram_links enable row level security;
alter table admin_actions enable row level security;
alter table notifications enable row level security;
alter table security_events enable row level security;
alter table payment_attempts enable row level security;

drop policy if exists settings_read on settings;
create policy settings_read on settings for select using (key in ('studio','discount_tiers') or is_admin());

do $$ begin
  if to_regprocedure('gallery_by_token(text,text)') is not null then
    execute 'revoke execute on function gallery_by_token(text,text) from anon, authenticated';
  end if;
  if to_regprocedure('gallery_view(text,text)') is not null then
    execute 'revoke execute on function gallery_view(text,text) from anon, authenticated';
  end if;
end $$;

drop policy if exists clients_insert on clients;
drop policy if exists orders_insert on orders;
drop policy if exists order_items_insert on order_items;
drop policy if exists leads_insert on leads;
drop policy if exists selections_all on selections;
drop policy if exists comments_insert on photo_comments;

alter table selections enable row level security;
alter table photo_comments enable row level security;
drop policy if exists selections_client_read on selections;
create policy selections_client_read on selections for select using (client_id = current_client_id() or is_admin());
drop policy if exists selections_admin_write on selections;
create policy selections_admin_write on selections for all using (is_admin()) with check (is_admin());
drop policy if exists comments_client_read on photo_comments;
create policy comments_client_read on photo_comments for select using (client_id = current_client_id() or is_admin());
drop policy if exists comments_admin_write on photo_comments;
create policy comments_admin_write on photo_comments for all using (is_admin()) with check (is_admin());

revoke insert, update, delete on clients, orders, order_items, payments, leads, consent_events, auth_otp, telegram_links, admin_actions, notifications, security_events, payment_attempts from anon, authenticated;
revoke insert, update, delete on selections, photo_comments from anon;

create or replace function cleanup_expired_auth_otp() returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update auth_otp set status='expired' where status in ('pending','confirmed') and expires_at < now();
  get diagnostics affected = row_count;
  delete from auth_otp where created_at < now() - interval '30 days';
  return affected;
end $$;
revoke all on function cleanup_expired_auth_otp() from public, anon, authenticated;
grant execute on function cleanup_expired_auth_otp() to service_role;

commit;

-- Rollback: drop only the new policies/functions/tables after exporting required records.
-- Existing columns are intentionally retained on rollback to avoid destructive data loss.
