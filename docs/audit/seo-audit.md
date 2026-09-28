# SEO-аудит индексируемых страниц

Сгенерировано `npx tsx scripts/seo-audit.ts --write`. Источник — файлы, которые
отдаёт сервер (`dist/prerender/<route>/index.html`, иначе плоский `dist/<route>.html`),
то есть ровно то, что видит робот. Внесённые вручную правки в этот файл перезапишутся.

Страниц в манифесте: **70** · без замечаний: **0** · URL в sitemap: **70** · с `<lastmod>`: **70**

| маршрут | H1 | title (дл.) | description (дл.) | canonical | og | JSON-LD | sitemap | в пре-рендеренном файле | H2 | замечания |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 1 · "Видеосъёмка и видеопродакшн в Нижнем Новгород | 81 | 168 | есть | полное | LocalBusiness | да | prerender/index.html | 5 | title 81, desc 168 |
| `/portfolio` | 1 · "РАБОТЫ" | 36 | 107 | есть | полное | LocalBusiness | да | prerender/portfolio/index.html | 0 | desc 107 |
| `/blog` | 1 · "О СЪЁМКЕ И МОНТАЖЕ" | 40 | 85 | есть | полное | LocalBusiness | да | prerender/blog/index.html | 4 | desc 85 |
| `/about` | 1 · "ЮРИЙ ЕЛЫГИН" | 32 | 73 | есть | полное | LocalBusiness | да | prerender/about/index.html | 3 | desc 73 |
| `/contact` | 1 · "ЕСТЬ ЗАДАЧА? РАССКАЖИТЕ" | 26 | 88 | есть | полное | LocalBusiness | да | prerender/contact/index.html | 0 | title 26, desc 88 |
| `/calculator` | 1 · "Соберите смету под проект" | 44 | 143 | есть | полное | — | да | prerender/calculator/index.html | 0 | нет JSON-LD |
| `/content-day` | 1 · "Контент-день для бизнеса в Нижнем Новгороде" | 54 | 128 | есть | полное | — | да | content-day.html | 3 | нет JSON-LD |
| `/reklamnye-roliki` | 1 · "Рекламные ролики для бизнеса" | 84 | 133 | есть | полное | LocalBusiness | да | reklamnye-roliki.html | 6 | title 84 |
| `/event-video` | 1 · "Event-видео и репортаж" | 109 | 133 | есть | полное | LocalBusiness | да | event-video.html | 5 | title 109 |
| `/reels` | 1 · "Reels для бизнеса" | 90 | 151 | есть | полное | LocalBusiness | да | reels.html | 6 | title 90 |
| `/cvetokorrekciya` | 1 · "Цвет в DaVinci Resolve" | 70 | 103 | есть | полное | Service | да | prerender/cvetokorrekciya/index.html | 6 | title 70, desc 103 |
| `/video-dlya-marketpleysov` | 1 · "Видео для маркетплейсов" | 100 | 135 | есть | полное | LocalBusiness | да | video-dlya-marketpleysov.html | 5 | title 100, img без alt: 1, img без размеров: 3 |
| `/pryamye-translyacii` | 1 · "Оператор и режиссёр на прямую трансляцию" | 56 | 169 | есть | полное | Service | да | pryamye-translyacii.html | 8 | desc 169 |
| `/ceny` | 1 · "Стоимость продакшна" | 67 | 144 | есть | полное | — | да | prerender/ceny/index.html | 2 | title 67, нет JSON-LD |
| `/photo` | 1 · "Фото, которое работает на бренд" | 93 | 149 | есть | полное | LocalBusiness | да | photo.html | 9 | title 93, img без размеров: 1 |
| `/privacy-policy` | 1 · "Политика в отношении обработки персональных д | 38 | 114 | есть | полное | — | да | prerender/privacy-policy/index.html | 10 | нет JSON-LD |
| `/personal-data-consent` | 1 · "Согласие на обработку персональных данных" | 39 | 119 | есть | полное | — | да | prerender/personal-data-consent/index.html | 4 | нет JSON-LD |
| `/cookie-policy` | 1 · "Политика использования cookies" | 27 | 110 | есть | полное | — | да | prerender/cookie-policy/index.html | 3 | title 27, нет JSON-LD |
| `/terms` | 1 · "Условия оказания услуг" | 38 | 111 | есть | полное | — | да | prerender/terms/index.html | 4 | нет JSON-LD |
| `/payment-terms` | 1 · "Условия оплаты и чек НПД" | 31 | 105 | есть | полное | — | да | prerender/payment-terms/index.html | 3 | desc 105, нет JSON-LD |
| `/cancellation-refund` | 1 · "Отмена и возврат" | 35 | 116 | есть | полное | — | да | prerender/cancellation-refund/index.html | 2 | нет JSON-LD |
| `/gallery-terms` | 1 · "Условия клиентских галерей" | 40 | 106 | есть | полное | — | да | prerender/gallery-terms/index.html | 3 | desc 106, нет JSON-LD |
| `/data-request` | 1 · "Запросы по персональным данным" | 37 | 116 | есть | полное | — | да | prerender/data-request/index.html | 2 | нет JSON-LD |
| `/blog/skolko-stoit-snyat-reklamnyy-rolik` | 1 · "Сколько стоит снять рекламный ролик в Нижнем  | 77 | 129 | есть | полное | Article | да | blog/skolko-stoit-snyat-reklamnyy-rolik.html | 5 | title 77 |
| `/blog/kak-snimat-reels-dlya-biznesa` | 1 · "Как снимать Reels для бизнеса: форматы, струк | 68 | 155 | есть | **нет og:description** | Article | да | blog/kak-snimat-reels-dlya-biznesa.html | 7 | title 68, og:description |
| `/blog/video-dlya-kartochek-wildberries` | 1 · "Видео для карточек Wildberries и Ozon: требов | 81 | 160 | есть | **нет og:description** | Article | да | blog/video-dlya-kartochek-wildberries.html | 5 | title 81, og:description |
| `/blog/videosemka-meropriyatiy-nn` | 1 · "Видеосъёмка мероприятий в Нижнем Новгороде: к | 72 | 155 | есть | **нет og:description** | Article | да | blog/videosemka-meropriyatiy-nn.html | 8 | title 72, og:description |
| `/portfolio/camera` | 1 · "Операторская работа" | 30 | 89 | есть | полное | LocalBusiness | да | prerender/portfolio/camera/index.html | 0 | desc 89 |
| `/portfolio/commercial` | 1 · "Коммерческие проекты" | 31 | 69 | есть | полное | LocalBusiness | да | prerender/portfolio/commercial/index.html | 0 | desc 69 |
| `/portfolio/events` | 1 · "События и SDE" | 24 | 72 | есть | полное | LocalBusiness | да | prerender/portfolio/events/index.html | 0 | title 24, desc 72 |
| `/portfolio/reels` | 1 · "Вертикальные работы" | 30 | 83 | есть | полное | LocalBusiness | да | prerender/portfolio/reels/index.html | 0 | desc 83 |
| `/portfolio/concerts` | 1 · "Концерты" | 19 | 52 | есть | полное | LocalBusiness | да | prerender/portfolio/concerts/index.html | 0 | title 19, desc 52 |
| `/portfolio/interviews` | 1 · "Интервью и спецпроекты" | 33 | 54 | есть | полное | LocalBusiness | да | prerender/portfolio/interviews/index.html | 0 | desc 54 |
| `/portfolio/post` | 1 · "Монтаж и постпродакшн" | 32 | 83 | есть | полное | LocalBusiness | да | prerender/portfolio/post/index.html | 0 | desc 83 |
| `/portfolio/color` | 1 · "Цвет" | 15 | 59 | есть | полное | LocalBusiness | да | prerender/portfolio/color/index.html | 0 | title 15, desc 59 |
| `/portfolio/broadcast` | 1 · "Прямая трансляция" | 28 | 88 | есть | полное | LocalBusiness | да | prerender/portfolio/broadcast/index.html | 0 | title 28, desc 88 |
| `/portfolio/product` | 1 · "Продуктовое видео" | 28 | 70 | есть | полное | LocalBusiness | да | prerender/portfolio/product/index.html | 0 | title 28, desc 70 |
| `/portfolio/gorky-stranicy-pamyati` | 1 · "Горький. Страницы памяти" | 35 | 70 | есть | полное | LocalBusiness | да | prerender/portfolio/gorky-stranicy-pamyati/index.html | 2 | desc 70, img без размеров: 1 |
| `/portfolio/metro-gorkovskaya-concerts` | 1 · "Концерты «Станции метро Горьковская»" | 47 | 109 | есть | полное | LocalBusiness | да | prerender/portfolio/metro-gorkovskaya-concerts/index.html | 2 | desc 109, img без размеров: 5 |
| `/portfolio/sber-arhitektura` | 1 · "SBER.Архитектура" | 27 | 83 | есть | полное | LocalBusiness | да | prerender/portfolio/sber-arhitektura/index.html | 2 | title 27, desc 83, img без размеров: 6 |
| `/portfolio/zhenshchiny-sibura` | 1 · "Женщины СИБУРа" | 25 | 148 | есть | полное | LocalBusiness | да | prerender/portfolio/zhenshchiny-sibura/index.html | 3 | title 25, img без размеров: 6 |
| `/portfolio/uchenye-nizhnego` | 1 · "Учёные Нижнего" | 25 | 67 | есть | полное | LocalBusiness | да | prerender/portfolio/uchenye-nizhnego/index.html | 2 | title 25, desc 67, img без размеров: 3 |
| `/portfolio/horosho-teaser` | 1 · "«Хорошо». Тизер" | 26 | 51 | есть | полное | LocalBusiness | да | prerender/portfolio/horosho-teaser/index.html | 2 | title 26, desc 51, img без размеров: 1 |
| `/portfolio/zhenshchiny-sibura-teaser` | 1 · "Женщины СИБУРа. Тизер" | 32 | 52 | есть | полное | LocalBusiness | да | prerender/portfolio/zhenshchiny-sibura-teaser/index.html | 2 | desc 52, img без размеров: 1 |
| `/portfolio/sber-arhitektura-teaser` | 1 · "SBER.Архитектура. Тизер" | 34 | 69 | есть | полное | LocalBusiness | да | prerender/portfolio/sber-arhitektura-teaser/index.html | 2 | desc 69, img без размеров: 1 |
| `/portfolio/barier-instrukcii` | 1 · "БАРЬЕР. Видеоинструкции" | 34 | 63 | есть | полное | LocalBusiness | да | prerender/portfolio/barier-instrukcii/index.html | 2 | desc 63, img без размеров: 3 |
| `/portfolio/caprigo-obuchenie` | 1 · "Caprigo. Обучающие видео" | 35 | 53 | есть | полное | LocalBusiness | да | prerender/portfolio/caprigo-obuchenie/index.html | 2 | desc 53, img без размеров: 8 |
| `/portfolio/become-legendary-architecture` | 1 · "Become Legendary. Архитектура" | 40 | 48 | есть | полное | LocalBusiness | да | prerender/portfolio/become-legendary-architecture/index.html | 2 | desc 48, img без размеров: 4 |
| `/portfolio/egovtsev-podcast-reels` | 1 · "Стас Еговцев. Podcast Reels" | 38 | 38 | есть | полное | LocalBusiness | да | prerender/portfolio/egovtsev-podcast-reels/index.html | 2 | desc 38, img без размеров: 5 |
| `/portfolio/metro-gorkovskaya-reels` | 1 · "Станция «Горьковская». Reels" | 39 | 87 | есть | полное | LocalBusiness | да | prerender/portfolio/metro-gorkovskaya-reels/index.html | 2 | desc 87, img без размеров: 2 |
| `/portfolio/yango-campaign` | 1 · "Yango. Мультиязычная кампания" | 40 | 67 | есть | полное | LocalBusiness | да | prerender/portfolio/yango-campaign/index.html | 2 | desc 67, img без размеров: 1 |
| `/portfolio/osnova-report-reels` | 1 · "«Основа». Отчётные Reels" | 35 | 62 | есть | полное | LocalBusiness | да | prerender/portfolio/osnova-report-reels/index.html | 2 | desc 62, img без размеров: 5 |
| `/portfolio/hoff-product-cards` | 1 · "HOFF. Карточки товара" | 32 | 159 | есть | полное | LocalBusiness | да | prerender/portfolio/hoff-product-cards/index.html | 6 | img без размеров: 10 |
| `/portfolio/caprigo-product-catalog` | 1 · "Caprigo. Каталог продукции" | 37 | 71 | есть | полное | LocalBusiness | да | prerender/portfolio/caprigo-product-catalog/index.html | 2 | desc 71, img без размеров: 10 |
| `/portfolio/cartier-product-video` | 1 · "Cartier. Product video" | 33 | 79 | есть | полное | LocalBusiness | да | prerender/portfolio/cartier-product-video/index.html | 2 | desc 79, img без размеров: 2 |
| `/portfolio/showreel-site` | 1 · "YELYGINN. Showreel" | 29 | 40 | есть | полное | LocalBusiness | да | prerender/portfolio/showreel-site/index.html | 2 | title 29, desc 40, img без размеров: 1 |
| `/portfolio/jetlag-showreel` | 1 · "JetLag. Showreel" | 27 | 54 | есть | полное | LocalBusiness | да | prerender/portfolio/jetlag-showreel/index.html | 2 | title 27, desc 54, img без размеров: 1 |
| `/portfolio/showreel-presentation` | 1 · "Showreel 2025" | 24 | 51 | есть | полное | LocalBusiness | да | prerender/portfolio/showreel-presentation/index.html | 2 | title 24, desc 51, img без размеров: 1 |
| `/portfolio/chistotop-awards` | 1 · "ЧистоТоп. СТАЛЬМАСТЕР // Берёзка" | 43 | 69 | есть | полное | LocalBusiness | да | prerender/portfolio/chistotop-awards/index.html | 2 | desc 69, img без размеров: 2 |
| `/portfolio/osnova-trainer` | 1 · "«Основа». Тренер" | 27 | 53 | есть | полное | LocalBusiness | да | prerender/portfolio/osnova-trainer/index.html | 2 | title 27, desc 53, img без размеров: 1 |
| `/portfolio/osnova-den-materi` | 1 · "«Основа». День матери" | 32 | 50 | есть | полное | LocalBusiness | да | prerender/portfolio/osnova-den-materi/index.html | 2 | desc 50, img без размеров: 1 |
| `/portfolio/forum-malaya-rodina` | 1 · "Форум «Малая Родина»" | 31 | 69 | есть | полное | LocalBusiness | да | prerender/portfolio/forum-malaya-rodina/index.html | 2 | desc 69, img без размеров: 1 |
| `/portfolio/skrf-hockey` | 1 · "Хоккейный турнир СК РФ" | 33 | 74 | есть | полное | LocalBusiness | да | prerender/portfolio/skrf-hockey/index.html | 2 | desc 74, img без размеров: 1 |
| `/portfolio/banya-fest` | 1 · "Баня Фест" | 20 | 103 | есть | полное | LocalBusiness | да | prerender/portfolio/banya-fest/index.html | 2 | title 20, desc 103, img без размеров: 1 |
| `/portfolio/yango-arabic-15` | 1 · "Yango. Арабская версия 15 секунд" | 43 | 105 | есть | полное | LocalBusiness | да | prerender/portfolio/yango-arabic-15/index.html | 2 | desc 105, img без размеров: 1 |
| `/portfolio/teraflex-presentation` | 1 · "Teraflex. Презентация" | 32 | 91 | есть | полное | LocalBusiness | да | prerender/portfolio/teraflex-presentation/index.html | 2 | desc 91, img без размеров: 1 |
| `/portfolio/caprigo-presentation` | 1 · "Caprigo. Презентация производства" | 44 | 75 | есть | полное | LocalBusiness | да | prerender/portfolio/caprigo-presentation/index.html | 2 | desc 75, img без размеров: 1 |
| `/portfolio/korona-production` | 1 · "KORONA: отчётный ролик о производстве" | 48 | 122 | есть | полное | LocalBusiness | да | prerender/portfolio/korona-production/index.html | 6 | img без размеров: 1 |
| `/portfolio/gorky-v-teni-voyny` | 1 · "Горький в тени войны" | 31 | 69 | есть | полное | LocalBusiness | да | prerender/portfolio/gorky-v-teni-voyny/index.html | 2 | desc 69, img без размеров: 1 |
| `/portfolio/socialnyy-uchastkovyy` | 1 · "Губернский проект — Социальный участковый" | 52 | 60 | есть | полное | LocalBusiness | да | prerender/portfolio/socialnyy-uchastkovyy/index.html | 2 | desc 60, img без размеров: 1 |

## Кто на кого ссылается

Внешних (не из манифеста) целей в <a href>: нет.

На каждую страницу ведёт ≥ 2 внутренних ссылок.

