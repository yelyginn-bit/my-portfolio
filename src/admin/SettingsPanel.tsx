// Админ-панель «Настройки» (Этап G): редактирование уровней скидок (KV
// "discount_tiers" + setTiersOverride) и реквизитов студии (KV "studio").
// Самодостаточный остров: данные грузятся в useEffect, без props.
import { useEffect, useState } from "react";
import { getStore } from "../lib/store";
import { DISCOUNT_TIERS } from "../lib/pricing.config";
import { setTiersOverride } from "../lib/discounts";
import { logAudit } from "../lib/audit";
import type { DiscountTier, DownloadPolicy } from "../lib/types";

const store = getStore();

interface Studio {
  name: string;
  telegram: string;
  city: string;
  defaultDownloadPolicy: DownloadPolicy;
}

const PANEL: any = {
  background: "#121212",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 14,
  padding: 18,
  marginBottom: 18,
};
const ROW: any = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};
const FIELD: any = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 12,
};
const LABEL: any = { fontSize: 12.5, color: "#8e8e8c" };
const SAVED: any = { marginLeft: 12, fontSize: 13, color: "#fe2c1f" };

export default function SettingsPanel() {
  // ─── Уровни скидок ─────────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [tiersSaved, setTiersSaved] = useState(false);

  // ─── Реквизиты студии ────────────────────────────────────────────────────
  const [studio, setStudio] = useState<Studio>({
    name: "",
    telegram: "",
    city: "",
    defaultDownloadPolicy: "web",
  });
  const [studioSaved, setStudioSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await store.getSetting("discount_tiers");
      setTiers((saved as DiscountTier[]) ?? DISCOUNT_TIERS);

      const s = ((await store.getSetting("studio")) as Partial<Studio>) ?? {};
      setStudio({
        name: s.name ?? "",
        telegram: s.telegram ?? "",
        city: s.city ?? "",
        defaultDownloadPolicy: s.defaultDownloadPolicy ?? "web",
      });
    })();
  }, []);

  const patchTier = (id: string, patch: Partial<DiscountTier>) =>
    setTiers((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        if (patch.percent !== undefined) next.percent = Math.min(100, Math.max(0, patch.percent || 0));
        if (patch.minOrders !== undefined) next.minOrders = Math.max(0, patch.minOrders || 0);
        return next;
      }),
    );

  const addTier = () =>
    setTiers((list) => [
      ...list,
      { id: crypto.randomUUID(), label: "Новый", minOrders: 0, percent: 0 },
    ]);

  const removeTier = (id: string) =>
    setTiers((list) => list.filter((t) => t.id !== id));

  const saveTiers = async () => {
    // Валидация: непустой список, чистые проценты/пороги, сортировка по порогу.
    const cleaned = tiers
      .map((t) => ({
        ...t,
        percent: Math.min(100, Math.max(0, t.percent || 0)),
        minOrders: Math.max(0, t.minOrders || 0),
      }))
      .sort((a, b) => a.minOrders - b.minOrders);
    if (cleaned.length === 0) {
      alert("Список уровней пуст — будут использованы значения по умолчанию.");
    }
    setTiers(cleaned);
    await store.setSetting("discount_tiers", cleaned);
    setTiersOverride(cleaned.length ? cleaned : null);
    logAudit("discount.change", { entityType: "settings", entityId: "discount_tiers", after: cleaned });
    setTiersSaved(true);
    setTimeout(() => setTiersSaved(false), 1500);
  };

  const saveStudio = async () => {
    await store.setSetting("studio", {
      name: studio.name,
      telegram: studio.telegram,
      city: studio.city,
      defaultDownloadPolicy: studio.defaultDownloadPolicy,
    });
    logAudit("settings.studio", { entityType: "settings", entityId: "studio", after: studio });
    setStudioSaved(true);
    setTimeout(() => setStudioSaved(false), 1500);
  };

  return (
    <div>
      {/* ─── Секция 1: уровни скидок ─────────────────────────────────────── */}
      <div className="adm-card" style={PANEL}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#f5f5f4" }}>
          Уровни скидок
        </h3>
        <p className="adm-note" style={{ marginTop: 0 }}>
          Скидка применяется к новому заказу по числу завершённых заказов клиента.
        </p>

        <div style={{ marginTop: 8 }}>
          <div
            style={{
              ...ROW,
              color: "#8e8e8c",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <span style={{ flex: 2 }}>Название уровня</span>
            <span style={{ flex: 1 }}>Завершённых заказов ≥</span>
            <span style={{ flex: 1 }}>Скидка, %</span>
            <span style={{ width: 84 }} />
          </div>

          {tiers.length === 0 && (
            <div className="adm-empty" style={{ padding: 16 }}>
              Уровней нет — добавьте первый.
            </div>
          )}

          {tiers.map((t) => (
            <div key={t.id} style={ROW}>
              <input
                className="adm-input"
                style={{ flex: 2, minWidth: 0 }}
                value={t.label}
                onChange={(e) => patchTier(t.id, { label: e.target.value })}
              />
              <input
                className="adm-input"
                style={{ flex: 1, minWidth: 0 }}
                type="number"
                min={0}
                value={t.minOrders}
                onChange={(e) =>
                  patchTier(t.id, { minOrders: Number(e.target.value) || 0 })
                }
              />
              <input
                className="adm-input"
                style={{ flex: 1, minWidth: 0 }}
                type="number"
                min={0}
                max={100}
                value={t.percent}
                onChange={(e) =>
                  patchTier(t.id, { percent: Number(e.target.value) || 0 })
                }
              />
              <button
                className="adm-pill red"
                style={{
                  width: 84,
                  border: "none",
                  cursor: "pointer",
                  background: "transparent",
                  color: "#8e8e8c",
                  textAlign: "right",
                }}
                onClick={() => removeTier(t.id)}
              >
                удалить
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <button
            onClick={addTier}
            style={{
              background: "#181818",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              color: "#f5f5f4",
              padding: "9px 14px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            + уровень
          </button>
          <button className="adm-btn" onClick={saveTiers}>
            Сохранить
          </button>
          {tiersSaved && <span style={SAVED}>Сохранено</span>}
        </div>
      </div>

      {/* ─── Секция 2: реквизиты студии ──────────────────────────────────── */}
      <div className="adm-card" style={PANEL}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#f5f5f4" }}>
          Реквизиты студии
        </h3>

        <div style={FIELD}>
          <span style={LABEL}>Название студии</span>
          <input
            className="adm-input"
            value={studio.name}
            onChange={(e) => setStudio((s) => ({ ...s, name: e.target.value }))}
          />
        </div>

        <div style={FIELD}>
          <span style={LABEL}>Telegram</span>
          <input
            className="adm-input"
            placeholder="@username"
            value={studio.telegram}
            onChange={(e) => setStudio((s) => ({ ...s, telegram: e.target.value }))}
          />
        </div>

        <div style={FIELD}>
          <span style={LABEL}>Город</span>
          <input
            className="adm-input"
            value={studio.city}
            onChange={(e) => setStudio((s) => ({ ...s, city: e.target.value }))}
          />
        </div>

        <div style={FIELD}>
          <span style={LABEL}>Политика скачивания по умолчанию</span>
          <select
            className="adm-input"
            value={studio.defaultDownloadPolicy}
            onChange={(e) =>
              setStudio((s) => ({
                ...s,
                defaultDownloadPolicy: e.target.value as DownloadPolicy,
              }))
            }
          >
            <option value="original">Оригиналы</option>
            <option value="web">Web-версия</option>
            <option value="none">Без скачивания</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <button className="adm-btn" onClick={saveStudio}>
            Сохранить
          </button>
          {studioSaved && <span style={SAVED}>Сохранено</span>}
        </div>
      </div>
    </div>
  );
}
