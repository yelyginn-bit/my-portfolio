# Отчёт фазы 2: build-time prerender

Дата: 22.08.2026. Ветка: `fix/prerender-all-routes`.

## Что изменено

- Единый route manifest собирает фиксированные маршруты, категории из `PORTFOLIO_CATEGORY_ORDER` и проекты из `projects` (`src/public/routeManifest.ts:21-75`). Этот же resolver используется runtime-компонентом и build-time renderer (`src/public/V3App.tsx`, `scripts/prerender.ts:88-101`).
- V3 и калькулятор рендерятся через `react-dom/server`, а build падает при отсутствии H1, дубликате или пропущенном prerender route (`scripts/prerender.ts:73-117`).
- Клиентские entry используют `hydrateRoot` для готового HTML и сохраняют `createRoot` только для пустого dev-root (`src/main.tsx:10-18`, `src/calculator/main.tsx`).
- Первый render калькулятора использует локальный `ESTIMATE_DATA`; session и DB override загружаются только после hydration (`src/calculator/Calculator.tsx`).
- Express читает сгенерированный manifest и отдаёт соответствующий HTML до legacy fallback (`server/production-server.js:12-13`, `server/production-server.js:115-124`).
- `/content-day` стал самостоятельной статической страницей без React-root и client-router fall-through (`content-day.html`).
- `/portfolio/photo` не пререндерится и остаётся закрыт; ссылка из `/ceny` направлена на `/photo` (`ceny.html:137`).
- `sitemap.xml` генерируется на build из indexable routes (`scripts/prerender.ts:60-70`, `scripts/prerender.ts:113-116`).

Новые зависимости не устанавливались. Использованы уже имеющиеся `react-dom/server`, `hydrateRoot` и `tsx` (`package.json:20-45`). Платные сервисы и тарифы не подключались.

## Видимый текст в `<body>`

Метрика: число символов видимого текста после удаления `script`, `style` и HTML-тегов из ответа production-like Express server. Значения «до» сняты с `https://yelyginn.ru` перед внедрением; «после (локально)» — с production build на `127.0.0.1:3003`.

| Маршрут | До | После (локально) | После (production) |
|---|---:|---:|---:|
| `/` | 0 | 2774 | 2831 |
| `/portfolio` | 0 | 4283 | 4322 |
| `/portfolio/reels` | 0 | 1095 | 1128 |
| `/portfolio/post` | 0 | 4160 | 4195 |
| `/portfolio/photo` | 0 | 0 — согласованное исключение, закрыто от индексации | 55 — только служебная noindex-страница |
| `/calculator` | 0 | 1328 | 1375 |
| `/content-day` | 0 | 537 | 594 |
| `/reklamnye-roliki` | 3223 | 3223 | 3310 |
| `/event-video` | 2874 | 2874 | 2986 |
| `/reels` | 3000 | 3000 | 3093 |
| `/ceny` | 2078 | 2078 | 2148 |

## H1-loop: локальный production build

```text
=== / ===
<h1>ВИДЕОСЪЁМКА
=== /portfolio ===
<h1>РАБОТЫ
=== /portfolio/reels ===
<h1>Вертикальные работы
=== /portfolio/post ===
<h1>Монтаж и постпродакшн
=== /portfolio/photo ===
=== /calculator ===
<h1 class="calc-title">Соберите 
=== /content-day ===
<h1>Контент-день для бизнеса 
=== /reklamnye-roliki ===
<h1>Рекламные ролики для 
=== /event-video ===
<h1>Event-видео и 
=== /reels ===
<h1>Reels для 
=== /ceny ===
<h1>Цены на продакшн
```

Пустой H1 у `/portfolio/photo` — единственное согласованное исключение: контента нет, route закрыт `robots.txt`, meta и `X-Robots-Tag`.

## Hydration и функциональность

- In-app Chromium: `/` — H1 присутствует, console пустая, hydration mismatch отсутствует.
- In-app Chromium: `/calculator` — SSR H1 и controls присутствуют, console пустая; переключение на «Монтаж YouTube» меняет active state без перезагрузки.
- Локальный fallback цены присутствует в первом HTML. Клиентский DB override запускается после hydration; до первого render browser-only session не читается.
- Изменения в разметке ограничены семантическим H1 на standalone contact и прямым текстовым узлом H1 главной, без изменения CSS-композиции. Селекторы обновлены эквивалентно (`src/design-system.css`, `src/v3-polish.css`).

## Legacy

`src/main.tsx:3` импортирует активный `src/public/V3App.tsx`; `src/App.tsx` не импортируется ни одним entry и является legacy-веткой. От него напрямую зависит `src/portfolio/PortfolioPages.tsx` (`src/App.tsx:41`), а также связанные legacy service/layout helpers. Эти файлы не удалялись и не переписывались. Активные отдельные entries калькулятора, legal, account/admin/gallery/journal и цветокоррекции остаются самостоятельными.

## Hosting

Production — REG.RU VPS, nginx → Node/Express/PM2 (`REG_RU_VPS_DEPLOY.md:5-15`, `deploy/nginx-yelyginn.ru.conf:79-88`, `ecosystem.config.cjs:1-14`). `vercel.json` в production не участвует; вывод и риск зафиксированы в `ROBOTS-AUDIT.md`.

## Production QA

Deployment выполнен на production 22.08.2026.

- commit runtime: `0985f08` (`feat` — `8d8c825`, документация — `0985f08`);
- deploy: REG.RU VPS, `/var/www/yelyginn`, production build завершён, PM2 `yelyginn-site` — `online`;
- H1-loop: все десять индексируемых маршрутов из проверки отдали непустой H1 с User-Agent YandexBot; вывод приведён выше. `/portfolio/photo` остаётся согласованным noindex-исключением;
- body text: значения в третьем столбце таблицы сняты с `https://yelyginn.ru` без исполнения JavaScript;
- headers `/portfolio/photo`: `200`, `X-Robots-Tag: noindex, nofollow`, `Content-Type: text/html; charset=UTF-8`;
- sitemap: `68` URL, `/portfolio/photo` отсутствует; `robots.txt` содержит `Disallow: /portfolio/photo` и указывает на sitemap;
- browser hydration: production `/` — H1 `ВИДЕОСЪЁМКА И МОНТАЖ В НИЖНЕМ НОВГОРОДЕ`, один `#root`, ошибок console нет;
- calculator hydration: production `/calculator` — H1 `СОБЕРИТЕ СМЕТУ ПОД ПРОЕКТ`, шесть input-control, ошибок console нет.

```text
=== / ===
<h1>ВИДЕОСЪЁМКА
=== /portfolio ===
<h1>РАБОТЫ
=== /portfolio/reels ===
<h1>Вертикальные работы
=== /portfolio/post ===
<h1>Монтаж и постпродакшн
=== /calculator ===
<h1 class="calc-title">Соберите
=== /content-day ===
<h1>Контент-день для бизнеса
=== /reklamnye-roliki ===
<h1>Рекламные ролики для
=== /event-video ===
<h1>Event-видео и
=== /reels ===
<h1>Reels для
=== /ceny ===
<h1>Цены на продакшн
```

`/portfolio/photo` намеренно не входит в этот production-loop: у него нет публичного контента, он отдаёт `noindex, nofollow` и закрыт в `robots.txt`.

Проверка конфигурации nginx прошла успешно. Nginx вывел предупреждения о конфликтующих `server_name` для `yelyginn.ru` и `www.yelyginn.ru`; они существовали до этой задачи и не менялись в рамках prerender-фикса. Это отдельный инфраструктурный вопрос, не препятствующий текущей выдаче `https://yelyginn.ru`.
