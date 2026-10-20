## 20.10.2026 — причина остановки PR11: гонка прокрутки

PROMPT-48,20.10: после фактического выпуска PR27 и PROMPT-40 PR11 остановлен на старом checkTotal1500ms после клика калькулятора. Для устранения причины перенесено из подготовленного PR13 только локальное scroll-behavior:auto калькулятора,маркер гидратации и отдельная строгая pointer-регрессия. Существующие assertions/таймауты не меняются;защита заявок PR27 сохранена. Проверки меню и прочие изменения PR13 остаются отдельным следующим PR.

## 20.10.2026 — PROMPT-48: первый выпуск и актуализация PROMPT-40

PR27 выпущен a1265db штатным deploy.sh.75/75 публичных маршрутов200/одинH1; Chromium/WebKit390px проходят. Исходная502 формы сохраняется, остальные8 smoke проходят. Временное правило48 применяется явно. PROMPT-40 объединён с main, запасная отправка сохранена.

## 20.10.2026 — PROMPT-47: запасная отправка заявки

При ошибке отправки формы явно сообщают об отсутствии подтверждения, сохраняют введённые поля и предлагают Telegram с готовым текстом и почту из SITE. Текст включает контакт отправителя; калькулятор также передаёт выбранные позиции и итог. Ответ с ok:false не считается доставкой. Ожидание запроса ограничено30секундами, включая получение CSRF; защита CSRF, согласия и аналитика успешной заявки сохранены. Телефон владельца в этом handoff не опубликован, номер не добавляется.

Подготовлено отдельной веткой от main для приоритетного выпуска по PROMPT-47. Это исправление интерфейса при сбое, а не восстановление связи VPS→Vercel. Перенос доставки и новые секреты этим изменением не включаются. Разрешённый GET-монитор запущен20.10, отчётREPORT-47 фиксирует реальные даты; старые замеры не выдаются за ночной монитор.

# Codex work log

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
