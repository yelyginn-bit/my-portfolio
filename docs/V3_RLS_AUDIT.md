# V3 RLS audit

Status: SQL source audited and hardened locally. Actual production policies are **not verified** because no approved Supabase test/production credentials were used.

| Data class | Tables | Client read | Browser write | Admin / service role |
|---|---|---|---|---|
| Client identity | clients, login_history | own rows | revoked | trusted admin / service |
| Commerce | orders, order_items, payments, payment_attempts | own order graph | revoked | service payment flow |
| Galleries | galleries, albums, assets | own or explicitly public | revoked | admin / validated share endpoint |
| Feedback | selections, photo_comments, reviews | own / published review | revoked | validated server / admin |
| Leads / consent | leads, consent_events | none | server endpoint only | service / admin |
| Security | auth_otp, telegram_links, security_events, admin_actions, notifications | none | revoked | service / admin |
| Public catalog | services, discount_tiers, price_rules | active rows | revoked | admin |
| Content | portfolio_cases, blog_posts, blog_categories | published rows | revoked | admin |

## Local changes

- `20260814_v3_rls_hardening.sql` enables RLS for `login_history`, `services`, `discount_tiers`, `downloads`.
- Removes the spoofable authenticated `reviews_insert` policy.
- Revokes direct browser writes for audit, catalog, review, download and price tables.
- Fixes helper-function `search_path`.
- All existing `SECURITY DEFINER` functions have an explicit `search_path`; public/authenticated execution is revoked where appropriate.
- Supabase Storage bucket `media` is private and policies are admin-only; guest access remains a validated server-token flow.

## Production verification

Run `db/verify-v3-rls.sql` after an approved migration. Then execute USER A / USER B negative tests with real JWTs. Until that happens, “RLS enabled in production” is a blocker, not a claim.
