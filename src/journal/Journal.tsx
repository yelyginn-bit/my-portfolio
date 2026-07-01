// Публичный остров /journal — посты блога из БД (Этап H). Листинг + статья (?slug
// или /journal/:slug). Существующие статичные статьи /blog/* остаются отдельно.
import { useEffect, useState, type ReactNode } from "react";
import { getStore } from "../lib/store";
import type { BlogPost } from "../lib/types";

const store = getStore();

function slugFromUrl(): string {
  const m = /^\/journal\/([^/?#]+)/.exec(window.location.pathname);
  if (m) return decodeURIComponent(m[1]);
  return new URLSearchParams(window.location.search).get("slug") || "";
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

/** Инлайн-разметка: **жирный**. */
function inline(text: string, key: number): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <span key={key}>{parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))}</span>;
}

/** Лёгкий markdown → React (заголовки #/##, списки -, абзацы). */
function renderMarkdown(md: string): ReactNode[] {
  const lines = md.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushPara = () => { if (para.length) { out.push(<p key={out.length}>{inline(para.join(" "), 0)}</p>); para = []; } };
  const flushList = () => { if (list.length) { out.push(<ul key={out.length}>{list.map((li, i) => <li key={i}>{inline(li, i)}</li>)}</ul>); list = []; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) { flushPara(); flushList(); out.push(<h3 key={out.length}>{line.replace(/^##\s+/, "")}</h3>); }
    else if (/^#\s+/.test(line)) { flushPara(); flushList(); out.push(<h2 key={out.length}>{line.replace(/^#\s+/, "")}</h2>); }
    else if (/^[-*]\s+/.test(line)) { flushPara(); list.push(line.replace(/^[-*]\s+/, "")); }
    else if (line.trim() === "") { flushPara(); flushList(); }
    else { flushList(); para.push(line); }
  }
  flushPara(); flushList();
  return out;
}

export default function Journal() {
  const slug = slugFromUrl();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (slug) {
        const p = await store.getPostBySlug(slug);
        setPost(p && p.published ? p : null);
        if (p) document.title = `${p.seoTitle || p.title} | Yelyginn`;
      } else {
        setPosts(await store.listPosts({ publishedOnly: true }));
      }
      setLoading(false);
    })();
  }, [slug]);

  const Nav = (
    <div className="j-top">
      <a className="j-logo" href="/">YELYG<span>I</span>NN</a>
      <nav className="j-nav">
        <a href="/">Главная</a>
        <a href="/#all-sections">Все разделы</a>
        <a href="/cases">Кейсы</a>
        <a href="/blog">Статьи</a>
        <a href="/calculator">Калькулятор</a>
      </nav>
    </div>
  );

  // ─── Одиночная статья ─────────────────────────────────────────────────────
  if (slug) {
    return (
      <div className="j-wrap">
        {Nav}
        <a className="j-back" href="/journal">← в журнал</a>
        {loading ? (
          <div className="j-empty">Загрузка…</div>
        ) : !post ? (
          <div className="j-empty">Статья не найдена или снята с публикации.</div>
        ) : (
          <article className="j-article">
            <h1>{post.title}</h1>
            <div className="j-meta">{fmtDate(post.publishedAt || post.createdAt)}</div>
            {post.bodyMd ? renderMarkdown(post.bodyMd) : post.excerpt ? <p>{post.excerpt}</p> : null}
            {post.tags?.length ? (
              <div className="j-tags">{post.tags.map((t) => <span className="j-tag" key={t}>{t}</span>)}</div>
            ) : null}
          </article>
        )}
        <div className="j-cta">
          <a className="j-btn" href="/calculator">Рассчитать съёмку</a>
          <a className="j-btn ghost" href="https://t.me/YuriElygin">Написать в Telegram</a>
        </div>
      </div>
    );
  }

  // ─── Листинг ──────────────────────────────────────────────────────────────
  return (
    <div className="j-wrap">
      {Nav}
      <p className="j-eyebrow">Журнал</p>
      <h1 className="j-title">Заметки о <span>съёмке</span></h1>
      {loading ? (
        <div className="j-empty">Загрузка…</div>
      ) : posts.length === 0 ? (
        <div className="j-empty">
          Пока пусто. Загляните в <a href="/blog" style={{ color: "var(--red)" }}>статьи</a>.
        </div>
      ) : (
        posts.map((p) => (
          <a className="j-card" key={p.id} href={`/journal?slug=${encodeURIComponent(p.slug)}`}>
            <h2>{p.title}</h2>
            <div className="j-meta">{fmtDate(p.publishedAt || p.createdAt)}</div>
            {p.excerpt && <p>{p.excerpt}</p>}
            {p.tags?.length ? <div className="j-tags">{p.tags.map((t) => <span className="j-tag" key={t}>{t}</span>)}</div> : null}
          </a>
        ))
      )}
    </div>
  );
}
