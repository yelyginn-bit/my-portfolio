# Аудит запретов индексации

Дата аудита: 22.08.2026. Правила в рамках фазы 2 не менялись, кроме ранее согласованного `content-day.html`: маршрут теперь имеет `index,follow` (`content-day.html:8`).

| Маршрут | Механизм | Файл:строка | Текущее значение |
|---|---|---|---|
| `/api/*` | `robots.txt` | `public/robots.txt:3` | `Disallow: /api/` |
| `/admin`, `/admin/*` | `robots.txt` + HTTP-заголовок + meta | `public/robots.txt:4`; `server/production-server.js:61-63`; `admin.html:7` | `Disallow`; `X-Robots-Tag: noindex, nofollow`; `<meta name="robots" content="noindex,nofollow">` |
| `/account`, `/account/*` | `robots.txt` + HTTP-заголовок + meta | `public/robots.txt:5`; `server/production-server.js:61-63`; `account.html:8` | `Disallow`; `X-Robots-Tag: noindex, nofollow`; meta `noindex,nofollow` |
| `/g/*` | `robots.txt` + HTTP-заголовок | `public/robots.txt:6`; `server/production-server.js:61-63` | `Disallow`; `X-Robots-Tag: noindex, nofollow` |
| `/gallery`, `/gallery/*` | `robots.txt` + HTTP-заголовок + meta | `public/robots.txt:7`; `server/production-server.js:61-63`; `gallery.html:7` | `Disallow`; `X-Robots-Tag: noindex, nofollow`; meta `noindex,nofollow` |
| `/journal`, `/journal/*` | `robots.txt` + HTTP-заголовок + meta | `public/robots.txt:8`; `server/production-server.js:61-63`; `journal.html:8` | `Disallow`; `X-Robots-Tag: noindex, nofollow`; meta `noindex,nofollow` |
| `/photo`, `/photo/*` | `robots.txt` + HTTP-заголовок + meta | `public/robots.txt:9`; `server/production-server.js:61-63`; `photo.html:9` | `Disallow`; `X-Robots-Tag: noindex, nofollow`; meta `noindex,nofollow` |
| `/portfolio/photo` | `robots.txt` + HTTP-заголовок + meta + manifest | `public/robots.txt:10`; `server/production-server.js:61-63`; `portfolio-photo.html:8`; `src/public/routeManifest.ts:37` | `Disallow`; `X-Robots-Tag: noindex, nofollow`; meta `noindex,nofollow`; `indexable: false` |

## Nginx

`deploy/nginx-yelyginn.ru.conf:28-88` проксирует запросы в Express и **не добавляет** `X-Robots-Tag`. Запреты HTTP-заголовком формируются в Node/Express (`server/production-server.js:55-65`).

## Vercel

`vercel.json:1-76` не содержит robots/noindex-заголовков. Он содержит только redirects, security/cache headers и rewrites. Боевой сайт работает на REG.RU VPS (`REG_RU_VPS_DEPLOY.md:5-15`), поэтому этот файл не управляет production. Он остаётся в репозитории как устаревшая конфигурация и создаёт риск отличающегося поведения при случайном Vercel deployment; рекомендация — не использовать его как production target и позже либо синхронизировать с Express manifest, либо архивировать отдельной согласованной задачей.

## Sitemap

`public/robots.txt:13` указывает `https://yelyginn.ru/sitemap.xml`. Файл sitemap теперь создаётся во время build из `INDEXABLE_ROUTES` (`scripts/prerender.ts:60-70`, `scripts/prerender.ts:113-116`); маршруты с `indexable: false` туда не попадают.
