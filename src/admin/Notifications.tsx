// Админ-панель «Уведомления» (v2): журнал исходящих событий (lead.new / gallery.shared
// / payment.succeeded) с каналом, получателем и статусом доставки (sent/failed/pending).
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import type { Notification } from "../lib/types";

const store = getStore();

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

const STATUS_LABEL: Record<string, string> = { sent: "Доставлено", failed: "Ошибка", pending: "В очереди" };

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { store.listNotifications().then(setItems).finally(() => setLoading(false)); }, []);

  return (
    <div className="adm-card">
      {loading ? (
        <div className="adm-empty">Загрузка…</div>
      ) : items.length === 0 ? (
        <div className="adm-empty">Уведомлений пока нет. Здесь — заявки, открытие доступа к галереям, оплаты.</div>
      ) : (
        <table>
          <thead><tr><th>Когда</th><th>Событие</th><th>Канал</th><th>Объект</th><th>Статус</th></tr></thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <td className="adm-mono">{fmt(n.createdAt)}</td>
                <td><span className="adm-pill">{n.type}</span></td>
                <td style={{ fontSize: 12, color: "var(--gray)" }}>{n.channel}{n.recipient ? ` · ${n.recipient}` : ""}</td>
                <td style={{ fontSize: 12, color: "var(--gray)" }}>{n.entityType || "—"}{n.entityId ? ` · ${String(n.entityId).slice(0, 8)}` : ""}</td>
                <td>
                  <span className={n.status === "sent" ? "adm-pill red" : "adm-pill"} title={n.error || ""}>
                    {STATUS_LABEL[n.status] || n.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
