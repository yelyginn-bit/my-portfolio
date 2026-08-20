-- Read-only deployment verification for V3. Run in the target Supabase project.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_schema, table_name, grantee, privilege_type;

select n.nspname as schema_name, p.proname, p.prosecdef as security_definer,
       p.proconfig as function_config,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- Expected negative-test identities:
-- USER A: clients.user_id = auth.uid() and Order A belongs to Client A.
-- USER B: clients.user_id = auth.uid() and Order B belongs to Client B.
-- Verify through real user JWTs: A sees A, A cannot see B, B sees B,
-- B cannot see A, anon sees no private rows, trusted admin sees allowed rows.
