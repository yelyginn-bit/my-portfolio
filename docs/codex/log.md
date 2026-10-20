# PROMPT-49: актуализация PR19

2026-10-20T21:24:57+03:00. Добавить посадочную интервью и подкастов. Ветка объединена со свежим main;последний проверенный прод07cc0ff. Выпуск этогоPRещё не выполнен:нужны полныйcheck,verify текущегоhead,baseline,отдельныйdeploy.sh и live по точному правилу48. Форма на предыдущем замере502,её доставка не объявляется исправленной. Очередь:19→20→21→22→23→24→25→26→29→30→31→32. Затем46.3,46.5,изображения/llms47В. PR7не менять,28не включать.

## Датированная история ниже

# PROMPT-49: актуализация PR18

2026-10-20T21:07:51+03:00. Добавить ответы о стоимости на странице цен. Ветка объединена со свежим main;последний проверенный продe1f034c. Выпуск этогоPRещё не выполнен:нужны полныйcheck,verify текущегоhead,baseline,отдельныйdeploy.sh и live по точному правилу48. Форма на предыдущем замере502,её доставка не объявляется исправленной. Очередь:18→19→20→21→22→23→24→25→26→29→30→31→32. Затем46.3,46.5,изображения/llms47В. PR7не менять,28не включать.

## Датированная история ниже

# PROMPT-49: актуализация PR17

Новая автономная смена20.10,без ограничения времени. Прод на старте1d421b1;форма502,действует точное временное правило48. PR17 объединён с этим main:уточнены два сценария трансляций и подтверждённые роли/ссылки слабых страниц. Выпуск ещё не выполнен:требуются полныйcheck,verify текущегоhead,baseline,отдельныйdeploy.sh и live. Следующие18→19→20→21→22→23→24→25→26→29→30→31→32;затем46.3,46.5,изображения/llms47В. Draft28 не включать,PR7 не менять.

## Датированная история

# Актуальное состояние20.10.2026,16:08МСК

## Сделано и проверено на проде

| PR | Коммит | Время20.10МСК |
|---|---|---|
| #27 | a1265db | 10:47:25 |
| #10 | 594db7b | 11:00:56 |
| #11 | 09fac1b | 14:55:34 |
| #13 | 3421d45 | 15:23:14 |
| #14 | 699878d | 15:40:14 |
| #15 | 6c4c41e | 15:52:06 |
| #16 | c93fada | 16:05:55 |

Последний выпуск кода:c93fada,статья о цене фотографа. После каждого отдельного выпуска весь действующий публичный манифест200/одинH1,мобильная главнаяChromium/WebKit390px безJS-ошибок/overflow,остальные8smokePASS. После статьи76страниц. JSON-LD проверен на всех маршрутах;title/H1главной,цены/sajty,reduced-motion390/1440 и3случайныхOG проверены.

## Форма и правило выпуска

Автоматическая доставка не восстановлена:форма502как в baseline. Выпуск идёт только по временному правилуPROMPT-48,smokeцеликом не объявляется зелёным. При регрессе немедленныйrevertPR/deploy и стоп выпуска. КонсольРег.облака явно разрешенаPROMPT-47;используется неизменённыйdeploy.sh. ProductionPOST20.10не отправлялся.

Draft28:SMTPЯндекса465+устойчивый закрытый журнал и существующаяRPCсогласий,Telegram выключен. Verify39417851671SUCCESS,но обработчик не подключён кproduction. Не выпускать без самостоятельного ввода секретов владельцем,подготовки журнала/БД и отдельного«да». Инструкция:docs/codex/zayavki-vps-podgotovka.md в веткеdraft28.

## Очередь

Эта актуализация документации —PR12;после её отдельного выпуска:17→18→19→20→21→22→23→24→25→26→29→30→31,затем видеоPR32 по очереди48. Перед каждым:свежийmain,полныйcheck,verifyточногоhead,baseline,merge/deploy/live. PR7 не трогать,28исключён.

PR32:1403908байт,новыйURLhero-showreel-48.mp4из-заimmutable1год,старый файл сохранён;fullcheck0,основнойCIидёт. Не включён в этот выпуск документации.

Финальный мобильный повтор46.3,ускорение46.5 и оставшаяся47В продолжаются сохранёнными патчами/очередью;незавершённое не объявляется выполненным. Полный отказ конкретного физическогоAndroidв его сети не локализован.

## Датированная история ниже

# 20.10.2026: выпуск статьи после OG-превью

PR16 объединён со свежим main6c4c41e после отдельного выпуска PR15. На проде75/75public200/одинH1,мобильная главная и остальные smoke проходят; форма502 как в базе, действует временное правило48. PR16 добавляет одну статью и маршрут, следующая очередь:PR12,затем44. Draft28 не включать без ручных секретов и отдельного разрешения.

# 20.10.2026: актуализация PR15

Опубликованная ветка OG-превью объединена с проверенным main699878d без переписывания истории. Сохранены изменения формы PR27, PROMPT-40, JSON-LD и исправления механизма тестов. Перед коммитом выполняется полный npm run check; выпуск только после зелёного verify текущего head и базового замера.

## 20.10.2026 — выпуск проверок и актуализация /photo

PR13 выпущен3421d45 в15:23:14МСК20.10. После:75/75public200/1H1/JSON-LD без ошибок,mobile Chromium/WebKit390PASS,smoke8PASS и502формы как в базе. Новый механизм пересчёта прошёл10/10,основнойCI39420637590SUCCESS наab5b4b7. PR14 актуализируется с этим main;оба исторических тестовых падения сохранены в отчёте.

## 20.10.2026 — ожидание завершения пересчёта в тесте

20.10: CI39419159962 выявил чтение промежуточного итога0 вместо8000 сразу после перехода к студийной съёмке. Механизм теста теперь ждёт точный ожидаемый итог перед прежними строгими assertions, с теми же1500мс, как существующий checkTotal. Значения, assertions и таймауты не ослаблены; production-код не меняется.

## 20.10.2026 — фактический выпуск и актуализация PR13

PR27 и PROMPT-40 выпущены ранее; PR11 выложен09fac1b в14:55:34МСК через разрешённую веб-консоль штатным deploy.sh.75/75public200/1H1,JSON-LD без ошибок,мобильная главная Chromium/WebKit390pxPASS. Форма502 как в базе;выпуск по правилу PROMPT-48. Локальная защита от гонки прокрутки уже в main;PR13 добавляет оставшуюся синхронизацию механизма тестов меню/гидратации с реальными событиями. Исторические записи ниже сохранены как история;их старые статусы SSH/production не описывают текущий выпуск.

## 18.10.2026 — PROMPT-42 B, продолжение: прокрутка калькулятора

Локальная гонка подтверждена: запрос программной прокрутки с CSS smooth и физическое нажатие 80 мс давали 10/10 ошибок Chromium и 10/10 WebKit; могла выбираться соседняя кнопка. Это детерминированная модель движения между pointerdown/up из Linux CI, а не заявление о точном повторении его сценария на Mac. На /calculator добавлен data-page и специфичное scroll-behavior:auto; остальные страницы, оформление, обработчики расчёта и цены не меняются.

После исправления: модель 0/10 ошибок в каждом браузере. Исходные menu negative control и owner fixes плюс новая проверка клика прошли 10/10 последовательных прогонов. Прежние 75 assertions сохранены без изменений, добавлены 2 strict equal; таймаут 1500 мс тот же. Первая серия нового теста была 6/10 из-за чтения промежуточного нуля суммы до React effect; исправлено ожидание реальной суммы с прежним таймаутом, значение не ослаблялось. Визуально просмотрены 390/1440: геометрия и оформление прежние. Артефакты и полный check — REPORT-42.

Продолжение B включено в существующий PR #13 и не включает поздние изменения #14–23. Порядок выпуска прежний: #10 → #11 → #13 → #14; затем retarget зависимых PR на свежий main и проверить новый CI с включённым исправлением. Старые красные head #17–19 не считаются проверенными заново. Разрешение владельца на выпуск от 17.10 остаётся действующим; выпуск по-прежнему требует штатного SSH. Сервер, Vercel и форма не менялись, новых SSH/POST не было.

## 20.10.2026 — причина остановки PR11: гонка прокрутки

PROMPT-48,20.10: после фактического выпуска PR27 и PROMPT-40 PR11 остановлен на старом checkTotal1500ms после клика калькулятора. Для устранения причины перенесено из подготовленного PR13 только локальное scroll-behavior:auto калькулятора,маркер гидратации и отдельная строгая pointer-регрессия. Существующие assertions/таймауты не меняются;защита заявок PR27 сохранена. Проверки меню и прочие изменения PR13 остаются отдельным следующим PR.

## 20.10.2026 — PROMPT-48: первый выпуск и актуализация PROMPT-40

PR27 выпущен a1265db штатным deploy.sh.75/75 публичных маршрутов200/одинH1; Chromium/WebKit390px проходят. Исходная502 формы сохраняется, остальные8 smoke проходят. Временное правило48 применяется явно. PROMPT-40 объединён с main, запасная отправка сохранена.

## 20.10.2026 — PROMPT-47: запасная отправка заявки

При ошибке отправки формы явно сообщают об отсутствии подтверждения, сохраняют введённые поля и предлагают Telegram с готовым текстом и почту из SITE. Текст включает контакт отправителя; калькулятор также передаёт выбранные позиции и итог. Ответ с ok:false не считается доставкой. Ожидание запроса ограничено30секундами, включая получение CSRF; защита CSRF, согласия и аналитика успешной заявки сохранены. Телефон владельца в этом handoff не опубликован, номер не добавляется.

Подготовлено отдельной веткой от main для приоритетного выпуска по PROMPT-47. Это исправление интерфейса при сбое, а не восстановление связи VPS→Vercel. Перенос доставки и новые секреты этим изменением не включаются. Разрешённый GET-монитор запущен20.10, отчётREPORT-47 фиксирует реальные даты; старые замеры не выдаются за ночной монитор.

# Codex work log

## 2026-10-18 — продолжение PROMPT-43 после входа владельца

- Консоль доступна; регион Москва-2, ресурсы в норме. nginx подтвердил таймаут соединения с upstream. Конфиг, службы и блокировки не менялись. Форма восстановилась самостоятельно: GET 200 с ok/configured=true, два smoke 9/9.
- По новому явному разрешению выполнена одна тестовая заявка: успех в интерфейсе, POST 200 в access log в 08:34:12 МСК; владелец подтвердил получение с отметкой 08:34:11. Повторов нет. Причина восстановления не доказана.
- Адрес Мака отличается от единственного бана. Локальный SSH отвечает, срабатывание MaxStartups не подтверждено. Единственная новая SSH-проверка закрыта с кодом 255. Merge/deploy не выполнялись, очередь выпуска сохранена. Локальные REPORT-42/43 обновлены.

## 2026-10-18 — PROMPT-42/43

- Диагностика формы: три GET через5мин — nginx504 ~60с; прямой документированный upstream200. Причина на VPS не доказана без консоли/журналов. Backend/Vercel не менялись.
- Проверки меню синхронизированы с видимостью/размещением портала; калькулятор ждёт гидратацию, шрифты и активный набор. Все прежние утверждения/допуски/таймауты сохранены. Финальные10/10 локально и основной verify зелёный на5610b4d (PR#13); два прежних CI-падения не замалчиваются, точная причина не установлена, диагностика событий/кадра сохранена.
- /photo:4174c4a,PR#14, fullcheck104/104; первый экран390/1440 совпал с базой (0различающихсяпикселей). Принят ранее измеренный79; 90отложено.
- OG:8db5856,PR#15, fullcheck105/105;36JPEG1200×630 quality82,3,018,189байт. Карта едина, используются опубликованные работы. Статья:1f02c2a,PR#16, fullcheck106/106,SEO76; источник цен неизменен. Эталон добавлен только для нового маршрута после личного просмотра390/1440 и записи наблюдений в отчёт. Бюджеты110/208/17KiB сохранены.
- Рег.облако: авторизованной сессии не оказалось; сохранённый вход потребовал пароль macOS. Запрос отменён, консоль не открыта, состояние ресурсов неизвестно; никаких перезапусков/очисток/изменений доступа. Единственная отдельно разрешённая заявка43 показала ошибку доставки; статус POST не наблюдался, доставка в Telegram не подтверждена. Smoke до/после:8страниц200,форма504,exit1.
- Финальная единственная SSH-попытка42 закрыта до авторизации,exit255. Main/production не менялись. Очередь:10→11→13→14→15→16→12; только после штатного доступа, с retarget зависимых PR наmain, CI/deploy/live-проверками каждого выпуска. Итоговые локальные REPORT-42/43 исключены изgit.

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
