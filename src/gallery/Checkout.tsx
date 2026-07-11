// Чек-аут допов из галереи (Этап F): ретушь/печать отмеченных фото + товары.
// Создаёт заказ и инициирует оплату ЮKassa; имитация доступна только в dev.
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { getStore } from "../lib/store";
import { PRODUCTS } from "../lib/products";
import { formatRub } from "../lib/calc";
import type { OrderItem } from "../lib/types";
import { secureFetch } from "../lib/api";

const store = getStore();
type PayMethod = "card" | "sbp";

export default function Checkout({
  galleryId,
  retouchCount,
  printCount,
  defaultName,
  defaultPhone,
  onClose,
  onPaid,
}: {
  galleryId: string;
  retouchCount: number;
  printCount: number;
  defaultName?: string;
  defaultPhone?: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  // Начальные количества: для ретуши/печати — из числа отмеченных фото.
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const q: Record<string, number> = {};
    for (const p of PRODUCTS) {
      if (p.id === "retouch") q[p.id] = retouchCount;
      else if (p.id === "print_a4") q[p.id] = printCount;
      else q[p.id] = 0;
    }
    return q;
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<PayMethod>("sbp");
  const [qr, setQr] = useState<string | null>(null);
  const [mockOrderId, setMockOrderId] = useState<string | null>(null);
  const [paymentAvailable, setPaymentAvailable] = useState<boolean | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => {
    fetch("/api/payment-create")
      .then((response) => response.json())
      .then((data) => setPaymentAvailable(Boolean(data?.available)))
      .catch(() => setPaymentAvailable(false));
  }, []);

  const startPolling = (orderId: string, paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await secureFetch("/api/payment-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId, orderId }) })
        .then((x) => x.json()).catch(() => ({}));
      if (s.status === "succeeded") {
        if (pollRef.current) clearInterval(pollRef.current);
        setDone(true); onPaid();
      } else if (s.status === "canceled") {
        if (pollRef.current) clearInterval(pollRef.current);
        setError("Платёж отменён.");
      }
    }, 3000);
  };

  const confirmMockSbp = async () => {
    if (!mockOrderId) return;
    await store.markShopOrderPaid(mockOrderId, { provider: "dev-sbp", paymentId: "mock" });
    setDone(true); onPaid();
  };

  const items: OrderItem[] = useMemo(
    () =>
      PRODUCTS.filter((p) => (qty[p.id] || 0) > 0).map((p) => ({
        productId: p.id,
        title: p.title,
        qty: qty[p.id],
        unitPrice: p.price,
        total: p.price * qty[p.id],
      })),
    [qty],
  );
  const total = items.reduce((s, i) => s + i.total, 0);

  const setQ = (id: string, v: number) => setQty((q) => ({ ...q, [id]: Math.max(0, v) }));

  const pay = async () => {
    setError("");
    if (total === 0) { setError("Выберите хотя бы одну услугу."); return; }
    if (!defaultPhone) { setError("Войдите в личный кабинет перед оформлением заказа."); return; }
    setBusy(true);
    try {
      const orderResponse = await secureFetch("/api/order-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryId, items: items.map(({ productId, qty }) => ({ productId, qty })) }),
      });
      const orderResult = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok || !orderResult.ok) throw new Error(orderResult.error || "order unavailable");
      const orderId = orderResult.orderId;
      const response = await secureFetch("/api/payment-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          method,
        }),
      });
      const r = await response.json().catch(() => ({}));
      if (!response.ok || !r?.ok) {
        throw new Error(r?.error || "payment unavailable");
      }

      // Карта (прод): редирект на форму ЮKassa.
      if (r?.confirmationUrl) { window.location.href = r.confirmationUrl; return; }

      // СБП (прод): рисуем QR из confirmation_data и опрашиваем статус.
      if (r?.qr) {
        setQr(await QRCode.toDataURL(r.qr, { width: 240, margin: 1 }));
        startPolling(orderId, r.paymentId);
        return;
      }

      // Локальный режим (ЮKassa не настроена).
      if (!r?.mock || !import.meta.env.DEV) {
        throw new Error("payment unavailable");
      }
      if (method === "sbp") {
        // Показываем локальный QR и кнопку подтверждения.
        setQr(await QRCode.toDataURL(`local-sbp:${orderId}`, { width: 240, margin: 1 }));
        setMockOrderId(orderId);
        return;
      }
      await store.markShopOrderPaid(orderId, { provider: "dev", paymentId: "mock" });
      setDone(true);
      onPaid();
    } catch {
      setError("Не удалось создать заказ. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="g-lb" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#121212", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
          padding: 24, width: "min(460px, 92vw)", maxHeight: "88vh", overflowY: "auto",
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <h3 style={{ margin: "10px 0" }}>Заказ оформлен</h3>
            <p style={{ color: "#8e8e8c", fontSize: 13.5 }}>
              Оплата подтверждена. Исполнитель вручную сформирует чек в приложении «Мой налог» и направит его по указанному вами контакту.
            </p>
            <button className="g-btn" style={{ marginTop: 14 }} onClick={onClose}>Закрыть</button>
          </div>
        ) : qr ? (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <h3 style={{ margin: "0 0 6px" }}>Оплата через СБП</h3>
            <p style={{ color: "#8e8e8c", fontSize: 12.5, margin: "0 0 14px" }}>
              Отсканируйте QR камерой или приложением банка (Сбер, Т-Банк, Альфа и любой другой) и подтвердите оплату {formatRub(total)}.
            </p>
            <img src={qr} alt="СБП QR" style={{ width: 240, height: 240, borderRadius: 12, background: "#fff", padding: 8 }} />
            {mockOrderId ? (
              <button className="g-btn" style={{ marginTop: 16 }} onClick={confirmMockSbp}>
                Подтвердить локальную оплату
              </button>
            ) : (
              <p style={{ color: "#8e8e8c", fontSize: 12.5, marginTop: 16 }}>⏳ Ждём подтверждения оплаты…</p>
            )}
            {error && <p style={{ color: "#ff6b5e", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            <p style={{ marginTop: 12 }}>
              <span className="acc-link" style={{ color: "#8e8e8c", cursor: "pointer", fontSize: 12.5 }} onClick={onClose}>Отмена</span>
            </p>
          </div>
        ) : paymentAvailable === false ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <h3 style={{ margin: "0 0 10px" }}>Заказ через личный контакт</h3>
            <p style={{ color: "#8e8e8c", fontSize: 13.5, lineHeight: 1.55 }}>
              Онлайн-оплата сейчас не подключена. Напишите Юрию в Telegram:
              выбранные услуги и галерея будут согласованы вручную.
            </p>
            <a
              className="g-btn"
              href="https://t.me/YuriElygin"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", marginTop: 16, textDecoration: "none" }}
            >
              Написать в Telegram
            </a>
            <button className="g-lb-btn" style={{ marginTop: 10 }} onClick={onClose}>Закрыть</button>
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 4px" }}>Заказать допы</h3>
            <p style={{ color: "#8e8e8c", fontSize: 12.5, margin: "0 0 16px" }}>
              Ретушь и печать берутся по отмеченным фото — количество можно изменить.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {PRODUCTS.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.title}</div>
                    <div style={{ fontSize: 11.5, color: "#8e8e8c" }}>{formatRub(p.price)} {p.unit === "photo" ? "/ фото" : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="g-mark" onClick={() => setQ(p.id, (qty[p.id] || 0) - 1)}>−</button>
                    <span style={{ minWidth: 22, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{qty[p.id] || 0}</span>
                    <button className="g-mark" onClick={() => setQ(p.id, (qty[p.id] || 0) + 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ color: "#8e8e8c", fontSize: 12.5, margin: "0 0 14px" }}>
              Заказ оформляется на подтверждённый профиль{defaultName ? `: ${defaultName}` : ""}. Данные используются для исполнения заказа в соответствии с <a href="/privacy-policy" target="_blank" rel="noreferrer">политикой</a>.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 18, fontWeight: 800 }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: "#8e8e8c" }}>Итого</span>
              <span>{formatRub(total)}</span>
            </div>

            {/* Способ оплаты */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {([["sbp", "СБП"], ["card", "Картой"]] as [PayMethod, string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className="g-lb-btn"
                  data-on={method === m}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {m === "sbp" ? "⚡ " : "💳 "}{label}
                </button>
              ))}
            </div>

            <button className="g-btn" style={{ width: "100%" }} disabled={busy || paymentAvailable !== true} onClick={pay}>
              {paymentAvailable === null
                ? "Проверяю оплату…"
                : busy
                  ? "Оформляю…"
                  : method === "sbp"
                    ? `Оплатить через СБП — ${formatRub(total)}`
                    : `Оплатить картой — ${formatRub(total)}`}
            </button>
            {error && <p style={{ color: "#ff6b5e", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            <p style={{ color: "#8e8e8c", fontSize: 11, marginTop: 12, textAlign: "center" }}>
              СБП — оплата из любого банка по QR. Картой — защищённая форма ЮKassa.
              {import.meta.env.DEV ? " В локальной разработке списание не выполняется." : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
