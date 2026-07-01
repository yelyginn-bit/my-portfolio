// Дашборд админки: агрегаты по всем сущностям одной сеткой плиток.
// Данные грузятся параллельно в useEffect через DataStore (localStorage/Supabase).
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import { formatRub } from "../lib/calc";
import type { Client, Gallery, Lead, Order, ShopOrder } from "../lib/types";

const store = getStore();

interface Metrics {
  clients: number;
  leads: number;
  galleries: number;
  orders: number;
  shopOrders: number;
  shopPaid: number;
  revenuePaid: number;
  estRevenue: number;
}

interface Tile {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [clients, orders, shopOrders, leads, galleries] = await Promise.all([
        store.listClients(),
        store.listOrders(),
        store.listShopOrders(),
        store.listLeads(),
        store.listGalleries(),
      ]);
      if (!alive) return;

      const paid = (shopOrders as ShopOrder[]).filter((o) => o.status === "paid");
      const revenuePaid = paid.reduce((s, o) => s + o.total, 0);
      const estRevenue = (orders as Order[])
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + (o.breakdown.totalMin + o.breakdown.totalMax) / 2, 0);

      setM({
        clients: (clients as Client[]).length,
        leads: (leads as Lead[]).length,
        galleries: (galleries as Gallery[]).length,
        orders: (orders as Order[]).length,
        shopOrders: (shopOrders as ShopOrder[]).length,
        shopPaid: paid.length,
        revenuePaid,
        estRevenue,
      });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !m) {
    return (
      <div className="adm-card" style={{ padding: 18 }}>
        <div className="adm-empty">Загрузка…</div>
      </div>
    );
  }

  const tiles: Tile[] = [
    { label: "Клиентов", value: String(m.clients) },
    { label: "Заявок", value: String(m.leads) },
    { label: "Галерей", value: String(m.galleries) },
    { label: "Заказов-смет", value: String(m.orders) },
    {
      label: "Заказов магазина",
      value: String(m.shopOrders),
      sub: `оплачено: ${m.shopPaid}`,
    },
    { label: "Выручка оплаченная", value: formatRub(m.revenuePaid), accent: true },
    { label: "Ориентир по сметам", value: formatRub(m.estRevenue) },
  ];

  return (
    <div className="adm-card" style={{ padding: 18 }}>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.label}
            style={{
              background: "#181818",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 96,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.05,
                color: t.accent ? "#fe2c1f" : "#f5f5f4",
                letterSpacing: "-0.02em",
              }}
            >
              {t.value}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#8e8e8c",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              {t.label}
            </span>
            {t.sub ? (
              <span style={{ fontSize: 11.5, color: "#8e8e8c" }}>{t.sub}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
