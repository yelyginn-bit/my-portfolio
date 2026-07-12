// Уведомления (v2): журнал исходящих событий (lead.new / gallery.shared / payment.succeeded / …)
// + best-effort доставка админу в Telegram через /api/notify.
//
// Контракт как у logAudit: never throws, не ломает основное действие.
// Запись всегда попадает в журнал (store.createNotification); доставка опциональна
// и помечает статус sent/failed. Серверная доставка платежей идёт прямо из webhook
// (см. api/payment-webhook.js) — тут только клиентские события.
//
// Критичные уведомления формируются сервером; этот helper обслуживает
// административные действия и не принимает неавторизованные публичные записи.
import { getStore } from "./store";
import { secureFetch } from "./api";

interface NotifyOptions {
  /** Канал доставки (по умолчанию telegram — админ-чат). */
  channel?: string;
  /** Человекочитаемый текст для Telegram. Если не задан — доставка не делается. */
  text?: string;
  recipient?: string;
  entityType?: string;
  entityId?: string;
  payload?: unknown;
  /** Слать ли в Telegram (по умолчанию true, если есть text). */
  deliver?: boolean;
}

/** Зафиксировать событие в журнале уведомлений и (опц.) доставить админу. */
export async function notify(type: string, opts: NotifyOptions = {}): Promise<void> {
  const channel = opts.channel || "telegram";
  const willDeliver = opts.deliver !== false && !!opts.text;
  try {
    const rec = await getStore().createNotification({
      type,
      channel,
      recipient: opts.recipient,
      entityType: opts.entityType,
      entityId: opts.entityId,
      payload: opts.payload,
      status: willDeliver ? "pending" : "sent",
    });

    if (!willDeliver) return;

    let ok = false;
    try {
      const res = await secureFetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, text: opts.text }),
      });
      const d = await res.json().catch(() => ({}));
      ok = res.ok && d?.ok;
    } catch { ok = false; }

    try {
      await getStore().updateNotificationStatus(rec.id, ok ? "sent" : "failed", ok ? undefined : "delivery failed");
    } catch { /* журнал недоступен — событие уже отправлено в Telegram */ }
  } catch { /* журнал недоступен — не критично для основного действия */ }
}
