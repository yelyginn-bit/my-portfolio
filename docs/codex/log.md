## 20.10.2026 — PROMPT-48: SMTP и локальный журнал, draft

PROMPT-48,20.10.2026: draft PR28 доработан под SMTP Яндекса465 и обязательный локальный журнал0600/каталог0700 сfsync перед уведомлением. Сохранены CSRF,актуальные согласия,валидация,лимит и RPC БД. SMTP основной,Telegram выключен и требует явногоlegacy-enable. Код не подключён кproduction-server/API/nginx/PM2. Нужны ручные секреты,каталог/бэкап/ретеншн и отдельное«да» владельца;PR28не выпускать. Инструкция docs/codex/zayavki-vps-podgotovka.md. Прежниеassertionsтестовнеослаблены.

## 20.10.2026 — PROMPT-47: подготовка прямой доставки, выключена

Добавлена неподключённая фабрика Express app вserver/lead-delivery-app.js: использует существующие CSRF и обработчик заявки, требует явного включения, Telegram и БД, запрещает relay и сохраняет обязательный журнал согласий. Она отсутствует вproduction-server/APIrouter/PM2/nginx и не публикуется. Условия и будущий порядок — docs/codex/zayavki-vps-podgotovka.md. Тесты работают только наloopback. Связь VPS→Telegram20.10 тоже даёттаймаут, поэтому миграция сама проблему не решает. Интерфейсный кандидат отmain сохранён патчем после двух таймаутов существующих браузерных проверок; очередь продолжается.

## 20.10.2026 — PROMPT-46: доступность

У полей имени, телефона и описания калькулятора добавлены доступные имена. В каталоге портфолио добавлен скрытый от визуального оформления H2 «Проекты портфолио»: он именует раздел и связывает H1 страницы с H3 проектов. Главная сохраняет свою иерархию. Клавиатурный фокус формы, видимого значка согласия и этапов процесса выделяется обводкой существующего акцентного цвета. Значения, отправка форм и вид без фокуса не менялись.

Новые браузерные проверки обходят все индексируемые страницы: lang, имена полей и последовательность заголовков; отдельно проверяют видимый фокус и Space на этапе процесса в Chromium/WebKit, 390/1440. Контрастный гейт сохранён; автоматический результат не заменяет проверку экранным диктором. Мобильный и скоростной кандидаты сохранены отдельными патчами после остановок; очередь продолжается, публикация ждёт штатный SSH.

## 20.10.2026 — PROMPT-46, ссылки и изображения

HTTP-обход80 публичных страниц через настоящий production-server.js локально не нашёл404 или битых якорей. Фото-ссылки каталога ведут напрямую на /photo#gallery вместо legacy301. Ценовые строки и ESTIMATE_DATA не менялись. Пустой img лайтбокса получает размеры, при выборе кадра они обновляются из его метаданных. Добавлены тесты публичных ссылок и width/height/alt всех изображений пререндера. Полныйcheck обязателен перед коммитом; результаты хранятся в _agent-reports.

Мобильный патч предыдущего пункта сохранён отдельно после TS2345 во временных скриптах: никаких гейтов не обходили. Правка их типов не меняет исполнение диагностики. Очередь продолжается, выпуска нет.

## 18.10.2026 — PROMPT-44: регистр H1 и метаданные

HTML H1 /sajty приведён к обычному регистру; уже существующий text-transform:uppercase оставляет оформление прежним. Лично просмотрены390/1440до/после: заголовок, переносы, CTA, навигация и cookieпанель совпадают. Точное rawRGBAсравнение:0отличающихсяпикселей,overflow0. После просмотра и записи вREPORT44 обновлена точная ожидаемаястрокаH1в существующемтесте; проверка сохранена. Добавленстрогий60/160тест для затронутыхметаданных и ключевыхсловглавной.

Descriptionглавной дополнен нужнымиуслугами и городом; слишкомдлинныеtitleтрансляций/цен сокращены,descriptionBecomeLegendary уточняет удалённуюроль без приписывания съёмки. Цены/кейсы/геометрическиеэталоны не менялись. Полныйcheck иCIбудут отражены вREPORT44; выпуск удержан доSSH. Кириллические301требуют запрещённойправкисервера,скорость/cenyостаётсячастичной65→67из90.

## 18.10.2026 — повторная диагностика формы и продолжение проверок

В 22:24:31 МСК форма снова дала GET504 за60,306с. Консоль подтверждает upstream timed out while connecting to upstream. С VPS GET по имени upstream и по фиксированному адресу nginx (тот же Host/SNI, TLSverify) завершаются curl28 за20с; DNS даёт2записи. Нагрузка0, доступно652МБRAM, диск49%, иноды16%; ssh/nginx active,PM2online. Адрес Мака не забанен, признаковMaxStartups нет. Основания для разрешённых рестартов/очистки/reboot не найдены; настройки сервера/Vercel не менялись. Завершающийsmoke:8страниц200,форма504. Утренняя доставка08:34 подтверждена владельцем и остаётся историческим фактом, текущую исправность не доказывает. НовыхPOST/SSH нет. Дальше нужен разбор сетевой доступности VPS→upstream вне разрешённого списка исправлений; REPORT-43 содержит точные наблюдения.

Исправление движения калькулятора из PR13 включается в последующие ветки merge-коммитами без переписывания истории, с полнымcheck перед каждым коммитом. PR13–16 прошлиCI на новыхhead. ДокументацияPR12 остаётся только документацией относительноPR16. Красные историческиеCI не переименовываются в успешные: новые результаты перечислены в REPORT42/44. Выпуск по-прежнему удержан до штатногоSSH; main и deploy.sh не тронуты.

На момент этой записи новыеCI #17/#18/#19 SUCCESS; все триPR выведены изdraft. Ниже сохранены исторические результаты прежнихhead.

## 18.10.2026 — PROMPT-44: SEO и посадочные, выпуск остановлен

- Отдельные PR #17–22: слабые страницы, ответы о цене, интервью/подкасты, компании, спектакли, спорт. Все шаги прошли локальный полный check; 80 маршрутов SEO, новые страницы включены в prerender/sitemap и навигацию, роли и цены из подтверждённых источников.
- Задача 1: патч без коммита из-за противоречия обычного регистра H1 сайтов существующему тесту. Кириллические URL 11/11 дают 404; сервер запрещён, точное предложение сохранено в REPORT-44.
- CI #17/#18/#19 FAILURE; PR в draft. Для #18/#19 сохранена диагностика WebKit: страница смещается между pointerdown/up, тип не меняется. Тесты и таймаут не ослаблены, CI вслепую не перезапускался. #20/#21/#22 CI SUCCESS на точных head, зависимая очередь остаётся заблокирована.
- /ceny mobile local Lighthouse: три прогона, медиана 65→67; LCP 5.852→5.404 с, CLS 0. Финальный полный CSS инлайном как /photo, 390/1440 строго 0 пиксельных отличий. Дополнительные варианты критического CSS хуже и отклонены. Цель 90+ не достигнута.
- Merge/deploy не выполнялись: SSH недоступен и CI красный. Список переобхода, измерения и все ограничения — _agent-reports/REPORT-44.md. Форму повторно не отправлял, сервер/кабинеты/цены/зависимости не менял.

## 18.10.2026 — PROMPT-42 B, продолжение: прокрутка калькулятора

Локальная гонка подтверждена: запрос программной прокрутки с CSS smooth и физическое нажатие 80 мс давали 10/10 ошибок Chromium и 10/10 WebKit; могла выбираться соседняя кнопка. Это детерминированная модель движения между pointerdown/up из Linux CI, а не заявление о точном повторении его сценария на Mac. На /calculator добавлен data-page и специфичное scroll-behavior:auto; остальные страницы, оформление, обработчики расчёта и цены не меняются.

После исправления: модель 0/10 ошибок в каждом браузере. Исходные menu negative control и owner fixes плюс новая проверка клика прошли 10/10 последовательных прогонов. Прежние 75 assertions сохранены без изменений, добавлены 2 strict equal; таймаут 1500 мс тот же. Первая серия нового теста была 6/10 из-за чтения промежуточного нуля суммы до React effect; исправлено ожидание реальной суммы с прежним таймаутом, значение не ослаблялось. Визуально просмотрены 390/1440: геометрия и оформление прежние. Артефакты и полный check — REPORT-42.

Продолжение B включено в существующий PR #13 и не включает поздние изменения #14–23. Порядок выпуска прежний: #10 → #11 → #13 → #14; затем retarget зависимых PR на свежий main и проверить новый CI с включённым исправлением. Старые красные head #17–19 не считаются проверенными заново. Разрешение владельца на выпуск от 17.10 остаётся действующим; выпуск по-прежнему требует штатного SSH. Сервер, Vercel и форма не менялись, новых SSH/POST не было.

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
