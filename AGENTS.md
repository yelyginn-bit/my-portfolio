# YELYGINN V3 working rules

- Source precedence: owner V3 brief → `ссылки на работы.docx` and `транскрибация с описанием проекта.docx` → current branch code → live production → historical docs.
- Never invent credits, equipment, dates, metrics, brands or project outcomes. Omit missing fields. Later corrections in the transcript win.
- Canonical public portfolio: 89 unique Kinescope assets, 75 landscape + 14 portrait. Keep project and video as separate entities.
- Journal, account, admin and private galleries are not public navigation products. Hidden routes still require auth/RLS and `noindex`. Photo (`/photo`) IS a public navigation product — owner override, PROMPT-21 §4 (2026-09-23): it belongs in the header, mobile menu and footer of every system, same as Портфолио/Цены/Блог.
- Do not deploy, change production secrets, apply production database migrations or change prices without explicit owner approval.
- Work on `codex/cyber-portfolio-v3`; preserve the user patch saved as `YELYGINN_PRE_V3_USER_CHANGES.patch`.
- RLS is mandatory. A client may see only rows connected to `auth.uid()`; browser roles never write payment, lead, audit, OTP or security state directly.
- Keep React 19 + TypeScript + Vite + Express + Supabase and the existing secure form/backend, CSRF, rate limits and consent journal.
- Design authority: the six files in `референсы/`; premium cyber-brutalism, not gaming UI. Real video is the product.
- Required check: `npm run lint && npm test && npm run test:integration && npm run build && npm run check:budget`.
- A task that changes the site updates `docs/SITE-HANDOFF.md` in the same pass — the "Сделано" section and the queue — PROMPT-27 (2026-09-24). Otherwise the handoff file drifts from the code, same failure mode that made the old `~/Documents/New_claude/site/SITE-HANDOFF.md` a month stale.
