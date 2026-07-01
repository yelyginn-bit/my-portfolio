// Админ-панель «Прайс» (v2): редактирование price_rules в БД (источник для калькулятора).
// Сид из конфига одной кнопкой. Правка имени/цены/единицы/активности/удаление.
import { useEffect, useMemo, useState } from "react";
import { getStore } from "../lib/store";
import { seedPriceRulesFromConfig } from "../lib/pricing.runtime";
import { logAudit } from "../lib/audit";
import type { PriceRule } from "../lib/types";

const store = getStore();
const UNITS = ["project", "day", "hour", "person", "item"];

export default function PriceRules() {
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newType, setNewType] = useState("");

  const load = async () => { setRules(await store.listPriceRules()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const m: Record<string, PriceRule[]> = {};
    for (const r of rules) (m[r.shootType] ??= []).push(r);
    return m;
  }, [rules]);

  const seed = async () => {
    setBusy(true);
    try { const n = await seedPriceRulesFromConfig(); if (n) { logAudit("price.seed", { entityType: "price_rules", after: { created: n } }); await load(); } else alert("Прайс уже не пуст."); }
    finally { setBusy(false); }
  };

  const patchLocal = (id: string, p: Partial<PriceRule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const save = async (id: string, p: Partial<PriceRule>) => {
    const updated = await store.updatePriceRule(id, p);
    setRules((rs) => rs.map((r) => (r.id === id ? updated : r)));
  };

  const addRule = async (shootType: string) => {
    if (!shootType.trim()) return;
    await store.createPriceRule({ shootType: shootType.trim(), kind: "base", name: "Новая позиция", unit: "project", priceMin: 0, priceMax: 0, sortOrder: rules.length, active: true });
    setNewType("");
    await load();
  };

  const remove = async (r: PriceRule) => {
    if (!confirm(`Удалить «${r.name}» (${r.shootType})?`)) return;
    await store.deletePriceRule(r.id);
    logAudit("price.delete", { entityType: "price_rule", entityId: r.id, before: { shootType: r.shootType, name: r.name } });
    setRules((rs) => rs.filter((x) => x.id !== r.id));
  };

  const inp = { background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#f5f5f4", padding: "7px 9px", fontFamily: "inherit", fontSize: 12.5 } as const;

  if (loading) return <div className="adm-card" style={{ padding: 18 }}><div className="adm-empty">Загрузка…</div></div>;

  return (
    <div className="adm-card" style={{ padding: 18 }}>
      <p className="adm-note" style={{ marginTop: 0 }}>
        Прайс калькулятора хранится в БД (price_rules). Калькулятор берёт активные правила; если пусто — конфиг по умолчанию.
      </p>

      {rules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p className="adm-note" style={{ marginTop: 0 }}>Прайс в БД пуст — калькулятор работает на конфиге.</p>
          <button className="adm-btn" style={{ width: "auto", padding: "12px 22px" }} disabled={busy} onClick={seed}>
            {busy ? "Сидирую…" : "Засеять прайс из конфига"}
          </button>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([type, items]: [string, PriceRule[]]) => (
            <div key={type} style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>{type}</h3>
              <table>
                <thead><tr><th>Позиция</th><th>Тип</th><th>Ед.</th><th>Мин</th><th>Макс</th><th>Акт.</th><th /></tr></thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td><input style={{ ...inp, width: "100%" }} value={r.name} onChange={(e) => patchLocal(r.id, { name: e.target.value })} onBlur={(e) => save(r.id, { name: e.target.value })} /></td>
                      <td>
                        <select style={inp} value={r.kind} onChange={(e) => { patchLocal(r.id, { kind: e.target.value as PriceRule["kind"] }); save(r.id, { kind: e.target.value as PriceRule["kind"] }); }}>
                          <option value="base">базовая</option>
                          <option value="option">опция</option>
                        </select>
                      </td>
                      <td>
                        <select style={inp} value={r.unit} onChange={(e) => { patchLocal(r.id, { unit: e.target.value as PriceRule["unit"] }); save(r.id, { unit: e.target.value as PriceRule["unit"] }); }}>
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td><input type="number" style={{ ...inp, width: 80 }} value={r.priceMin} onChange={(e) => patchLocal(r.id, { priceMin: Number(e.target.value) || 0 })} onBlur={(e) => save(r.id, { priceMin: Number(e.target.value) || 0 })} /></td>
                      <td><input type="number" style={{ ...inp, width: 80 }} value={r.priceMax} onChange={(e) => patchLocal(r.id, { priceMax: Number(e.target.value) || 0 })} onBlur={(e) => save(r.id, { priceMax: Number(e.target.value) || 0 })} /></td>
                      <td><input type="checkbox" checked={r.active} onChange={(e) => { patchLocal(r.id, { active: e.target.checked }); save(r.id, { active: e.target.checked }); }} /></td>
                      <td style={{ textAlign: "right" }}><button className="adm-pill" style={{ cursor: "pointer", background: "transparent", color: "#fe2c1f", borderColor: "rgba(254,44,31,0.5)" }} onClick={() => remove(r)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="adm-pill" style={{ cursor: "pointer", background: "transparent", marginTop: 8 }} onClick={() => addRule(type)}>+ позиция</button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input className="adm-input" style={{ maxWidth: 240 }} placeholder="Новый тип съёмки…" value={newType} onChange={(e) => setNewType(e.target.value)} />
            <button className="adm-pill" style={{ cursor: "pointer", background: "transparent" }} onClick={() => addRule(newType)}>+ тип</button>
          </div>
        </>
      )}
    </div>
  );
}
