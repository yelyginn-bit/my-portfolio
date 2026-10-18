## 18.10.2026 — PROMPT-42 B, продолжение: прокрутка калькулятора

Локальная гонка подтверждена: запрос программной прокрутки с CSS smooth и физическое нажатие 80 мс давали 10/10 ошибок Chromium и 10/10 WebKit; могла выбираться соседняя кнопка. Это детерминированная модель движения между pointerdown/up из Linux CI, а не заявление о точном повторении его сценария на Mac. На /calculator добавлен data-page и специфичное scroll-behavior:auto; остальные страницы, оформление, обработчики расчёта и цены не меняются.

После исправления: модель 0/10 ошибок в каждом браузере. Исходные menu negative control и owner fixes плюс новая проверка клика прошли 10/10 последовательных прогонов. Прежние 75 assertions сохранены без изменений, добавлены 2 strict equal; таймаут 1500 мс тот же. Первая серия нового теста была 6/10 из-за чтения промежуточного нуля суммы до React effect; исправлено ожидание реальной суммы с прежним таймаутом, значение не ослаблялось. Визуально просмотрены 390/1440: геометрия и оформление прежние. Артефакты и полный check — REPORT-42.

Продолжение B включено в существующий PR #13 и не включает поздние изменения #14–23. Порядок выпуска прежний: #10 → #11 → #13 → #14; затем retarget зависимых PR на свежий main и проверить новый CI с включённым исправлением. Старые красные head #17–19 не считаются проверенными заново. Разрешение владельца на выпуск от 17.10 остаётся действующим; выпуск по-прежнему требует штатного SSH. Сервер, Vercel и форма не менялись, новых SSH/POST не было.

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
