// Публичный остров /cases — опубликованные портфолио-кейсы (Этап H).
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import type { PortfolioCase } from "../lib/types";

const store = getStore();

export default function Cases() {
  const [cases, setCases] = useState<PortfolioCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.listCases({ publishedOnly: true })
      .then((c) => setCases(c))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="c-wrap">
      <div className="c-top">
        <a className="c-logo" href="/" aria-label="YELYGINN — главная">Y</a>
        <nav className="c-nav">
          <a href="/portfolio">Работы</a>
          <a href="/portfolio/camera">Съёмка</a>
          <a href="/photo">Фото</a>
          <a href="/portfolio/post">Пост</a>
          <a href="/cases" aria-current="page">Кейсы</a>
          <a href="/blog">Блог</a>
          <a href="/#about">Обо мне</a>
        </nav>
        <span className="c-status">CORE // READY</span>
        <a className="c-contact" href="/#contact">Обсудить проект ↗</a>
      </div>

      <p className="c-eyebrow">Кейсы</p>
      <h1 className="c-title">Проекты, которые <span>сработали</span></h1>

      {loading ? (
        <div className="c-empty">Загрузка…</div>
      ) : cases.length === 0 ? (
        <div className="c-empty">
          Кейсы скоро появятся. Пока посмотрите <a href="/portfolio" style={{ color: "var(--red)" }}>портфолио</a>.
        </div>
      ) : (
        <div className="c-list">
          {cases.map((c) => (
            <article className="c-case" key={c.id}>
              <h2>{c.title}</h2>
              {c.clientName && <div className="c-client">{c.clientName}</div>}
              {c.productionTeam && c.projectRole && <p>Работа над проектом в составе команды {c.productionTeam}. Моя роль: {c.projectRole}.</p>}
              <div className="c-blocks">
                {c.task && <div className="c-block"><div className="c-block-label">Задача</div><p>{c.task}</p></div>}
                {c.solution && <div className="c-block"><div className="c-block-label">Решение</div><p>{c.solution}</p></div>}
                {c.result && <div className="c-block"><div className="c-block-label">Результат</div><p>{c.result}</p></div>}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="c-cta">
        <a className="c-btn" href="/calculator">Рассчитать проект</a>
        <a className="c-btn ghost" href="https://t.me/YuriElygin">Обсудить в Telegram</a>
      </div>
    </div>
  );
}
