// Админ-панель «Отзывы» (Этап G): модерация отзывов клиентов.
// Список с рейтингом и статусом, публикация/снятие, удаление, форма добавления.
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import { logAudit } from "../lib/audit";
import type { Review } from "../lib/types";

const store = getStore();

function stars(rating: number) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setReviews(await store.listReviews());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      await store.createReview({
        authorName: authorName.trim() || undefined,
        rating,
        text: t,
        published: true,
      });
      setAuthorName("");
      setRating(5);
      setText("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (r: Review) => {
    await store.updateReview(r.id, { published: !r.published });
    logAudit("review.publish", { entityType: "review", entityId: r.id, before: { published: r.published }, after: { published: !r.published } });
    await load();
  };

  const remove = async (r: Review) => {
    const who = r.authorName ? `«${r.authorName}»` : "этот отзыв";
    if (!confirm(`Удалить отзыв ${who}?`)) return;
    await store.deleteReview(r.id);
    logAudit("review.delete", { entityType: "review", entityId: r.id });
    await load();
  };

  const inputStyle = { marginBottom: 0 };
  const labelStyle = {
    display: "block",
    fontSize: 12.5,
    color: "#8e8e8c",
    marginBottom: 6,
  };

  return (
    <div className="adm-card" style={{ padding: 18 }}>
      {/* Форма добавления отзыва */}
      <div
        style={{
          background: "#181818",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 22,
        }}
      >
        <strong style={{ fontSize: 15, color: "#f5f5f4" }}>Новый отзыв</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Имя автора</label>
            <input
              className="adm-input"
              style={inputStyle}
              placeholder="Например, Анна"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Рейтинг</label>
            <select
              className="adm-input"
              style={inputStyle}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              <option value={5}>5 ★★★★★</option>
              <option value={4}>4 ★★★★</option>
              <option value={3}>3 ★★★</option>
              <option value={2}>2 ★★</option>
              <option value={1}>1 ★</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Текст отзыва</label>
          <textarea
            className="adm-input"
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            placeholder="Что понравилось клиенту…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <button
            className="adm-btn"
            onClick={add}
            disabled={saving || !text.trim()}
          >
            {saving ? "Добавляем…" : "Добавить"}
          </button>
        </div>
      </div>

      {/* Список отзывов */}
      {loading ? (
        <div className="adm-empty">Загрузка…</div>
      ) : reviews.length === 0 ? (
        <div className="adm-empty">Отзывов пока нет</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#121212",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ fontSize: 14.5, color: "#f5f5f4" }}>
                  {r.authorName || "Аноним"}
                </strong>
                <span
                  style={{ color: "#fe2c1f", fontSize: 14, letterSpacing: 1 }}
                  title={`${r.rating} из 5`}
                >
                  {stars(r.rating)}
                </span>
                <span className={r.published ? "adm-pill red" : "adm-pill"}>
                  {r.published ? "Опубликован" : "Скрыт"}
                </span>
                <span
                  className="adm-note"
                  style={{ marginLeft: "auto", marginBottom: 0 }}
                >
                  {formatDate(r.createdAt)}
                </span>
              </div>
              <p
                style={{
                  margin: "10px 0 12px",
                  color: "#f5f5f4",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {r.text}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="adm-btn"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#f5f5f4",
                  }}
                  onClick={() => togglePublish(r)}
                >
                  {r.published ? "Снять с публикации" : "Опубликовать"}
                </button>
                <button
                  className="adm-btn"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(254,44,31,0.5)",
                    color: "#fe2c1f",
                  }}
                  onClick={() => remove(r)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
