# Что из `src/index.css` реально работает на `/ceny` и `/cvetokorrekciya`

Отчёт, код не тронут (QWEN-05, «если очередь кончилась», п. 2). Ночью я
правильно не стал чистить `index.css` вслепую — здесь замер, который делает такую
чистку решаемой задачей. Файл в списке «не трогать» (§1.2 того же промпта),
поэтому документ — только подготовка для Claude Code.

## Область: кто вообще грузит `index.css`

```bash
grep -rn "index\.css" src public scripts *.ts *.json | grep -v node_modules
```

```
src/prices/main.tsx:5:import "../index.css";
src/color/main.tsx:5:import "../index.css";
```

Два импорта на весь репозиторий: `/ceny` и `/cvetokorrekciya`. Больше `index.css`
не подключается никуда (`dist/ceny.html` и `dist/cvetokorrekciya.html` дают
`tokens.css → design-system.css → index.css`, а `dist/calculator.html` — только
`tokens.css + site-skin.css`). Это значит, что «используется или нет» для этого
файла — вопрос ровно двух страниц, и отвечать на него надо по их отрендеренному
DOM, а не по поиску строк.

## Как повторить замер

Селекторы вытаскиваются из исходника разбором со стеком скобок: комментарии
вырезаются, вложенность `@media` **и `@layer`** сохраняется, шаги `@keyframes`
(`0%`, `from`, `to`) отбрасываются. Затем каждый селектор проверяется
`document.querySelectorAll` на живой странице из `dist/`. Одной страницы
недостаточно: правило может быть нужно только второй.

```bash
# build-check.mts — в репозитории нет намеренно (отчёт не трогает код);
# положить в корень и запустить: npx tsx build-check.mts
```

```ts
import { readFileSync } from "node:fs";
import { startLocalServer } from "./scripts/computed-style-audit.ts";
const { chromium } = await import("playwright");

const src = readFileSync("src/index.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rules: { selector: string }[] = [];
(function walk(text: string) {
  let i = 0, buf = "";
  while (i < text.length) {
    const ch = text[i];
    if (ch === "{") {
      const selector = buf.replace(/\s+/g, " ").trim();
      let depth = 1, j = i + 1;
      while (j < text.length && depth > 0) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; j++; }
      const body = text.slice(i + 1, j - 1);
      // @layer обязателен в этом списке: без него из замера молча выпадают
      // все правила внутри @layer base и @layer utilities (25 правил источника).
      if (selector.startsWith("@")) {
        if (/^@(keyframes|font-face|supports|media|layer)/.test(selector)) walk(body);
      } else if (selector && !selector.split(",").every((s) => /^(from|to|[0-9.]+%)$/.test(s.trim()))) {
        rules.push({ selector });
      }
      buf = ""; i = j; continue;
    }
    if (ch === "}") { buf = ""; i++; continue; }
    buf += ch; i++;
  }
})(src);

const list = [...new Set(rules.flatMap((r) => r.selector.split(",").map((s) => s.trim())))];
const { server, origin } = await startLocalServer();
const browser = await chromium.launch({ headless: true });
const hit: Record<string, Record<string, number>> = {};
for (const route of ["/ceny", "/cvetokorrekciya"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + route, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  // Строка функции в кавычках и в скобках: page.evaluate("s=>…") без обёртки
  // не является выражением и тихо возвращает undefined.
  hit[route] = await page.evaluate(
    `(function(s){const o={};for(const x of s){try{o[x]=document.querySelectorAll(x).length}catch(e){o[x]=-1}}return o})(${JSON.stringify(list)})`,
  );
  await page.close();
}
await browser.close();
server.close();

const dead = rules.filter((r) => r.selector.split(",").every((s) => ["/ceny", "/cvetokorrekciya"].every((p) => (hit[p][s.trim()] ?? 1) === 0)));
console.log({ правил: rules.length, живых: rules.length - dead.length, мёртвых: dead.length });
```

Ожидаемый вывод на текущей сборке: `{ правил: 473, живых: 10, мёртвых: 463 }`.

Тот же разбор по **собранному** `dist/assets/index-*.css` даёт число, которое
видит браузер, а не автор файла: 564 правила, из них 498 висят только на
классовых селекторах, не находящихся ни одного узла.

## Результат

| Что мерили | Правил | Совпало с DOM `/ceny` + `/cvetokorrekciya` |
|---|---|---|
| `src/index.css` (2992 строки) | 473 | **10** |
| `dist/assets/index-CbyB8Rwu.css` (56 855 байт / 11 285 gzip) | 564 (506 селекторных записей, из них 428 классовых) | **0 классовых**, 17 элементных и псевдо |

Классов, которые встречаются в DOM этих двух страниц, — 39 на `/ceny` и 63 на
`/cvetokorrekciya`. Ни один из них не оформляется правилом из `index.css`: вся
разметка страниц сидит на `ds-*`, `v3-footer__*`, `price-page-*`, `color-*`,
`yel-cookie*`, `nav-*`, `lucide*` — это `design-system.css` и `site-skin.css`.

Десять «живых» правил — все до единого элементные, ни одного с классом
(три из них сидят в `@layer base` и потому проигрывают любому необёрнутому
правилу другого файла):

| Строка | Правило | Почему сработало |
|---|---|---|
| 16 | `html, body, #root { min-height: 100%; overflow-x: hidden }` | `html`, `body`, `#root` |
| 22 | `html { scroll-behavior: smooth }` | `html` |
| 26 | `body { @apply bg-nothing-white text-nothing-black font-sans antialiased … }` | `body` |
| 39 | `@media (prefers-reduced-motion) { html { scroll-behavior: auto } }` | `html` |
| 63 | `:root { --red/--black/--ink … }` | `:root` |
| 80 | `body { background: radial-gradient(…) , var(--ds-bg) }` | `body` |
| 85 | `body, .site-home { color: var(--ink) }` | `body` |
| 985 | `:root { --site-max/--site-gutter/--site-gap/--section-space … }` | `:root` |
| 999 | `body, .site-home { background: var(--ds-bg) !important }` | `body` |
| 2895 | `@media (max-width: 640px) { :root { … } }` | `:root` |

Соседняя строка 32 (`#projects, #services, #contact { scroll-margin-top: … }`)
оказалась мёртвой: на этих двух страницах нет ни одного из трёх якорей, ссылки
уходят на `/contact` и `/#contact` (то есть на якорь главной). При этом
`design-system.css:655–661` называет себя копией «того же приёма из `index.css`»
— со времён, когда правило читалось старой лендинговой разметкой. Комментарий
стоит поправить тому, кто будет чистить: `design-system.css` в этом заходе —
чужой файл.

463 не совпавших правила разложены по четырём корзинам — от самой безопасной:

| Корзина | Правил | Что это значит | Примеры |
|---|---|---|---|
| Класса нет ни в одной разметке репозитория (ни в `*.tsx`, ни в `*.html`) | **324** | Остатки старого лендинга: стиль есть, DOM уничтожен. `.site-home` как класс не встречается вообще нигде, кроме двух CSS-файлов (`grep -rl "site-home"` → `src/index.css`, `src/design-system.css`, `docs/audit/dark-theme-inventory.md`) | `.site-home` (93 правила), `.site-directory-groups` (16), `.content-day-packages` (9), `.clients-strip` (9), `.hero-title` (8), `.hero-section` (8), `.cookie-banner` (7), `.marquee-track` |
| Такого же селектора нет в разметке, но такое же правило лежит в `design-system.css`, который грузится на тех же двух страницах | **136** | Дубль чужого файла: после удаления из `index.css` правило продолжит жить в `design-system.css` | `.site-nav`, `.portfolio-section`, `.direction-hero`, `.direction-category-copy`, `.hero-headline`, `.contact-section`, `.direction-cta` |
| Класс есть в разметке других страниц, которым `index.css` не подключается | **2** | Не мерджить с первыми двумя: имя живое, просто не здесь | — |
| Селектор без классов (элементный/атрибутный) | **1** | Проверить вручную: он может попадать на узел через другого родителя | — |


Вес: из 36 353 байт тел правил в собранном `index-*.css` **32 080 байт
(88.2 %)** приходятся на 498 правил, висящих только на классовых селекторах без
единого узла. Файл целиком — 56 855 байт, 11 285 в gzip; это платит каждая из
двух страниц при каждой загрузке.

## Поправка к собственной первой цифре

Первый вариант измерителя дал «448 правил, 7 живых, 441 мёртвое» и был бы
неверным: правило `html, body, #root { overflow-x: hidden }` из строки 16 явно
работает на обеих страницах, но в список живых не попал. Причина — обходчик
спускался в `@media`, `@supports` и `@keyframes`, но не в `@layer`, поэтому 25
правил из `@layer base` и `@layer utilities` выпадали из замера молча.
Исправленный обходчик даёт таблицу выше: 473 / 10 / 463. Общий вывод (ни одного
живого классового селектора) это не меняет, но порядок чистки — да: без `@layer`
в разборе остаётся слепая зона ровно там, где лежат `@apply`-утилиты.

## Ловушки: что «мёртвый селектор» не значит «можно удалить»

1. **`!important` на строке 999 держит фон страницы ровным.** Пока он есть,
   вычисленный `background-image` у `body` на `/ceny` и `/cvetokorrekciya` —
   `none` (замерено 25.09). Удалить его как «дубль `design-system.css:176`» —
   значит вернуть красное радиальное свечение со строки 80 (`radial-gradient(circle
   at 12% -12%, rgba(254, 44, 31, 0.06), …)`). Это заметное изменение внешности
   обеих страниц.
2. **`@import "tailwindcss"` — не только утилиты, это Preflight.** В
   `design-system.css:178–184` лежит комментарий, который прямо обязан этому
   импорту: Preflight сбрасывает `h1..h6` в `font-weight: inherit`, и потому вес
   заголовков вынесен отдельным правилом `h1, h2 { font-weight: var(--ds-fw-display) }`
   (исторический баг — «на `/ceny` съехал шрифт»). Если после чистки от
   Tailwind останутся только `@theme` и `@layer`, порядок и наличие сброса
   надо перепроверить глазами на заголовках `/ceny`.
3. **`:root` из корзины «живых» (63 и 985) читают не только эти страницы.**
   `--red`, `--black`, `--site-max`, `--site-gutter`, `--site-gap`,
   `--section-space` переопределены в `public/site-skin.css:11–36, 1154–1157`,
   и именно там их берут `src/journal/Journal.tsx:117` и
   `src/calculator/Calculator.tsx:457` (инлайн-стили на `/zhurnal` и
   `/calculator`, где `index.css` не грузится). Внутри же `/ceny` и
   `/cvetokorrekciya` у этих переменных нет ни одного потребителя, кроме
   `color: var(--ink)` на строке 85. То есть блок можно ужать, но не «потому
   что его никто не читает», а «потому что его читают не отсюда».
4. **`@layer utilities` (строки 364–486, 24 селектора на 20 имён) — не трогать
   как «генератор Tailwind».** Это руки автора (`.glass`, `.liquid-glass`,
   `.dot-grid`,
   `.noise-overlay`, `.hardware-border`, `.text-mask`, `.squircle`, `.ndot`,
   `@keyframes marquee`). Из них ни одно не встречается в DOM двух страниц;
   единственное упоминание имени в разметке — `glass` в `404.html`, а она
   `index.css` не грузит. `@keyframes marquee` тоже осиротел: живая бегущая
   строка — `.v3-marquee__track` с `phase1-marquee` в `design-system.css:691, 1261`.
   Но это публичные имена-инструменты: их судьба — решение владельца кода, а не
   замер.

## Порядок чистки, который переживает проверка

1. Удалить 324 правила корзины «класса нет нигде». Правки пачками по 40–60,
   каждая — отдельный коммит.
2. Удалить 136 дублей `design-system.css` (оставить копию в том файле, где ей
   место).
3. Отдельным заходом решить `@layer utilities`, `@theme` и `@layer base` — там
   Preflight и переменные (см. ловушки 2 и 3).
4. После каждой пачки:

```bash
npm run build
npx tsx scripts/style-fingerprint.ts --label до        # до первой пачки
npx tsx scripts/style-fingerprint.ts --label после-1
npx tsx scripts/style-fingerprint.ts --diff до после-1  # обязан быть пустым, обе темы
npm run build
npx tsx scripts/visual-diff.ts capture --label после-1
npx tsx scripts/visual-diff.ts compare --a до --b после-1 | grep -E "ceny|cvetokorrekciya"
npm run check
```

`style-fingerprint.ts` сравнивает вычисленные стили каждого узла в светлой и
тёмной теме, `visual-diff.ts` — картинку. У `compare` фильтра `--only` нет
(он обходит всё, что нашёл в папке метки `до`), поэтому лишнее срезается
`grep`-ом: молча проигнорированный флаг — ровно тот способ, каким такая чистка
и проходит незамеченной. Правильный ответ чистки — «ноль отличий на двух
страницах».

## Чего этот замер не проверяет

- Не проверяет `404.html`, `_kit.html` и прочую статику: у неё нет `@import
  "../index.css"`, но `@apply`-утилиты теоретически могут понадобиться новому
  коду, если порядок подключения поменяется вместе с общей шапкой (PROMPT-32).
- Не проверяет, «красиво» ли: только «есть ли у селектора узел». 324 правила корзины №1 могут описывать секции, которые владелец собирается вернуть.
- Не трогает `design-system.css` (103 КиБ, крупнейший CSS сборки) — там те же
  осиротевшие имена, и следующая чистка логично продолжится там же.
