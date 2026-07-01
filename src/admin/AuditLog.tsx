// Админ-панель «История» (v2): журнал действий админа (admin_actions).
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import type { AdminAction } from "../lib/types";

const store = getStore();

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function AuditLog() {
  const [items, setItems] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { store.listAdminActions().then(setItems).finally(() => setLoading(false)); }, []);

  return (
    <div className="adm-card">
      {loading ? (
        <div className="adm-empty">Загрузка…</div>
      ) : items.length === 0 ? (
        <div className="adm-empty">Действий пока нет. Здесь будут логироваться изменения в админке.</div>
      ) : (
        <table>
          <thead><tr><th>Когда</th><th>Действие</th><th>Объект</th><th>Кто</th><th>Детали</th></tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="adm-mono">{fmt(a.createdAt)}</td>
                <td><span className="adm-pill">{a.action}</span></td>
                <td style={{ fontSize: 12, color: "var(--gray)" }}>{a.entityType || "—"}{a.entityId ? ` · ${String(a.entityId).slice(0, 8)}` : ""}</td>
                <td style={{ fontSize: 12 }}>{a.actor}</td>
                <td>
                  {(a.before || a.after) ? (
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 11.5, color: "var(--gray)" }}>было/стало</summary>
                      <pre style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap", margin: "6px 0 0", maxWidth: 360, overflowX: "auto" }}>
{JSON.stringify({ before: a.before, after: a.after }, null, 2)}
                      </pre>
                    </details>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
