-- Private media bucket for galleries on the Supabase Free plan.
-- Apply after db/schema.sql and db/policies.sql.

insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists media_admin_select on storage.objects;
create policy media_admin_select on storage.objects
for select using (bucket_id = 'media' and public.is_admin());

drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects
for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects
for update using (bucket_id = 'media' and public.is_admin())
with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects
for delete using (bucket_id = 'media' and public.is_admin());
