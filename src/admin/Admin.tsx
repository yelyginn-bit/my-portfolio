// Админ-панель использует Supabase в production и localStorage в локальном dev.
import { useEffect, useMemo, useState } from "react";
import { getStore } from "../lib/store";
import { resolveTier } from "../lib/discounts";
import { DISCOUNT_TIERS, URGENCY_SURCHARGE } from "../lib/pricing.config";
import { formatRub } from "../lib/calc";
import type { Client, Lead, Order, OrderStatus, ShopOrder } from "../lib/types";
import Galleries from "./Galleries";
import Dashboard from "./Dashboard";
import Reviews from "./Reviews";
import SettingsPanel from "./SettingsPanel";
import Cases from "./Cases";
import BlogAdmin from "./BlogAdmin";
import PriceRules from "./PriceRules";
import AuditLog from "./AuditLog";
import Notifications from "./Notifications";
import { hydrateTiers } from "../lib/discounts";
import { isSupabaseConfigured, setSupabaseToken } from "../lib/supabaseClient";

const store = getStore();
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string)
  || (import.meta.env.DEV ? "admin" : "");
const SESSION_FLAG = "yel_admin_ok";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Новая", confirmed: "Подтверждён", in_progress: "В работе", done: "Завершён", cancelled: "Отменён",
};

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

type Tab = "dashboard" | "orders" | "clients" | "leads" | "galleries" | "payments" | "reviews" | "cases" | "blog" | "pricerules" | "settings" | "audit" | "notifications" | "tariffs";

function Gate({ onOk }: { onOk: () => void }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr("");
    // Серверная проверка + (если Supabase настроен) выдача админского JWT для RLS.
    try {
      const r = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.access_token) setSupabaseToken(d.access_token);
        sessionStorage.setItem(SESSION_FLAG, "1");
        onOk();
        return;
      }
      if (r.status === 403) { setErr("Неверный пароль"); return; }
      throw new Error("no endpoint");
    } catch {
      // Клиентский fallback разрешён только для локальной разработки.
      if (import.meta.env.DEV && ADMIN_PASSWORD && pwd === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_FLAG, "1");
        onOk();
      } else {
        setErr(
          import.meta.env.DEV
            ? "Неверный пароль"
            : "Админка не настроена: задайте ADMIN_PASSWORD на сервере.",
        );
      }
    }
  };
  return (
    <div className="adm-login">
      <input
        className="adm-input"
        type="password"
        placeholder="Пароль администратора"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      <button className="adm-btn" onClick={submit}>Войти</button>
      {err && <div className="adm-err">{err}</div>}
      <p className="adm-hint">
        {import.meta.env.DEV
          ? <>Локальный пароль задаётся переменной <code style={{ color: "#ccc" }}>VITE_ADMIN_PASSWORD</code>.</>
          : "Вход проверяется сервером. Клиентский резервный пароль в production отключён."}
      </p>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_FLAG) === "1");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [tiersReady, setTiersReady] = useState(0);

  useEffect(() => {
    if (!authed) return;
    let active = true;
    (async () => {
      const [o, c, l, s] = await Promise.all([
        store.listOrders(), store.listClients(), store.listLeads(), store.listShopOrders(),
      ]);
      if (active) { setOrders(o); setClients(c); setLeads(l); setShopOrders(s); }
    })();
    // Подтянуть отредактированные уровни скидок и перерисовать вкладку «Клиенты».
    hydrateTiers().then(() => { if (active) setTiersReady((v) => v + 1); });
    return () => { active = false; };
  }, [authed]);

  const revenue = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "cancelled")
        .reduce((acc, o) => acc + (o.breakdown.totalMin + o.breakdown.totalMax) / 2, 0),
    [orders],
  );

  const signOut = () => { sessionStorage.removeItem(SESSION_FLAG); setSupabaseToken(null); setAuthed(false); };

  return (
    <div className="adm-wrap">
      <div className="adm-top">
        <a className="adm-logo" href="/">YELYG<span>I</span>NN · admin</a>
        {authed && <span className="adm-link" onClick={signOut}>Выйти</span>}
      </div>

      {!authed ? (
        <>
          <h1 className="adm-title">Панель <span>управления</span></h1>
          <Gate onOk={() => setAuthed(true)} />
        </>
      ) : (
        <>
          <h1 className="adm-title">Панель <span>управления</span></h1>

          <div className="adm-tabs">
            <button className="adm-tab" data-active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
              Дашборд
            </button>
            <button className="adm-tab" data-active={tab === "orders"} onClick={() => setTab("orders")}>
              Заказы <span className="adm-count">{orders.length}</span>
            </button>
            <button className="adm-tab" data-active={tab === "clients"} onClick={() => setTab("clients")}>
              Клиенты <span className="adm-count">{clients.length}</span>
            </button>
            <button className="adm-tab" data-active={tab === "leads"} onClick={() => setTab("leads")}>
              Заявки <span className="adm-count">{leads.length}</span>
            </button>
            <button className="adm-tab" data-active={tab === "galleries"} onClick={() => setTab("galleries")}>
              Галереи
            </button>
            <button className="adm-tab" data-active={tab === "payments"} onClick={() => setTab("payments")}>
              Платежи <span className="adm-count">{shopOrders.length}</span>
            </button>
            <button className="adm-tab" data-active={tab === "reviews"} onClick={() => setTab("reviews")}>
              Отзывы
            </button>
            <button className="adm-tab" data-active={tab === "cases"} onClick={() => setTab("cases")}>
              Кейсы
            </button>
            <button className="adm-tab" data-active={tab === "blog"} onClick={() => setTab("blog")}>
              Блог
            </button>
            <button className="adm-tab" data-active={tab === "pricerules"} onClick={() => setTab("pricerules")}>
              Прайс
            </button>
            <button className="adm-tab" data-active={tab === "settings"} onClick={() => setTab("settings")}>
              Настройки
            </button>
            <button className="adm-tab" data-active={tab === "notifications"} onClick={() => setTab("notifications")}>
              Уведомления
            </button>
            <button className="adm-tab" data-active={tab === "audit"} onClick={() => setTab("audit")}>
              История
            </button>
            <button className="adm-tab" data-active={tab === "tariffs"} onClick={() => setTab("tariffs")}>
              Тарифы и скидки
            </button>
          </div>

          {tab === "dashboard" && <Dashboard />}
          {tab === "reviews" && <Reviews />}
          {tab === "cases" && <Cases />}
          {tab === "blog" && <BlogAdmin />}
          {tab === "pricerules" && <PriceRules />}
          {tab === "audit" && <AuditLog />}
          {tab === "notifications" && <Notifications />}
          {tab === "settings" && <SettingsPanel />}

          {tab === "orders" && (
            <div className="adm-card">
              {orders.length === 0 ? (
                <div className="adm-empty">Заказов пока нет. Оформите смету в калькуляторе.</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Дата</th><th>Клиент</th><th>Тип</th><th>Смен</th><th>Скидка</th><th>Сумма</th><th>Статус</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="adm-mono">{fmt(o.createdAt)}</td>
                        <td>{o.contactName || "—"}<br /><span style={{ color: "var(--gray)", fontSize: 11 }}>{o.contact}</span></td>
                        <td>{o.selection.shootType}{o.selection.urgent ? " ⚡" : ""}</td>
                        <td className="adm-mono">{o.selection.days}</td>
                        <td className="adm-mono">{o.breakdown.discountPercent}%</td>
                        <td className="adm-mono">{formatRub(o.breakdown.totalMin)}–{formatRub(o.breakdown.totalMax)}</td>
                        <td><span className="adm-pill">{STATUS_LABEL[o.status]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "clients" && (
            <div className="adm-card" key={tiersReady}>
              {clients.length === 0 ? (
                <div className="adm-empty">Клиентов пока нет.</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Имя</th><th>Телефон</th><th>Заказов</th><th>Уровень</th><th>Скидка</th><th>С нами с</th></tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => {
                      const tier = resolveTier(c.completedOrders);
                      return (
                        <tr key={c.id}>
                          <td>{c.name || "—"}</td>
                          <td className="adm-mono">+{c.phone}</td>
                          <td className="adm-mono">{c.completedOrders}</td>
                          <td><span className={"adm-pill" + (tier.percent > 0 ? " red" : "")}>{tier.label}</span></td>
                          <td className="adm-mono">{tier.percent}%</td>
                          <td className="adm-mono">{fmt(c.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "leads" && (
            <div className="adm-card">
              {leads.length === 0 ? (
                <div className="adm-empty">Заявок из форм пока нет.</div>
              ) : (
                <table>
                  <thead><tr><th>Дата</th><th>Имя</th><th>Контакт</th><th>Сообщение</th><th>Источник</th></tr></thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id}>
                        <td className="adm-mono">{fmt(l.createdAt)}</td>
                        <td>{l.name}</td>
                        <td>{l.contact}</td>
                        <td style={{ maxWidth: 320 }}>{l.message}</td>
                        <td><span className="adm-pill">{l.source}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "galleries" && <Galleries />}

          {tab === "payments" && (
            <div className="adm-card">
              {shopOrders.length === 0 ? (
                <div className="adm-empty">Заказов из галерей пока нет.</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Дата</th><th>Клиент</th><th>Состав</th><th>Сумма</th><th>Оплата</th><th>Статус</th></tr>
                  </thead>
                  <tbody>
                    {shopOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="adm-mono">{fmt(o.createdAt)}</td>
                        <td>{o.contactName || "—"}<br /><span style={{ color: "var(--gray)", fontSize: 11 }}>{o.contact}</span></td>
                        <td style={{ maxWidth: 280, fontSize: 12 }}>
                          {o.items.map((i) => `${i.title}×${i.qty}`).join(", ")}
                        </td>
                        <td className="adm-mono">{formatRub(o.total)}</td>
                        <td style={{ fontSize: 11, color: "var(--gray)" }}>{o.paymentProvider || "—"}</td>
                        <td>
                          <span className={"adm-pill" + (o.status === "paid" ? " red" : "")}>
                            {o.status === "paid" ? "Оплачен" : o.status === "cancelled" ? "Отменён" : "Ожидает"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "tariffs" && (
            <div className="adm-card" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Уровень</th><th>От заказов</th><th>Скидка</th></tr></thead>
                <tbody>
                  {DISCOUNT_TIERS.map((t) => (
                    <tr key={t.id}>
                      <td>{t.label}</td>
                      <td className="adm-mono">{t.minOrders}</td>
                      <td className="adm-mono"><span className={"adm-pill" + (t.percent > 0 ? " red" : "")}>{t.percent}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: 16 }}>
                <p className="adm-note">
                  Наценка за срочность: <b style={{ color: "#fff" }}>+{Math.round(URGENCY_SURCHARGE * 100)}%</b>.
                </p>
                <p className="adm-note">
                  Пороги скидок задаются в <code>src/lib/pricing.config.ts</code>.
                  Цены и правила калькулятора редактируются во вкладке «Прайс».
                </p>
              </div>
            </div>
          )}

          {tab === "orders" && orders.length > 0 && (
            <p className="adm-note">
              Заказов: <b style={{ color: "#fff" }}>{orders.length}</b> · ориентировочная выручка (среднее по вилке):{" "}
              <b style={{ color: "#fff" }}>{formatRub(revenue)}</b>
            </p>
          )}

          {!isSupabaseConfigured && (
            <p className="adm-note" style={{ marginTop: 22 }}>
              Локальный режим: данные хранятся только в этом браузере. Для общей production-базы
              подключите Supabase по инструкции в <code>ACTIVATION.md</code>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
