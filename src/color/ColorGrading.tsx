/**
 * Страница /cvetokorrekciya — цветокоррекция как отдельная удалённая услуга.
 *
 * Почему отдельная страница, а не пункт в монтаже: позиционирование сайта —
 * «оператор и колорист», но до сих пор цвет продавался только как опция внутри
 * монтажа (4 000–9 000 ₽). Половина заявленной специализации не имела ни
 * маршрута, ни цены, ни доказательства.
 *
 * Услуга удалённая: география съёмок ограничена Нижним Новгородом, а грейд
 * принимает исходники откуда угодно. Это единственная услуга на сайте, которую
 * можно продавать по всей России без выезда, поэтому маршрут отделён от съёмочных.
 *
 * Цены — из прайс-листа «ПРАЙС_Y.E_2026.docx», раздел 3 «Цветокоррекция».
 * Это единственный подтверждённый владельцем источник цен на цвет;
 * выдуманных значений здесь нет.
 */
import { ArrowUpRight } from "lucide-react";
import { PageContainer, Section, SectionHeader, SiteFooter, SiteHeader } from "../components/site/Layout";
import { ColorCompare } from "../components/ColorCompare";
import { COLOR_COMPARE_PAIRS } from "../lib/colorCompare.data";
import { SITE } from "../config/site";

/** Тарифы из прайс-листа 2026, раздел «Цветокоррекция (Color Grading)». */
const TIERS = [
  {
    id: "podcast",
    title: "Подкаст или интервью",
    price: "от 10 000 ₽",
    unit: "за проект",
    body: "Многокамерная запись в одном интерьере. Свожу камеры к одному тону, чтобы склейки не читались.",
  },
  {
    id: "business",
    title: "Бизнес-видео до 5 минут",
    price: "от 25 000 ₽",
    unit: "за проект",
    body: "Рекламный, имиджевый или продуктовый ролик. Разбор по сценам, вторичная коррекция, финальный мастер.",
  },
  {
    id: "lut",
    title: "Разработка LUT / Look Dev",
    price: "от 15 000 ₽",
    unit: "за услугу",
    body: "Единый look под бренд или сериал роликов, чтобы дальше снимать и монтировать в одном характере.",
  },
  {
    id: "hourly",
    title: "Почасовая работа",
    price: "от 10 000 ₽",
    unit: "за час, минимум 3 часа",
    body: "Для интернет-рекламы и ТВ, когда объём заранее не известен или материал нужно смотреть вместе.",
  },
] as const;

/** Что должно приехать от заказчика, чтобы грейд вообще имел смысл. */
const REQUIREMENTS = [
  {
    title: "Исходники, а не экспорт",
    body: "Log, RAW или хотя бы исходные файлы с камеры. Перекодированный в H.264 мастер тянется плохо — запас по цвету уже потерян.",
  },
  {
    title: "Смонтированный таймлайн",
    body: "Проект Resolve, XML, AAF или EDL. Если монтаж делал я, этот шаг пропускаем.",
  },
  {
    title: "Referens и контекст",
    body: "Пара кадров или роликов «хочу так». Одно изображение объясняет больше, чем страница описания.",
  },
];

const PROCESS = [
  { step: "01", title: "Смотрю материал", body: "Оцениваю запас по цвету и что вообще достижимо. Если материал не тянет — говорю сразу, а не после оплаты." },
  { step: "02", title: "Считаю и фиксирую", body: "Стоимость и срок после просмотра исходников, не по названию задачи." },
  { step: "03", title: "Первичная коррекция", body: "Баланс, экспозиция, сведение камер и сцен к одной базе." },
  { step: "04", title: "Грейд и правки", body: "Характер, вторичные коррекции, работа по кадру. Два круга правок включены." },
];

export default function ColorGrading() {
  const hasProof = COLOR_COMPARE_PAIRS.length > 0;

  return (
    <>
      <SiteHeader active="services" />

      <main id="main">
        <Section className="color-hero">
          <PageContainer>
            <p className="ds-eyebrow">Цветокоррекция</p>
            <h1>Цвет в DaVinci&nbsp;Resolve</h1>
            <p className="color-hero-lead">
              Отдельная услуга без выезда: присылаете исходники — возвращаю грейд.
              Работаю с материалом из любого города, съёмочная география здесь роли не играет.
            </p>
            <div className="color-hero-actions">
              <a className="color-btn" href="/#contact">Обсудить проект</a>
              <a className="color-btn color-btn--ghost" href={SITE.telegramUrl} target="_blank" rel="noreferrer">
                Telegram <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
          </PageContainer>
        </Section>

        {/*
          Секция доказательства показывается только при реальных парах кадров.
          Пустой слайдер или заглушка на странице колориста хуже, чем её отсутствие:
          это ровно то место, где посетитель проверяет навык.
        */}
        {hasProof && (
          <Section className="color-proof">
            <PageContainer>
              <SectionHeader
                eyebrow="До и после"
                title="Что меняется"
                intro="Один и тот же кадр, один кроп, одно разрешение. Слева — исходник с камеры."
              />
              <div className="color-proof-list">
                {COLOR_COMPARE_PAIRS.map((pair) => (
                  <ColorCompare key={pair.id} pair={pair} />
                ))}
              </div>
            </PageContainer>
          </Section>
        )}

        <Section className="color-tiers">
          <PageContainer>
            <SectionHeader
              eyebrow="Стоимость"
              title="Сколько стоит"
              intro="Ориентиры для первичной оценки. Точная сумма — после просмотра исходников."
            />
            <div className="color-tier-list">
              {TIERS.map((tier) => (
                <article className="color-tier" key={tier.id}>
                  <h3>{tier.title}</h3>
                  <strong>{tier.price}</strong>
                  <span>{tier.unit}</span>
                  <p>{tier.body}</p>
                </article>
              ))}
            </div>
            <p className="color-note">
              Экспресс-сдача в течение суток считается с надбавкой. Правки сверх двух кругов —
              отдельно, по объёму.
            </p>
          </PageContainer>
        </Section>

        <Section className="color-process">
          <PageContainer>
            <SectionHeader eyebrow="Процесс" title="Как идёт работа" />
            <ol className="color-process-list">
              {PROCESS.map((item) => (
                <li key={item.step}>
                  <span aria-hidden="true">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
          </PageContainer>
        </Section>

        <Section className="color-requirements">
          <PageContainer>
            <SectionHeader
              eyebrow="Что нужно от вас"
              title="Чтобы начать"
              intro="Чем ближе материал к исходному, тем больше с ним можно сделать."
            />
            <div className="color-req-list">
              {REQUIREMENTS.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </PageContainer>
        </Section>

        <Section className="color-cta">
          <PageContainer>
            <h2>Пришлите материал — посмотрю и скажу, что с ним можно сделать</h2>
            <div>
              <a className="color-btn" href="/#contact">Оставить заявку</a>
              <a className="color-btn color-btn--ghost" href="/ceny">Все услуги и цены</a>
            </div>
          </PageContainer>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
