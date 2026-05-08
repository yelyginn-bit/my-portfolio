# Google Studio: Quick Open

Этот архив подготовлен для быстрого открытия проекта в Google AI Studio.

## Что внутри

- `src/` — исходники React/Vite
- `public/` — статические файлы
- `dist/` — готовая production-сборка (можно сразу хостить как статику)

## Быстрый запуск (режим разработки)

```bash
npm install
npm run dev
```

Открыть: `http://localhost:3000`

## Быстрый просмотр production-версии

```bash
npm install
npm run build
npm run preview
```

Открыть: `http://localhost:4173` (или порт из вывода Vite)

## Важно

- `node_modules` и `.git` в архив не включены специально, чтобы он открывался быстрее.
- В проекте уже настроены страницы политики (`/privacy-policy.html`) и SEO-файлы (`robots.txt`, `sitemap.xml`).
