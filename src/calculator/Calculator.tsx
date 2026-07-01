// Рабочий калькулятор стоимости съёмки (Фаза 1).
// — live-расчёт из реального прайса (src/lib/pricing.data.ts);
// — скидка постоянного клиента подтягивается по телефону из хранилища;
// — отправка заявки в Telegram (best-effort) + сохранение заказа в DataStore.
// Auth по OTP появится в Фазе 2 и заменит ручной ввод телефона здесь.
import { useEffect, useMemo, useState } from "react";
import { getActiveEstimateData, getActiveShootTypes, hydratePriceRules } from "../lib/pricing.runtime";
import { MAX_DAYS, URGENCY_SURCHARGE } from "../lib/pricing.config";
import { computeBreakdown, formatRub } from "../lib/calc";
import { hydrateTiers, resolveTier } from "../lib/discounts";
import { getStore, isValidPhone, normalizePhone } from "../lib/store";
import { getSession } from "../lib/auth";
import { trackAnalyticsEvent } from "../lib/analytics";
import type { OrderSelection, PriceItem } from "../lib/types";

const store = getStore();
const session = getSession();

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "смена";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "смены";
  return "смен";
}

function unitLabel(unit: PriceItem["unit"]): string {
  switch (unit) {
    case "day": return "за смену";
    case "person": return "за чел.";
    case "hour": return "за час";
    default: return "за проект";
  }
}

export default function Calculator() {
  // Прайс берётся из активного набора (БД-override или конфиг); пересчёт по priceReady.
  const TYPES = getActiveShootTypes();
  const DATA = getActiveEstimateData();
  const [shootType, setShootType] = useState<string>(() => getActiveShootTypes()[0]);
  const typeData = DATA[shootType] ?? DATA[TYPES[0]];
  const hasDayItems = [...typeData.base, ...typeData.options].some((item) => item.unit === "day");

  const [days, setDays] = useState(1);
  const [baseSel, setBaseSel] = useState<Set<string>>(
    () => new Set((getActiveEstimateData()[getActiveShootTypes()[0]]?.base ?? []).map((i) => i.name)),
  );
  const [optSel, setOptSel] = useState<Set<string>>(new Set());
  const [urgent, setUrgent] = useState(false);

  // Контакты + скидка. Если клиент вошёл — подставляем телефон/имя из сессии,
  // и скидка подтянется автоматически (эффект ниже реагирует на phone).
  const [phone, setPhone] = useState(session?.phone ? `+${session.phone}` : "");
  const [name, setName] = useState(session?.name ?? "");
  const [comment, setComment] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [tierLabel, setTierLabel] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  // Скидки и прайс могут быть отредактированы в админке/БД — подтягиваем их.
  const [tiersReady, setTiersReady] = useState(0);
  useEffect(() => {
    Promise.all([hydrateTiers(), hydratePriceRules()]).then(() => setTiersReady((v) => v + 1));
  }, []);

  // При смене типа (или загрузке прайса) — выбрать все базовые позиции, сбросить опции.
  useEffect(() => {
    setBaseSel(new Set((typeData?.base ?? []).map((i) => i.name)));
    setOptSel(new Set());
    setDays(1);
  }, [shootType, tiersReady]);

  // Подтянуть скидку по телефону (из прошлых заказов в хранилище).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isValidPhone(phone)) {
        setDiscountPercent(0);
        setTierLabel("");
        return;
      }
      const completed = await store.completedOrderCount(phone);
      const tier = resolveTier(completed);
      if (!cancelled) {
        setDiscountPercent(tier.percent);
        setTierLabel(tier.percent > 0 ? `${tier.label}: −${tier.percent}%` : "");
      }
    })();
    return () => { cancelled = true; };
  }, [phone, tiersReady]);

  const selection: OrderSelection = useMemo(
    () => ({
      shootType,
      days,
      baseItems: [...baseSel],
      optionItems: [...optSel],
      urgent,
    }),
    [shootType, days, baseSel, optSel, urgent],
  );

  const breakdown = useMemo(
    () => computeBreakdown(selection, discountPercent),
    [selection, discountPercent],
  );

  const toggle = (set: Set<string>, name: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(name) ? next.delete(name) : next.add(name);
    setter(next);
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Укажите, как к вам обращаться."); return; }
    if (!isValidPhone(phone)) { setError("Введите корректный номер телефона."); return; }
    if (breakdown.subtotalMax === 0) { setError("Выберите хотя бы одну позицию сметы."); return; }

    trackAnalyticsEvent("calculator_use", {
      service: shootType,
      total_min: breakdown.totalMin,
      total_max: breakdown.totalMax,
    });

    setSubmitting(true);
    try {
      // 1) Источник правды — сохраняем клиента и заказ локально (всегда работает).
      await store.upsertClient({ phone, name: name.trim() });
      const order = await store.createOrder({
        clientPhone: normalizePhone(phone),
        selection,
        breakdown,
        contactName: name.trim(),
        contact: normalizePhone(phone),
        comment: comment.trim() || undefined,
      });

      // 2) Best-effort: уведомление в Telegram через тот же serverless, что и форма.
      const endpoint = "/api/send-form";
      const opts = selection.optionItems.length
        ? `\nДоп-услуги: ${selection.optionItems.join(", ")}`
        : "";
      const discLine = discountPercent > 0
        ? `\nСкидка клиента: −${discountPercent}%`
        : "";
      const message =
        `🧮 Расчёт из калькулятора\n` +
        `Тип: ${shootType}\n` +
        (hasDayItems ? `Смен: ${days}\n` : "") +
        (urgent ? `Срочность: да (+${Math.round(URGENCY_SURCHARGE * 100)}%)\n` : "") +
        opts +
        discLine +
        `\nИТОГ: ${formatRub(breakdown.totalMin)} – ${formatRub(breakdown.totalMax)}` +
        `\nЗаказ #${order.id}` +
        (comment.trim() ? `\nКомментарий: ${comment.trim()}` : "");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            contact: `тел. +${normalizePhone(phone)}`,
            message,
          }),
        });
        if (!response.ok && !import.meta.env.DEV) {
          throw new Error("notification failed");
        }
      } catch {
        if (!import.meta.env.DEV) {
          setStatus("error");
          setError("Расчёт сохранён, но уведомление не отправилось. Напишите в Telegram @YuriElygin.");
          return;
        }
      }

      setStatus("success");
      trackAnalyticsEvent("lead_submit", { service: shootType, source: "calculator" });
    } catch (e) {
      setError("Не удалось сохранить заявку. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  const phoneValid = isValidPhone(phone);
  const telegramEstimateUrl = `https://t.me/YuriElygin?text=${encodeURIComponent(
    `Здравствуйте, Юрий!\nРасчёт: ${shootType}\nОриентир: ${formatRub(breakdown.totalMin)} – ${formatRub(breakdown.totalMax)}\nКомментарий: ${comment.trim() || "хочу обсудить проект"}`,
  )}`;

  return (
    <div className="calc-wrap">
      <div className="calc-top">
        <a className="calc-logo" href="/">YELYG<span>I</span>NN</a>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <a className="calc-back" href="/account">{session ? "Кабинет" : "Войти"}</a>
          <a className="calc-back" href="/#all-sections">Все разделы</a>
          <a className="calc-back" href="/">← на главную</a>
        </div>
      </div>

      <p className="calc-eyebrow">Калькулятор сметы</p>
      <h1 className="calc-title">Соберите <span>смету</span> под проект</h1>
      <p className="calc-lead">
        Выберите тип съёмки, число смен и нужные позиции — стоимость пересчитывается
        мгновенно. Это ориентир вилки «от и до»; точную цену подтверждаю после брифа.
      </p>

      <div className="calc-grid">
        {/* ЛЕВАЯ КОЛОНКА — конфигуратор */}
        <div className="calc-card">
          <div className="calc-section">
            <div className="calc-label">Тип съёмки</div>
            <div className="calc-types">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="calc-type"
                  data-active={t === shootType}
                  onClick={() => setShootType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {hasDayItems && (
            <div className="calc-section">
              <div className="calc-label">Съёмочных смен</div>
              <div className="calc-slider-row">
                <input
                  className="calc-range"
                  type="range"
                  min={1}
                  max={MAX_DAYS}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
                <div className="calc-days-val">
                  <b>{days}</b> <span>{daysWord(days)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="calc-section">
            <div className="calc-label">
              Состав сметы <b>{baseSel.size} из {typeData.base.length}</b>
            </div>
            <div className="calc-rows">
              {typeData.base.map((item) => {
                const on = baseSel.has(item.name);
                return (
                  <div
                    key={item.name}
                    className="calc-row"
                    data-on={on}
                    onClick={() => toggle(baseSel, item.name, setBaseSel)}
                  >
                    <div className="calc-check"><Check /></div>
                    <div className="calc-row-name">
                      {item.name}{" "}
                      <span className="calc-row-unit">· {unitLabel(item.unit)}</span>
                    </div>
                    <div className="calc-row-price">
                      {formatRub(item.priceMin)}–{formatRub(item.priceMax)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {typeData.options.length > 0 && (
            <div className="calc-section">
              <div className="calc-label">Дополнительно</div>
              <div className="calc-rows">
                {typeData.options.map((item) => {
                  const on = optSel.has(item.name);
                  return (
                    <div
                      key={item.name}
                      className="calc-row"
                      data-on={on}
                      onClick={() => toggle(optSel, item.name, setOptSel)}
                    >
                      <div className="calc-check"><Check /></div>
                      <div className="calc-row-name">
                        {item.name}{" "}
                        <span className="calc-row-unit">· {unitLabel(item.unit)}</span>
                      </div>
                      <div className="calc-row-price">
                        {formatRub(item.priceMin)}–{formatRub(item.priceMax)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="calc-section">
            <div
              className="calc-toggle"
              data-on={urgent}
              onClick={() => setUrgent((v) => !v)}
            >
              <div className="calc-switch" />
              <div className="calc-toggle-txt">
                <b>Срочный проект</b>
                <span>Сжатые сроки — наценка +{Math.round(URGENCY_SURCHARGE * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА — смета + заявка */}
        <div className="calc-card calc-summary">
          {status === "success" ? (
            <div className="calc-success">
              <div className="calc-success-mark">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fe2c1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h3>Заявка отправлена</h3>
              <p>Смета сохранена, я свяжусь с вами в ближайшее время. Спасибо за доверие!</p>
              <button className="calc-cta calc-cta-ghost" onClick={() => setStatus("idle")}>
                Новый расчёт
              </button>
            </div>
          ) : (
            <>
              <div className="calc-sum-type">
                {shootType}{hasDayItems ? ` · ${days} ${daysWord(days)}` : ""}
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="calc-sum-line">
                  <span>Стоимость</span>
                  <b>{formatRub(breakdown.subtotalMin)} – {formatRub(breakdown.subtotalMax)}</b>
                </div>
                {discountPercent > 0 && (
                  <div className="calc-sum-line calc-sum-disc">
                    <span>Скидка клиента</span>
                    <b>−{discountPercent}%</b>
                  </div>
                )}
              </div>

              <div className="calc-total">
                <div className="calc-total-label">Итого</div>
                <div className="calc-total-val">
                  {formatRub(breakdown.totalMin)} – {formatRub(breakdown.totalMax)}
                </div>
                {discountPercent > 0 && (
                  <div className="calc-total-strike">
                    {formatRub(breakdown.subtotalMin)} – {formatRub(breakdown.subtotalMax)}
                  </div>
                )}
              </div>

              <p className="calc-note">
                Вилка зависит от задач, состава смены и сложности. Финальную смету
                фиксирую после короткого брифа — без сюрпризов.
              </p>

              <div style={{ marginTop: 22, borderTop: "1px solid var(--line-soft)", paddingTop: 20 }}>
                <div className="calc-field">
                  <input
                    className="calc-input"
                    placeholder="Как к вам обращаться"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="calc-field">
                  <input
                    className="calc-input"
                    placeholder="Телефон, напр. +7 999 123-45-67"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    readOnly={!!session}
                    style={session ? { opacity: 0.7 } : undefined}
                  />
                  <div className="calc-disc" data-show={!!tierLabel}>
                    Узнал вас 👋 <b>{tierLabel}</b> — скидка уже в расчёте.
                  </div>
                  {session && !tierLabel && (
                    <div className="calc-hint">Вы вошли в кабинет — скидка применится автоматически по мере заказов.</div>
                  )}
                  {!session && (
                    <div className="calc-hint">
                      Постоянный клиент? <a href="/account" style={{ color: "var(--red)" }}>Войдите</a> — скидка подтянется.
                    </div>
                  )}
                  {!session && phone.length > 0 && !phoneValid && (
                    <div className="calc-hint">Формат: +7 и 10 цифр.</div>
                  )}
                </div>
                <div className="calc-field">
                  <textarea
                    className="calc-textarea"
                    placeholder="Коротко о проекте, сроки, референсы (необязательно)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <button className="calc-cta" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Отправляю…" : "Отправить заявку"}
                </button>
                {error && <div className="calc-err">{error}</div>}
                {error.includes("Telegram") && (
                  <a
                    className="calc-cta calc-cta-ghost"
                    href={telegramEstimateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginTop: 10, textDecoration: "none", textAlign: "center" }}
                  >
                    Отправить расчёт в Telegram
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
