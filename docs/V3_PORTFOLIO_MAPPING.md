# V3 portfolio mapping

The exact Kinescope ID → project mapping lives in `src/portfolio/v3PortfolioData.ts`; `sourceOrder` is stable and auditable.

| Source order | Project | Source category | Assets | Evidence | Public |
|---|---|---|---:|---|---|
| 01 | Горький. Страницы памяти | спектакли | 1 | SOURCE_CONFIRMED | yes |
| 02–06 | Концерты на станции «Горьковская» | концерты | 5 | SOURCE_CONFIRMED | yes |
| 07–12 | SBER.Архитектура | интервью / спецпроекты | 6 | SOURCE_CONFIRMED | yes |
| 13–18 | Женщины СИБУРа | интервью / спецпроекты | 6 | SOURCE_CONFIRMED | yes |
| 19–21 | Учёные Нижнего | интервью / спецпроекты | 3 | SOURCE_CONFIRMED | yes |
| 22–24 | Тизеры: «Хорошо», СИБУР, Сбер | тизеры | 3 | SOURCE_CONFIRMED | yes |
| 25–27 | БАРЬЕР | обучающие | 3 | SOURCE_CONFIRMED | yes |
| 28–35 | Caprigo. Обучающие | обучающие | 8 | SOURCE_CONFIRMED | yes |
| 36–39 | Become Legendary | архитектура | 4 | SOURCE_CONFIRMED | yes |
| 40–44 | Стас Еговцев. Podcast Reels | Reels | 5 | SOURCE_CONFIRMED | yes |
| 45–46 | Станция «Горьковская». Reels | Reels | 2 | SOURCE_CONFIRMED | yes |
| 47 | Yango | Reels | 1 | SOURCE_CONFIRMED | yes |
| 48–52 | «Основа». Отчётные Reels | Reels | 5 | SOURCE_CONFIRMED | yes |
| 53–62 | HOFF. Карточки товара | карточки товара | 10 | SOURCE_CONFIRMED | yes |
| 63–72 | Caprigo. Каталог продукции | карточки товара | 10 | SOURCE_CONFIRMED | yes |
| 73–74 | Cartier. Product video | карточки товара | 2 | SOURCE_CONFIRMED | yes |
| 75–77 | Showreels | showreels | 3 | SOURCE_CONFIRMED | yes |
| 78–84 | Event / SDE group | SDE / отчётные ролики | 7 | SOURCE_CONFIRMED | yes |
| 85–87 | Yango / Teraflex / Caprigo | презентационные | 3 | SOURCE_CONFIRMED | yes |
| 88 | KORONA. Производство | заводы / производства | 1 | SOURCE_CONFIRMED | yes |
| 89 | Горький в тени войны | спектакли | 1 | SOURCE_CONFIRMED | yes |

Legacy portfolio data remains in `src/portfolio/portfolioData.ts`. The V3 engine never imports it into the public catalog, so non-canonical legacy assets are retained in source but hidden from filters, featured work, category pages and the new sitemap.
