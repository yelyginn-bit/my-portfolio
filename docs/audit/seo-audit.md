# SEO-аудит индексируемых страниц

Сгенерировано `npx tsx scripts/seo-audit.ts --write`. Источник — файлы, которые
отдаёт сервер (`dist/prerender/<route>/index.html`, иначе плоский `dist/<route>.html`),
то есть ровно то, что видит робот. Внесённые вручную правки в этот файл перезапишутся.

Страниц в манифесте: **75** · без замечаний: **75** · URL в sitemap: **75** · с `<lastmod>`: **0**

| маршрут | H1 | title (дл.) | description (дл.) | canonical | og | JSON-LD | sitemap | в пре-рендеренном файле | H2 | замечания |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 1 · "Фотограф и видеооператор в Нижнем Новгороде" | 57 | 150 | есть | полное | WebSite+WebPage+Person+LocalBusiness | да | prerender/index.html | 6 | — |
| `/portfolio` | 1 · "Портфолио видеосъёмки" | 51 | 155 | есть | полное | WebSite+WebPage+ItemList | да | prerender/portfolio/index.html | 1 | — |
| `/blog` | 1 · "О СЪЁМКЕ И МОНТАЖЕ" | 40 | 151 | есть | полное | WebSite+WebPage | да | prerender/blog/index.html | 7 | — |
| `/about` | 1 · "Юрий Елыгин — фотограф и видеооператор" | 49 | 143 | есть | полное | WebSite+WebPage+Person+LocalBusiness | да | prerender/about/index.html | 4 | — |
| `/contact` | 1 · "ЕСТЬ ЗАДАЧА? РАССКАЖИТЕ" | 46 | 125 | есть | полное | WebSite+WebPage+Person+LocalBusiness | да | prerender/contact/index.html | 1 | — |
| `/calculator` | 1 · "Соберите смету под проект" | 52 | 143 | есть | полное | WebSite+WebPage | да | prerender/calculator/index.html | 1 | — |
| `/content-day` | 1 · "Контент-день для бизнеса в Нижнем Новгороде" | 61 | 134 | есть | полное | WebSite+WebPage+OfferCatalog | да | content-day.html | 6 | — |
| `/reklamnye-roliki` | 1 · "Рекламные ролики в Нижнем Новгороде" | 67 | 133 | есть | полное | LocalBusiness / WebSite+WebPage+OfferCatalog | да | reklamnye-roliki.html | 7 | — |
| `/event-video` | 1 · "Видеосъёмка мероприятий в Нижнем Новгороде" | 56 | 149 | есть | полное | LocalBusiness / WebSite+WebPage+OfferCatalog | да | event-video.html | 6 | — |
| `/reels` | 1 · "Съёмка и монтаж Reels" | 54 | 143 | есть | полное | LocalBusiness / WebSite+WebPage+OfferCatalog | да | reels.html | 7 | — |
| `/cvetokorrekciya` | 1 · "Цветокоррекция видео" | 63 | 136 | есть | полное | Service / WebSite+WebPage+OfferCatalog | да | prerender/cvetokorrekciya/index.html | 7 | — |
| `/video-dlya-marketpleysov` | 1 · "Видео для товаров и маркетплейсов" | 61 | 139 | есть | полное | LocalBusiness / WebSite+WebPage+OfferCatalog | да | video-dlya-marketpleysov.html | 6 | — |
| `/sajty` | 1 · "САЙТЫ ПОД КЛЮЧ" | 56 | 133 | есть | полное | FAQPage / WebSite+WebPage | да | prerender/sajty/index.html | 8 | — |
| `/pryamye-translyacii` | 1 · "Онлайн-трансляции в Нижнем Новгороде" | 61 | 142 | есть | полное | Service / WebSite+WebPage+OfferCatalog | да | pryamye-translyacii.html | 9 | — |
| `/ceny` | 1 · "Цены на фото, видеосъёмку и монтаж" | 67 | 144 | есть | полное | WebSite+WebPage+Person+LocalBusiness+OfferCatalog | да | prerender/ceny/index.html | 3 | — |
| `/photo` | 1 · "Фотограф в Нижнем Новгороде — портреты и меро | 66 | 131 | есть | полное | WebSite+WebPage+Person+LocalBusiness+OfferCatalog | да | photo.html | 10 | — |
| `/portretnaya-fotosessiya` | 1 · "Портретная фотосессия в Нижнем Новгороде" | 54 | 136 | есть | полное | WebSite+WebPage+Person+LocalBusiness+OfferCatalog | да | portretnaya-fotosessiya.html | 7 | — |
| `/reportazhnaya-fotosemka` | 1 · "Репортажный фотограф в Нижнем Новгороде" | 53 | 145 | есть | полное | WebSite+WebPage+Person+LocalBusiness+OfferCatalog | да | reportazhnaya-fotosemka.html | 7 | — |
| `/privacy-policy` | 1 · "Политика в отношении обработки персональных д | 44 | 149 | есть | полное | WebSite+WebPage | да | prerender/privacy-policy/index.html | 11 | — |
| `/personal-data-consent` | 1 · "Согласие на обработку персональных данных" | 52 | 146 | есть | полное | WebSite+WebPage | да | prerender/personal-data-consent/index.html | 5 | — |
| `/cookie-policy` | 1 · "Политика использования cookies" | 41 | 144 | есть | полное | WebSite+WebPage | да | prerender/cookie-policy/index.html | 4 | — |
| `/terms` | 1 · "Условия оказания услуг" | 45 | 142 | есть | полное | WebSite+WebPage | да | prerender/terms/index.html | 5 | — |
| `/payment-terms` | 1 · "Условия оплаты и чек НПД" | 41 | 148 | есть | полное | WebSite+WebPage | да | prerender/payment-terms/index.html | 4 | — |
| `/cancellation-refund` | 1 · "Отмена и возврат" | 42 | 149 | есть | полное | WebSite+WebPage | да | prerender/cancellation-refund/index.html | 3 | — |
| `/gallery-terms` | 1 · "Условия клиентских галерей" | 37 | 148 | есть | полное | WebSite+WebPage | да | prerender/gallery-terms/index.html | 4 | — |
| `/data-request` | 1 · "Запросы по персональным данным" | 51 | 150 | есть | полное | WebSite+WebPage | да | prerender/data-request/index.html | 3 | — |
| `/blog/skolko-stoit-snyat-reklamnyy-rolik` | 1 · "Сколько стоит снять рекламный ролик в Нижнем  | 60 | 163 | есть | полное | Article / WebSite+WebPage | да | blog/skolko-stoit-snyat-reklamnyy-rolik.html | 6 | — |
| `/blog/kak-snimat-reels-dlya-biznesa` | 1 · "Как снимать Reels для бизнеса: форматы, струк | 68 | 144 | есть | полное | Article / WebSite+WebPage | да | blog/kak-snimat-reels-dlya-biznesa.html | 8 | — |
| `/blog/video-dlya-kartochek-wildberries` | 1 · "Видео для карточек Wildberries и Ozon: требов | 65 | 162 | есть | полное | Article / WebSite+WebPage | да | blog/video-dlya-kartochek-wildberries.html | 6 | — |
| `/blog/videosemka-meropriyatiy-nn` | 1 · "Видеосъёмка мероприятий в Нижнем Новгороде: к | 58 | 150 | есть | полное | Article / WebSite+WebPage | да | blog/videosemka-meropriyatiy-nn.html | 9 | — |
| `/blog/videograf-operator-postanovshchik` | 1 · "Видеограф, оператор и оператор-постановщик: к | 67 | 134 | есть | полное | Article / WebSite+WebPage | да | blog/videograf-operator-postanovshchik.html | 8 | — |
| `/blog/podgotovka-intervyu` | 1 · "Как подготовиться к съёмке интервью: площадка | 64 | 135 | есть | полное | Article / WebSite+WebPage | да | blog/podgotovka-intervyu.html | 8 | — |
| `/portfolio/camera` | 1 · "Операторская работа" | 55 | 155 | есть | полное | WebSite+WebPage | да | prerender/portfolio/camera/index.html | 1 | — |
| `/portfolio/commercial` | 1 · "Коммерческие проекты" | 56 | 159 | есть | полное | WebSite+WebPage | да | prerender/portfolio/commercial/index.html | 1 | — |
| `/portfolio/events` | 1 · "События и фестивали" | 55 | 141 | есть | полное | WebSite+WebPage | да | prerender/portfolio/events/index.html | 1 | — |
| `/portfolio/reels` | 1 · "Вертикальные работы" | 55 | 145 | есть | полное | WebSite+WebPage | да | prerender/portfolio/reels/index.html | 1 | — |
| `/portfolio/concerts` | 1 · "Концерты" | 44 | 154 | есть | полное | WebSite+WebPage | да | prerender/portfolio/concerts/index.html | 1 | — |
| `/portfolio/interviews` | 1 · "Интервью и спецпроекты" | 58 | 152 | есть | полное | WebSite+WebPage | да | prerender/portfolio/interviews/index.html | 1 | — |
| `/portfolio/post` | 1 · "Монтаж и постпродакшн" | 57 | 156 | есть | полное | WebSite+WebPage | да | prerender/portfolio/post/index.html | 1 | — |
| `/portfolio/color` | 1 · "Цветокоррекция" | 50 | 156 | есть | полное | WebSite+WebPage | да | prerender/portfolio/color/index.html | 1 | — |
| `/portfolio/broadcast` | 1 · "Прямая трансляция" | 53 | 147 | есть | полное | WebSite+WebPage | да | prerender/portfolio/broadcast/index.html | 1 | — |
| `/portfolio/product` | 1 · "Продуктовое видео" | 53 | 146 | есть | полное | WebSite+WebPage | да | prerender/portfolio/product/index.html | 1 | — |
| `/portfolio/gorky-stranicy-pamyati` | 1 · "Горький. Страницы памяти" | 59 | 147 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/gorky-stranicy-pamyati/index.html | 3 | — |
| `/portfolio/metro-gorkovskaya-concerts` | 1 · "Концерты «Станции метро Горьковская»" | 66 | 159 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/metro-gorkovskaya-concerts/index.html | 3 | — |
| `/portfolio/sber-arhitektura` | 1 · "SBER.Архитектура" | 59 | 159 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/sber-arhitektura/index.html | 3 | — |
| `/portfolio/zhenshchiny-sibura` | 1 · "Женщины СИБУРа" | 55 | 138 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/zhenshchiny-sibura/index.html | 4 | — |
| `/portfolio/uchenye-nizhnego` | 1 · "Учёные Нижнего" | 52 | 159 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/uchenye-nizhnego/index.html | 3 | — |
| `/portfolio/horosho-teaser` | 1 · "«Хорошо». Тизер" | 48 | 145 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/horosho-teaser/index.html | 3 | — |
| `/portfolio/zhenshchiny-sibura-teaser` | 1 · "Женщины СИБУРа. Тизер" | 48 | 110 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/zhenshchiny-sibura-teaser/index.html | 3 | — |
| `/portfolio/sber-arhitektura-teaser` | 1 · "SBER.Архитектура. Тизер" | 49 | 144 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/sber-arhitektura-teaser/index.html | 3 | — |
| `/portfolio/barier-instrukcii` | 1 · "БАРЬЕР. Видеоинструкции" | 53 | 147 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/barier-instrukcii/index.html | 3 | — |
| `/portfolio/caprigo-obuchenie` | 1 · "Caprigo. Обучающие видео" | 51 | 151 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/caprigo-obuchenie/index.html | 3 | — |
| `/portfolio/become-legendary-architecture` | 1 · "Become Legendary. Архитектура" | 56 | 163 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/become-legendary-architecture/index.html | 3 | — |
| `/portfolio/egovtsev-podcast-reels` | 1 · "Стас Еговцев. Podcast Reels" | 55 | 144 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/egovtsev-podcast-reels/index.html | 3 | — |
| `/portfolio/metro-gorkovskaya-reels` | 1 · "Станция «Горьковская». Reels" | 68 | 153 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/metro-gorkovskaya-reels/index.html | 3 | — |
| `/portfolio/yango-campaign` | 1 · "Yango. Мультиязычная кампания" | 61 | 142 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/yango-campaign/index.html | 3 | — |
| `/portfolio/osnova-report-reels` | 1 · "«Основа». Отчётные Reels" | 51 | 147 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/osnova-report-reels/index.html | 3 | — |
| `/portfolio/hoff-product-cards` | 1 · "HOFF. Карточки товара" | 56 | 158 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/hoff-product-cards/index.html | 7 | — |
| `/portfolio/caprigo-product-catalog` | 1 · "Caprigo. Каталог продукции" | 61 | 148 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/caprigo-product-catalog/index.html | 3 | — |
| `/portfolio/cartier-product-video` | 1 · "Cartier. Product video" | 53 | 122 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/cartier-product-video/index.html | 3 | — |
| `/portfolio/showreel-site` | 1 · "YELYGINN. Showreel" | 56 | 132 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/showreel-site/index.html | 3 | — |
| `/portfolio/jetlag-showreel` | 1 · "JetLag. Showreel" | 53 | 123 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/jetlag-showreel/index.html | 3 | — |
| `/portfolio/showreel-presentation` | 1 · "Showreel 2025" | 58 | 133 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/showreel-presentation/index.html | 3 | — |
| `/portfolio/chistotop-awards` | 1 · "ЧистоТоп. СТАЛЬМАСТЕР // Берёзка" | 58 | 118 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/chistotop-awards/index.html | 3 | — |
| `/portfolio/osnova-trainer` | 1 · "«Основа». Тренер" | 53 | 134 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/osnova-trainer/index.html | 3 | — |
| `/portfolio/osnova-den-materi` | 1 · "«Основа». День матери" | 58 | 126 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/osnova-den-materi/index.html | 3 | — |
| `/portfolio/forum-malaya-rodina` | 1 · "Форум «Малая Родина»" | 52 | 159 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/forum-malaya-rodina/index.html | 3 | — |
| `/portfolio/skrf-hockey` | 1 · "Хоккейный турнир СК РФ" | 59 | 162 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/skrf-hockey/index.html | 3 | — |
| `/portfolio/banya-fest` | 1 · "Баня Фест" | 57 | 139 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/banya-fest/index.html | 3 | — |
| `/portfolio/yango-arabic-15` | 1 · "Yango. Арабская версия 15 секунд" | 59 | 145 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/yango-arabic-15/index.html | 3 | — |
| `/portfolio/teraflex-presentation` | 1 · "Teraflex. Презентация" | 63 | 154 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/teraflex-presentation/index.html | 3 | — |
| `/portfolio/caprigo-presentation` | 1 · "Caprigo. Презентация производства" | 65 | 135 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/caprigo-presentation/index.html | 3 | — |
| `/portfolio/korona-production` | 1 · "KORONA: отчётный ролик о производстве" | 63 | 154 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/korona-production/index.html | 7 | — |
| `/portfolio/gorky-v-teni-voyny` | 1 · "Горький в тени войны" | 58 | 151 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/gorky-v-teni-voyny/index.html | 3 | — |
| `/portfolio/socialnyy-uchastkovyy` | 1 · "Губернский проект — Социальный участковый" | 52 | 142 | есть | полное | WebSite+WebPage+CreativeWork | да | prerender/portfolio/socialnyy-uchastkovyy/index.html | 3 | — |

## Кто на кого ссылается

Внешних (не из манифеста) целей в <a href>: нет.

На каждую страницу ведёт ≥ 2 внутренних ссылок.

