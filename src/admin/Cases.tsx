// Админ-панель «Кейсы» (Этап H): портфолио-кейсы (клиент/задача/решение/результат),
// привязка к галерее, создание/редактирование/публикация/удаление.
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import { logAudit } from "../lib/audit";
import type { Gallery, PortfolioCase } from "../lib/types";

const store = getStore();

function slugify(s: string): string {
  const map: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
  return s.toLowerCase().split("").map((ch) => map[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `case-${Date.now().toString(36)}`;
}

const empty = { id: "", slug: "", clientName: "", title: "", task: "", solution: "", result: "", galleryId: "", published: false };

export default function Cases() {
  const [cases, setCases] = useState<PortfolioCase[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setCases(await store.listCases());
    setGalleries(await store.listGalleries());
  };
  useEffect(() => { load(); }, []);

  const editing = !!form.id;
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim() || slugify(form.title),
        clientName: form.clientName.trim() || undefined,
        title: form.title.trim(),
        task: form.task.trim() || undefined,
        solution: form.solution.trim() || undefined,
        result: form.result.trim() || undefined,
        galleryId: form.galleryId || undefined,
        published: form.published,
      };
      if (editing) { await store.updateCase(form.id, payload); logAudit("case.update", { entityType: "case", entityId: form.id, after: { title: payload.title, published: payload.published } }); }
      else { const c = await store.createCase(payload); logAudit("case.create", { entityType: "case", entityId: c.id, after: { title: c.title, published: c.published } }); }
      setForm({ ...empty });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (c: PortfolioCase) =>
    setForm({
      id: c.id, slug: c.slug, clientName: c.clientName ?? "", title: c.title,
      task: c.task ?? "", solution: c.solution ?? "", result: c.result ?? "",
      galleryId: c.galleryId ?? "", published: c.published,
    });

  const remove = async (c: PortfolioCase) => {
    if (!confirm(`Удалить кейс «${c.title}»?`)) return;
    await store.deleteCase(c.id);
    logAudit("case.delete", { entityType: "case", entityId: c.id, before: { title: c.title } });
    if (form.id === c.id) setForm({ ...empty });
    await load();
  };

  const fieldStyle = { width: "100%", marginBottom: 10 };
  const lbl = { fontSize: 12, color: "#8e8e8c", display: "block", margin: "0 0 5px" };

  return (
    <div className="adm-card" style={{ padding: 18 }}>
      {/* Форма */}
      <div style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, marginBottom: 22 }}>
        <strong style={{ fontSize: 15 }}>{editing ? "Редактирование кейса" : "Новый кейс"}</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div><label style={lbl}>Заголовок</label><input className="adm-input" style={fieldStyle} value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><label style={lbl}>Клиент</label><input className="adm-input" style={fieldStyle} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>Slug (URL)</label><input className="adm-input" style={fieldStyle} placeholder={form.title ? slugify(form.title) : "авто"} value={form.slug} onChange={(e) => set("slug", e.target.value)} /></div>
          <div>
            <label style={lbl}>Галерея (медиа кейса)</label>
            <select className="adm-input" style={fieldStyle} value={form.galleryId} onChange={(e) => set("galleryId", e.target.value)}>
              <option value="">— без галереи —</option>
              {galleries.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        </div>
        <label style={lbl}>Задача</label>
        <textarea className="adm-input" style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} value={form.task} onChange={(e) => set("task", e.target.value)} />
        <label style={lbl}>Решение</label>
        <textarea className="adm-input" style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} value={form.solution} onChange={(e) => set("solution", e.target.value)} />
        <label style={lbl}>Результат</label>
        <textarea className="adm-input" style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} value={form.result} onChange={(e) => set("result", e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, margin: "4px 0 14px" }}>
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} /> Опубликован
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="adm-btn" onClick={save} disabled={saving || !form.title.trim()}>{saving ? "Сохраняю…" : editing ? "Сохранить" : "Создать"}</button>
          {editing && <button className="adm-btn" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#f5f5f4" }} onClick={() => setForm({ ...empty })}>Отмена</button>}
        </div>
      </div>

      {/* Список */}
      {cases.length === 0 ? (
        <div className="adm-empty">Кейсов пока нет.</div>
      ) : (
        <table>
          <thead><tr><th>Заголовок</th><th>Клиент</th><th>Статус</th><th /></tr></thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>{c.title}<br /><span style={{ color: "#8e8e8c", fontSize: 11 }}>/{c.slug}</span></td>
                <td>{c.clientName || "—"}</td>
                <td><span className={c.published ? "adm-pill red" : "adm-pill"}>{c.published ? "Опубликован" : "Черновик"}</span></td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="adm-pill" style={{ cursor: "pointer", background: "transparent", marginRight: 6 }} onClick={() => edit(c)}>править</button>
                  <button className="adm-pill" style={{ cursor: "pointer", background: "transparent", color: "#fe2c1f", borderColor: "rgba(254,44,31,0.5)" }} onClick={() => remove(c)}>удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
