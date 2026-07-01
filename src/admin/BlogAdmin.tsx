// Админ-панель «Блог» (Этап H): посты в БД (markdown), теги, SEO-поля,
// создание/редактирование/публикация/удаление. Публичный рендер — остров /journal.
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import { logAudit } from "../lib/audit";
import type { BlogPost } from "../lib/types";

const store = getStore();

function slugify(s: string): string {
  const map: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
  return s.toLowerCase().split("").map((ch) => map[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `post-${Date.now().toString(36)}`;
}

const empty = { id: "", slug: "", title: "", excerpt: "", bodyMd: "", tags: "", coverUrl: "", seoTitle: "", seoDescription: "", published: false };

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = async () => setPosts(await store.listPosts());
  useEffect(() => { load(); }, []);

  const editing = !!form.id;
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim() || slugify(form.title),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || undefined,
        bodyMd: form.bodyMd || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        coverUrl: form.coverUrl.trim() || undefined,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDescription: form.seoDescription.trim() || undefined,
        published: form.published,
      };
      if (editing) { await store.updatePost(form.id, payload); logAudit("post.update", { entityType: "post", entityId: form.id, after: { title: payload.title, published: payload.published } }); }
      else { const p = await store.createPost(payload); logAudit("post.create", { entityType: "post", entityId: p.id, after: { title: p.title, published: p.published } }); }
      setForm({ ...empty });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (p: BlogPost) =>
    setForm({
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt ?? "", bodyMd: p.bodyMd ?? "",
      tags: (p.tags ?? []).join(", "), coverUrl: p.coverUrl ?? "", seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "", published: p.published,
    });

  const remove = async (p: BlogPost) => {
    if (!confirm(`Удалить пост «${p.title}»?`)) return;
    await store.deletePost(p.id);
    logAudit("post.delete", { entityType: "post", entityId: p.id, before: { title: p.title } });
    if (form.id === p.id) setForm({ ...empty });
    await load();
  };

  const fieldStyle = { width: "100%", marginBottom: 10 };
  const lbl = { fontSize: 12, color: "#8e8e8c", display: "block", margin: "0 0 5px" };

  return (
    <div className="adm-card" style={{ padding: 18 }}>
      <div style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, marginBottom: 22 }}>
        <strong style={{ fontSize: 15 }}>{editing ? "Редактирование поста" : "Новый пост"}</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div><label style={lbl}>Заголовок</label><input className="adm-input" style={fieldStyle} value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><label style={lbl}>Slug (URL)</label><input className="adm-input" style={fieldStyle} placeholder={form.title ? slugify(form.title) : "авто"} value={form.slug} onChange={(e) => set("slug", e.target.value)} /></div>
        </div>
        <label style={lbl}>Краткое описание (excerpt)</label>
        <textarea className="adm-input" style={{ ...fieldStyle, minHeight: 50, resize: "vertical" }} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
        <label style={lbl}>Текст (markdown)</label>
        <textarea className="adm-input" style={{ ...fieldStyle, minHeight: 160, resize: "vertical", fontFamily: "monospace", fontSize: 13 }} value={form.bodyMd} onChange={(e) => set("bodyMd", e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>Теги (через запятую)</label><input className="adm-input" style={fieldStyle} value={form.tags} onChange={(e) => set("tags", e.target.value)} /></div>
          <div><label style={lbl}>Обложка (URL)</label><input className="adm-input" style={fieldStyle} value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} /></div>
        </div>
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", color: "#8e8e8c", fontSize: 12.5 }}>SEO (title / description)</summary>
          <div style={{ marginTop: 10 }}>
            <input className="adm-input" style={fieldStyle} placeholder="SEO title" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            <textarea className="adm-input" style={{ ...fieldStyle, minHeight: 50 }} placeholder="SEO description" value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
          </div>
        </details>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, margin: "0 0 14px" }}>
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} /> Опубликован
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="adm-btn" onClick={save} disabled={saving || !form.title.trim()}>{saving ? "Сохраняю…" : editing ? "Сохранить" : "Создать"}</button>
          {editing && <button className="adm-btn" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#f5f5f4" }} onClick={() => setForm({ ...empty })}>Отмена</button>}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="adm-empty">Постов пока нет. Существующие статьи в /blog остаются как есть.</div>
      ) : (
        <table>
          <thead><tr><th>Заголовок</th><th>Теги</th><th>Статус</th><th /></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>{p.title}<br /><span style={{ color: "#8e8e8c", fontSize: 11 }}>/journal/{p.slug}</span></td>
                <td style={{ fontSize: 12, color: "#8e8e8c" }}>{(p.tags ?? []).join(", ") || "—"}</td>
                <td><span className={p.published ? "adm-pill red" : "adm-pill"}>{p.published ? "Опубликован" : "Черновик"}</span></td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="adm-pill" style={{ cursor: "pointer", background: "transparent", marginRight: 6 }} onClick={() => edit(p)}>править</button>
                  <button className="adm-pill" style={{ cursor: "pointer", background: "transparent", color: "#fe2c1f", borderColor: "rgba(254,44,31,0.5)" }} onClick={() => remove(p)}>удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
