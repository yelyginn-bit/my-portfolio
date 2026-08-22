# Диагностика пре-рендера YELYGINN

Дата проверки: 22.08.2026. Репозиторий проверен на ветке `codex/cyber-portfolio-v3`, commit `51f5eba`.

## Краткий вывод

Проблема не в Яндекс-боте и не в Kinescope. В проекте одновременно существуют два типа страниц:

1. обычные HTML-страницы, в которых заголовки, текст и ссылки уже записаны в исходный HTML;
2. React-страницы, чьи HTML-entry содержат только пустой `<div id="root"></div>`, а всё содержимое появляется только после выполнения клиентского JavaScript.

Vite собирает перечисленные HTML-entry как multi-page application, но React на этапе сборки не исполняет. Клиентский entry использует `createRoot()`, а не hydration, и в проекте нет генератора статического HTML или SSR-entry. Production Express-сервер также ничего не рендерит: он выбирает готовый файл из `dist` и вызывает `sendFile()`. Это точная общая причина пустого `<body>` у `/`, `/portfolio`, `/portfolio/*`, `/calculator` и `/content-day`: [vite.config.ts:68–100](./vite.config.ts#L68-L100), [src/main.tsx:1–14](./src/main.tsx#L1-L14), [src/calculator/main.tsx:1–12](./src/calculator/main.tsx#L1-L12), [server/production-server.js:112–127](./server/production-server.js#L112-L127).

Кроме общей причины есть два отдельных дефекта маршрутизации: активный V3-router вообще не обрабатывает `/content-day`, а `photo` отсутствует в списке V3-категорий. Поэтому после запуска JavaScript эти URL сейчас попадают в `HomePage`, а не только оказываются пустыми для робота: [src/public/V3App.tsx:26](./src/public/V3App.tsx#L26), [src/public/V3App.tsx:453–483](./src/public/V3App.tsx#L453-L483).

## 1. Фреймворк, версии, роутер и сборщик

- UI: React `19.2.4` и React DOM `19.2.4` (зафиксированные версии): [package-lock.json:3589–3608](./package-lock.json#L3589-L3608).
- Язык: TypeScript `5.8.3`: [package-lock.json:4002–4010](./package-lock.json#L4002-L4010).
- Сборщик/dev-server: Vite `6.4.3`, внутри которого используется Rollup: [package-lock.json:4079–4090](./package-lock.json#L4079-L4090). React подключён через `@vitejs/plugin-react`: [vite.config.ts:52–62](./vite.config.ts#L52-L62).
- Production HTTP-сервер: Express 4; зависимость объявлена в [package.json:20–36](./package.json#L20-L36), entry — [server/production-server.js:1–12](./server/production-server.js#L1-L12).
- Стороннего router-пакета нет. Маршрутизация V3 написана вручную: компонент читает `window.location.pathname`, определяет категорию/проект и возвращает соответствующий React-компонент: [src/public/V3App.tsx:453–483](./src/public/V3App.tsx#L453-L483). Навигация при этом уже использует обычные `<a href>`: [src/public/V3App.tsx:52–58](./src/public/V3App.tsx#L52-L58), [src/public/V3App.tsx:80–93](./src/public/V3App.tsx#L80-L93).

Поиск по исходникам и зависимостям не обнаружил `react-router`, `renderToString`, `renderToStaticMarkup`, `hydrateRoot`, `StaticRouter` или отдельную SSR/prerender-конфигурацию. Это согласуется с фактическими entry: только `createRoot()` в [src/main.tsx:10–14](./src/main.tsx#L10-L14) и [src/calculator/main.tsx:8–12](./src/calculator/main.tsx#L8-L12).

## 2. Как устроена сборка

Команды определены в `package.json`:

- `npm run dev` → Vite dev-server;
- `npm run build` → `vite build`;
- `npm run preview` → Vite preview;
- `npm start` → Express production-server;
- полный check запускает TypeScript, unit/integration tests, build и budget-check.

Источник: [package.json:6–18](./package.json#L6-L18).

Конфигурация сборки находится в [vite.config.ts](./vite.config.ts). `build.rollupOptions.input` вручную перечисляет HTML-entry: главную, портфолио, категорийные entry, общий `project.html`, `content-day.html`, `calculator.html`, статические service pages, blog и legal: [vite.config.ts:68–100](./vite.config.ts#L68-L100). Принцип попадания в build — **наличие HTML-файла в этом объекте**, а не обход маршрутов и не рендер React-компонентов.

`transformIndexHtml` различает React-entry только по наличию `<div id="root"`; для обычных страниц он добавляет статические scripts, но сам контент не генерирует: [vite.config.ts:6–49](./vite.config.ts#L6-L49). Следовательно, в текущей сборке нет генерации статики в смысле SSG. Есть только Vite MPA-копирование/трансформация HTML-entry и сборка клиентских JS-bundle.

CI выполняет `npm ci` и `npm run check`, но не содержит шага deployment или prerender: [.github/workflows/ci.yml:1–19](./.github/workflows/ci.yml#L1-L19).

## 3. Отличие работающих и неработающих маршрутов

### Работающие страницы

У работающих маршрутов весь основной DOM находится непосредственно в HTML до запуска JavaScript:

- `/reklamnye-roliki`: header/nav с `<a href>` и H1 уже присутствуют в [reklamnye-roliki.html:86–113](./reklamnye-roliki.html#L86-L113).
- `/event-video`: header/nav и H1 присутствуют в [event-video.html:84–111](./event-video.html#L84-L111).
- `/reels`: header/nav и H1 присутствуют в [reels.html:84–111](./reels.html#L84-L111).
- `/ceny`: статический fallback содержит nav, H1 и ссылки в [ceny.html:77–101](./ceny.html#L77-L101) и [ceny.html:103–138](./ceny.html#L103-L138).

Пример рабочего случая:

```html
<body>
  <header>...<a href="/portfolio">Портфолио</a>...</header>
  <main>
    <h1>Рекламные ролики для <em>бизнеса</em></h1>
  </main>
</body>
```

Этот фрагмент соответствует [reklamnye-roliki.html:86–113](./reklamnye-roliki.html#L86-L113).

### Неработающие страницы

Неработающие entry содержат только mount-point и module script:

- `/`: [index.html:70–73](./index.html#L70-L73);
- `/portfolio`: [portfolio.html:17–20](./portfolio.html#L17-L20);
- `/portfolio/reels`: [portfolio-reels.html:16–19](./portfolio-reels.html#L16-L19);
- `/calculator`: [calculator.html:166–169](./calculator.html#L166-L169);
- `/content-day`: [content-day.html:22–25](./content-day.html#L22-L25).

Пример неработающего случая:

```html
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

После загрузки браузер запускает `createRoot(...).render(<V3App />)`: [src/main.tsx:8–14](./src/main.tsx#L8-L14). Только тогда появляются H1 главной ([src/public/V3App.tsx:365–382](./src/public/V3App.tsx#L365-L382)), каталога ([src/public/V3App.tsx:385–400](./src/public/V3App.tsx#L385-L400)) или проекта ([src/public/V3App.tsx:409–415](./src/public/V3App.tsx#L409-L415)). У робота без JavaScript mount-point остаётся пустым.

## 4. Почему маршруты выпали из статической генерации

Формулировка «выпали» технически неточна: единого механизма статической генерации в проекте нет. Одни страницы вручную написаны как полный HTML, другие вручную созданы как клиентские React-entry. Vite собирает обе группы, но не преобразует вторую в server-rendered HTML: [vite.config.ts:68–100](./vite.config.ts#L68-L100).

Точные причины:

1. В React-entry изначально пустой `<div id="root">`: [index.html:70–73](./index.html#L70-L73), [portfolio.html:17–20](./portfolio.html#L17-L20), [calculator.html:166–169](./calculator.html#L166-L169).
2. React запускается только клиентским `createRoot()`: [src/main.tsx:10–14](./src/main.tsx#L10-L14), [src/calculator/main.tsx:8–12](./src/calculator/main.tsx#L8-L12).
3. В build отсутствует этап, который вызывает React server renderer и записывает результат в HTML: `npm run build` — только `vite build` ([package.json:7–10](./package.json#L7-L10)), а Vite-конфиг содержит только MPA inputs ([vite.config.ts:68–100](./vite.config.ts#L68-L100)).
4. Express не добавляет HTML на запросе, а только отдаёт файл из `dist`: [server/production-server.js:112–127](./server/production-server.js#L112-L127).
5. `/content-day` имеет дополнительный route-defect: его intended-компонент существует в legacy `App` ([src/App.tsx:1438–1447](./src/App.tsx#L1438-L1447), [src/App.tsx:1934–1945](./src/App.tsx#L1934-L1945)), но активный entry импортирует `V3App`, а его router не знает `/content-day`: [src/main.tsx:1–4](./src/main.tsx#L1-L4), [src/public/V3App.tsx:475–483](./src/public/V3App.tsx#L475-L483).
6. `/portfolio/photo` имеет дополнительный route-defect: `photo` не входит в `PortfolioCategory` и `categoryOrder`: [src/portfolio/v3PortfolioData.ts:35–45](./src/portfolio/v3PortfolioData.ts#L35-L45), [src/public/V3App.tsx:26](./src/public/V3App.tsx#L26). Поэтому активный V3-router не может выбрать photo-каталог.

## 5. Динамические маршруты

Да. Любой URL `/portfolio/*`, который не найден в `pageMap`, на production-сервере получает один и тот же `project.html`: [server/production-server.js:112–117](./server/production-server.js#L112-L117). Отдельные project HTML на build не генерируются; `project.html` — единственный MPA input: [vite.config.ts:73–80](./vite.config.ts#L73-L80).

После запуска JavaScript slug извлекается из `window.location.pathname`, затем проект ищется в `projectBySlug`: [src/public/V3App.tsx:453–461](./src/public/V3App.tsx#L453-L461). `projectBySlug` строится из локального массива `projects`: [src/portfolio/v3PortfolioData.ts:190–206](./src/portfolio/v3PortfolioData.ts#L190-L206). Сами slugs определены в `seeds`, начиная с [src/portfolio/v3PortfolioData.ts:136–169](./src/portfolio/v3PortfolioData.ts#L136-L169).

`sitemap.xml` вручную перечисляет категорийные URL и project slugs: [public/sitemap.xml:8–66](./public/sitemap.xml#L8-L66). Sitemap не участвует в Vite build и не является источником prerender paths.

Для фазы 2 список статических путей должен формироваться из того же источника, что и runtime-router: фиксированные публичные маршруты + `categoryOrder`/`CATEGORY_META` + все `projects.map(project => project.slug)`. Иначе sitemap, client-router и prerender снова разойдутся.

## 6. Источники данных

### Главная и портфолио

Данные проектов локальные и синхронные:

- типы и модель Project/WorkAsset: [src/portfolio/v3PortfolioData.ts:1–76](./src/portfolio/v3PortfolioData.ts#L1-L76);
- список Kinescope asset ID: [src/portfolio/v3PortfolioData.ts:80–128](./src/portfolio/v3PortfolioData.ts#L80-L128);
- project seeds, slugs, тексты, роли и диапазоны media: [src/portfolio/v3PortfolioData.ts:130–169](./src/portfolio/v3PortfolioData.ts#L130-L169);
- итоговые maps и `projectBySlug`: [src/portfolio/v3PortfolioData.ts:190–206](./src/portfolio/v3PortfolioData.ts#L190-L206);
- category metadata/filter: [src/portfolio/v3PortfolioData.ts:209–236](./src/portfolio/v3PortfolioData.ts#L209-L236).

Kinescope не загружает данные, необходимые для H1 или текста. Компонент строит ссылку на внешний player из локального `kinescopeId` и показывает локально известный poster URL: [src/public/V3App.tsx:40–49](./src/public/V3App.tsx#L40-L49). Поэтому Kinescope **не является корнем пустого HTML**.

### Калькулятор

Калькулятор сначала имеет синхронный локальный fallback (`ESTIMATE_DATA`), а затем в `useEffect` пытается заменить прайс и скидки данными хранилища/БД: [src/lib/pricing.runtime.ts:1–18](./src/lib/pricing.runtime.ts#L1-L18), [src/lib/pricing.runtime.ts:50–57](./src/lib/pricing.runtime.ts#L50-L57), [src/calculator/Calculator.tsx:45–77](./src/calculator/Calculator.tsx#L45-L77). Данные аккаунта также загружаются асинхронно на клиенте: [src/calculator/Calculator.tsx:86–108](./src/calculator/Calculator.tsx#L86-L108).

Асинхронный DB override — дополнительное требование к hydration, но не первичная причина пустого HTML. H1 и начальное состояние можно отрендерить из локального fallback до запроса к БД; сейчас этого не происходит только потому, что весь Calculator монтируется через клиентский `createRoot`: [src/calculator/main.tsx:8–12](./src/calculator/main.tsx#L8-L12), [src/calculator/Calculator.tsx:207–223](./src/calculator/Calculator.tsx#L207-L223).

## 7. Хостинг и deployment

Основной production размещён на REG.RU VPS/Рег.облако, домен `yelyginn.ru`, nginx + PM2 + Express. Это прямо зафиксировано в [README.md:1–5](./README.md#L1-L5) и [REG_RU_VPS_DEPLOY.md:5–16](./REG_RU_VPS_DEPLOY.md#L5-L16).

Схема:

1. На VPS выполняются `npm ci` и `npm run build`: [REG_RU_VPS_DEPLOY.md:46–56](./REG_RU_VPS_DEPLOY.md#L46-L56).
2. PM2 запускает один экземпляр `server/production-server.js` на порту 3000: [ecosystem.config.cjs:1–15](./ecosystem.config.cjs#L1-L15).
3. nginx принимает HTTPS и проксирует `/` в Express: [deploy/nginx-yelyginn.ru.conf:28–40](./deploy/nginx-yelyginn.ru.conf#L28-L40), [deploy/nginx-yelyginn.ru.conf:79–88](./deploy/nginx-yelyginn.ru.conf#L79-L88).
4. Express раздаёт `dist` и выбирает HTML через `pageMap`/fallback: [server/production-server.js:14–47](./server/production-server.js#L14-L47), [server/production-server.js:96–127](./server/production-server.js#L96-L127).

Ни nginx, ни Express не содержат SSR/prerender-слоя. `vercel.json` остаётся альтернативной/исторической конфигурацией build+rewrites ([vercel.json:1–3](./vercel.json#L1-L3), [vercel.json:39–74](./vercel.json#L39-L74)), но текущая документированная production-цель — REG.RU: [README.md:32–40](./README.md#L32-L40).

## 8. Варианты решения

### Вариант A — build-time SSG штатным `react-dom/server` (рекомендован)

Что меняется:

- выделить SSR-safe функцию разрешения route → component/data без прямого чтения `window`;
- добавить server entry, который вызывает `renderToString()` для каждого route;
- после Vite build записывать результат в соответствующие HTML-файлы, сохраняя текущие URL, `<head>`, классы и визуальную разметку;
- клиентский entry перевести с `createRoot()` на `hydrateRoot()`;
- manifest путей строить из фиксированных route, категорий и `projects`;
- для Calculator prerender делать на локальном fallback, а DB override оставлять клиентским post-hydration обновлением.

Новые runtime-зависимости не нужны: `react-dom` уже установлен ([package.json:33–36](./package.json#L33-L36)). Оценка затронутых файлов: 5–7 исходных файлов + 1 build script + тесты/отчёт. Точный diff определяется после согласования `/content-day` и `/portfolio/photo`.

Риски:

- прямые обращения к `window`, `document`, `new Date()` и browser-only effects нужно изолировать так, чтобы server render и первый client render совпадали; примеры текущих browser-only мест: [src/public/V3App.tsx:60–76](./src/public/V3App.tsx#L60-L76), [src/public/V3App.tsx:439–473](./src/public/V3App.tsx#L439-L473);
- несоответствие HTML при hydration, если route/data на build и в браузере различаются;
- неправильный route manifest может пропустить slug; поэтому источник должен быть общий с `projectBySlug` ([src/portfolio/v3PortfolioData.ts:190–206](./src/portfolio/v3PortfolioData.ts#L190-L206));
- интерактивность Calculator должна включаться после hydration, не меняя первоначальный DOM до завершения первого render.

Что может сломаться: hydration интерактивных элементов, client-only analytics/effects, актуализация `<head>`, Calculator DB override. Внешний вид менять не требуется.

### Вариант B — runtime SSR в Express

Что меняется:

- Vite собирает отдельный server bundle;
- Express вместо `sendFile()` на React-маршрутах вызывает `renderToString()` и подставляет HTML в template;
- client entry использует `hydrateRoot()`;
- project slug и category разрешаются на сервере на каждый запрос.

Новые runtime-зависимости также не обязательны. Оценка: 6–10 файлов + server-build config + тесты.

Риски выше, чем у A:

- любой browser-only доступ (`window` сейчас читается прямо при render в [src/public/V3App.tsx:453–461](./src/public/V3App.tsx#L453-L461)) может уронить production request;
- появляется новый runtime-критичный server bundle, cache policy и дополнительная нагрузка на один PM2 instance ([ecosystem.config.cjs:4–12](./ecosystem.config.cjs#L4-L12));
- легче получить расхождение между server-router, Express `pageMap` и client-router;
- сбой SSR затронет доступность страниц, тогда как при SSG ошибка обнаруживается на build.

Что может сломаться: production request handling, API/static middleware ordering, caching, hydration. Для преимущественно статического портфолио преимущества runtime SSR не компенсируют эти риски.

### Вариант C — browser snapshot после build

Можно запускать headless Chromium после `vite build`, ждать выполнения React и сохранять DOM. Для этого понадобилась бы новая тяжёлая dependency (Playwright/Puppeteer) и браузерный runtime. Оценка: 2–4 config/script файла + generated HTML + тесты.

Риски: snapshots зависят от таймингов media/network/effects, могут сохранить transient UI, дают хрупкую hydration-модель и заметно замедляют build. Это именно тот случай, где установка нового инструмента маскирует архитектурную причину. Поэтому dependency не устанавливалась и вариант не рекомендуется.

Ни один вариант не требует платного сервиса, смены хостинга или URL.

## 9. Рекомендация

Рекомендую вариант A: build-time SSG на уже установленном `react-dom/server` + `hydrateRoot()`.

Обоснование:

- данные портфолио и маршруты детерминированы локально ([src/portfolio/v3PortfolioData.ts:130–169](./src/portfolio/v3PortfolioData.ts#L130-L169), [src/portfolio/v3PortfolioData.ts:190–236](./src/portfolio/v3PortfolioData.ts#L190-L236));
- сайт уже собирается в `dist` и раздаётся как набор файлов ([vite.config.ts:68–100](./vite.config.ts#L68-L100), [server/production-server.js:96–127](./server/production-server.js#L96-L127));
- решение добавляет недостающий build-step, не меняет framework/router целиком, не требует платного сервиса и не добавляет dependency;
- ошибка prerender становится build-time ошибкой, а не production outage;
- существующий Express/nginx deployment остаётся прежним.

## Необходимые уточнения до фазы 2

1. **Не понял ожидаемый контент `/portfolio/photo`, нужно уточнение.** Сейчас URL одновременно исключён из индексации в [public/robots.txt:9–10](./public/robots.txt#L9-L10), получает `X-Robots-Tag: noindex, nofollow` в [server/production-server.js:52–60](./server/production-server.js#L52-L60), а в активной V3-модели вообще нет категории `photo`: [src/portfolio/v3PortfolioData.ts:35–45](./src/portfolio/v3PortfolioData.ts#L35-L45). Технически можно отдать H1 и при `noindex`, но нельзя без решения владельца угадать, какой существующий компонент/контент считать каноническим.
2. **Не понял, какой UI считать каноническим для `/content-day`, нужно уточнение.** HTML/meta описывают контент-день ([content-day.html:6–24](./content-day.html#L6-L24)), legacy-компонент с H1 существует ([src/portfolio/PortfolioPages.tsx:378–407](./src/portfolio/PortfolioPages.tsx#L378-L407)), но production entry импортирует V3App ([src/main.tsx:1–4](./src/main.tsx#L1-L4)), где этот маршрут отсутствует и падает в HomePage ([src/public/V3App.tsx:475–483](./src/public/V3App.tsx#L475-L483)). Подключение legacy-компонента устранит route-bug, но может визуально отличаться от случайно показываемой сейчас главной; по запрету менять дизайн такое решение нельзя принимать молча.

## Production baseline: YandexBot, до изменений

Команда выполнена против `https://yelyginn.ru` 22.08.2026 без выполнения JavaScript:

```text
=== / ===
=== /portfolio ===
=== /portfolio/reels ===
=== /portfolio/post ===
=== /portfolio/photo ===
=== /calculator ===
=== /content-day ===
=== /reklamnye-roliki ===
<h1>Рекламные ролики для 
=== /event-video ===
<h1>Event-видео и 
=== /reels ===
<h1>Reels для 
=== /ceny ===
<h1>Цены на продакшн
```

`grep` обрывает первые три работающих H1 перед вложенным `<em>`, но текст осмысленный и находится в сыром HTML; исходные H1 видны в [reklamnye-roliki.html:107](./reklamnye-roliki.html#L107), [event-video.html:105](./event-video.html#L105), [reels.html:105](./reels.html#L105).

### Количество текста в `<body>`

Методика baseline: из сырого `<body>` удалены `script`, `style`, `noscript`, `template`, `svg`, HTML-комментарии и теги; whitespace нормализован; посчитаны Unicode-символы видимого текста. Для контроля рядом указана длина исходного body HTML.

| Маршрут | Body HTML, символов (до) | Видимый текст, символов (до) | Видимый текст (после) |
|---|---:|---:|---:|
| `/` | 82 | 0 | — |
| `/portfolio` | 82 | 0 | — |
| `/portfolio/reels` | 82 | 0 | — |
| `/portfolio/post` | 82 | 0 | — |
| `/portfolio/photo` | 82 | 0 | — |
| `/calculator` | 82 | 0 | — |
| `/content-day` | 82 | 0 | — |
| `/reklamnye-roliki` | 9301 | 3223 | — |
| `/event-video` | 8214 | 2874 | — |
| `/reels` | 8709 | 3000 | — |
| `/ceny` | 5554 | 2078 | — |

Колонка «после» намеренно не заполнена: фаза 2 запрещена до явного подтверждения, код и production не изменялись. После реализации она должна быть заполнена повторным измерением тем же способом, а обязательный H1-loop должен быть выполнен заново на боевом домене.

## Границы выполненной работы

- Код приложения, конфиги, маршруты, дизайн, тексты и deployment не изменялись.
- Новые зависимости не устанавливались.
- Платные сервисы и действия не использовались.
- Фаза 2 не начиналась.
