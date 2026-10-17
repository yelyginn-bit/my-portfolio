# Codex work log

## 2026-10-17 — PROMPT-41

- Read PROMPT-41/40, repository rules, handoff and required sources. All artifacts remain in ignored `_agent-reports/`; owner allowed `/tmp/yl41` for npm temporary files/sockets.
- Replaced only the node_modules symlink (it pointed to the old external working copy) with a local lockfile installation. No external checkout files were deleted.
- Explicit main fetch revealed the narrow remote fetch configuration and the documentation conflict in PROMPT-40. Preserved both records, merged without rewriting history: `6fcbe5a`; PR #10 and primary CI/verify pass (104 browser/portfolio, SEO 75/75; 110/208/17 KiB).
- SSH closed before authentication on all three attempts. No main merge, deploy, production form submission, key setup, server installation/update/restart, Vercel change or PR #7 change.
- JSON-LD candidate `a28ca57`, PR #11: audit 103 issues → 0 across 75 routes; full check and primary verify pass. Still unreleased.
- /photo candidate: mobile Lighthouse medians 74→79, LCP 4.65→4.21 s, CLS 0.009; screenshot comparison 0 changed pixels at 390/1440. Full check stopped on the menu negative control. Saved `task2-final.patch`, no commit.
- OG candidate: 36 generated 1200×630 JPEGs, quality 82, 3,018,189 bytes, central crop, published local work only. OG tests pass, final full check stopped on the same negative control. Saved `task4-final.patch`, no commit.
- Event-photo article candidate builds 76 prerenders, source-driven pricing, KVN images and links; 390/1440 overflow 0. Full check 96/98: blog title suffix and new-route geometry baseline need completion. Saved `task5-article.patch` and dependent OG route patch, no commit.
- Server inventory is partial: trusted public TLS expires 2026-12-06 22:50 MSK; host facts/backups/renewal remain unverified. Saved inventory and a sourced upgrade plan without executing it.
- Baseline GET smoke of unchanged production: eight pages HTTP 200, /api/send-form HTTP 504; exit 1. No production form POST or backend change. Current delivery is unverified; investigate separately.
- Handoff and queue updated honestly; local REPORT-41 contains commands, evidence, remaining work and owner actions. Production remains unchanged.


## 2026-10-02 — CODEX-YE-01

- Added the static, indexable dark `/sajty` page with prerendered SEO metadata,
  FAQPage JSON-LD, the lazy Kinescope video, and Telegram-only CTA.
- Added the four confirmed site prices to `pricing.data.ts`; kept them out of
  `/ceny` and the calculator. Added the landing link only to the services column
  in the footer and listed the landing in sitemap and llms.txt.
- `npm run check` passed after implementation. Browser audits: 0 contrast
  failures, 0 broken words, 0 text geometry failures across indexed routes.
- Captured 390/1440 full-page frames in `.review-shots/codex-ye-01/`; ran the
  before/after visual comparison for all shared indexed routes. The mobile
  canvas grew where the footer now wraps the extra link.
- No writes to `Documents/New_claude/site/`; no server, form endpoint, deploy,
  or push changes.
- Details: [`CODEX-YE-01-report.md`](./CODEX-YE-01-report.md).
- Implementation commit: `c362326`.
