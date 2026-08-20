# V3 migration plan

Status: local implementation in `codex/cyber-portfolio-v3`; no production deploy.

1. Safety — complete: expected HEAD confirmed; user CSS saved and restored in a dedicated worktree.
2. Discovery — complete: source, public, server, API, DB, migrations, tests, scripts, static pages, SEO, legal and deployment config audited.
3. Content — complete locally: two-level `Project` / `WorkAsset` model; 89 canonical videos mapped.
4. Security — implemented locally: RLS gap migration and deployment verification SQL added.
5. Information architecture — implemented locally: public/hidden route manifest, Broadcast page, photo/journal removal from public discovery.
6. Design — implemented locally: segmented navigation, showreel product hero, editorial portfolio, camera/post/broadcast sections, shared static shell.
7. QA — pending final browser walkthrough and production-policy verification.
