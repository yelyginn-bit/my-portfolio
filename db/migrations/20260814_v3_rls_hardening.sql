begin;

-- V3 closes the four schema tables that were absent from db/policies.sql.
alter table login_history enable row level security;
alter table services enable row level security;
alter table discount_tiers enable row level security;
alter table downloads enable row level security;

drop policy if exists login_history_read on login_history;
create policy login_history_read on login_history for select using (
  client_id = current_client_id() or is_admin()
);

drop policy if exists services_public_read on services;
create policy services_public_read on services for select using (active or is_admin());
drop policy if exists services_admin_write on services;
create policy services_admin_write on services for all using (is_admin()) with check (is_admin());

drop policy if exists discount_tiers_public_read on discount_tiers;
create policy discount_tiers_public_read on discount_tiers for select using (active or is_admin());
drop policy if exists discount_tiers_admin_write on discount_tiers;
create policy discount_tiers_admin_write on discount_tiers for all using (is_admin()) with check (is_admin());

drop policy if exists downloads_read on downloads;
create policy downloads_read on downloads for select using (
  client_id = current_client_id() or is_admin()
);

-- Reviews are submitted through a validated server endpoint. The old policy
-- only checked that the JWT belonged to some client and did not bind client_id.
drop policy if exists reviews_insert on reviews;

-- Browser roles never write CRM, audit, price or download data directly.
revoke insert, update, delete on login_history, services, discount_tiers, downloads, reviews, price_rules from anon, authenticated;
revoke select on login_history, downloads from anon;

-- Make helper name resolution deterministic even though they are invoker functions.
alter function current_client_id() set search_path = public;
alter function is_admin() set search_path = public;

commit;

-- Production verification is intentionally separate: apply only in an approved
-- Supabase environment, then run db/verify-v3-rls.sql as an administrative role.
