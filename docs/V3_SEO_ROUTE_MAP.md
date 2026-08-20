# V3 SEO route map

| URL | Intent | H1 | Index | Canonical / schema |
|---|---|---|---|---|
| `/` | оператор + монтаж + видеопродакшн НН | YELYGINN VIDEO | yes | `/`; Person / ProfessionalService retained in source shell |
| `/portfolio` | общее видеопортфолио | Все работы | yes | `/portfolio` |
| `/portfolio/camera` | операторская работа | Операторская работа | yes | self |
| `/portfolio/commercial` | commercial / рекламное видео | Коммерческие проекты | yes | self |
| `/portfolio/events` | event video / SDE | События и SDE | yes | self |
| `/portfolio/reels` | Reels / vertical video | Вертикальные работы | yes | self |
| `/portfolio/concerts` | концертная съёмка | Концерты | yes | self |
| `/portfolio/interviews` | интервью / podcast | Интервью и спецпроекты | yes | self |
| `/portfolio/post` | монтаж видео | Монтаж и постпродакшн | yes | self |
| `/portfolio/color` | цветокоррекция | Цвет | yes | self |
| `/portfolio/broadcast` | live / multicamera work | Live / multicamera | yes | self |
| `/portfolio/product` | карточки товара / product video | Продуктовое видео | yes | self |
| `/portfolio/:slug` (32 canonical projects) | конкретная работа / подтверждённая роль | project title | yes | self; all canonical slugs are listed in sitemap |
| `/pryamye-translyacii` | оператор прямых трансляций | Прямые трансляции | yes | self; Service |
| `/ceny`, `/calculator`, `/cases`, `/blog/*`, existing service URLs | established intent | preserved | yes | preserved |
| `/account`, `/admin`, `/gallery`, `/g/*`, `/journal`, `/photo`, `/portfolio/photo` | internal / inactive | n/a | no | removed from sitemap; meta and/or X-Robots-Tag |

Old `/portfolio/editing`, `/portfolio/metro-gorkovskaya` and `/portfolio/sber-architecture-course` receive 301 redirects to their V3 equivalents in the Express server and are excluded from sitemap.
