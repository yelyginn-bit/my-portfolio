// Личный кабинет клиента (Фаза 2).
// Вход по телефону через OTP (dev-режим: код на экране), профиль, статус/скидка,
// прогресс до следующего уровня и история заказов из DataStore.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  bridgeSupabaseSession,
  finalizeSession,
  getSession,
  pollAuthStatus,
  requestOtp,
  signOut,
  verifyOtp,
  type RequestResult,
  type Session,
} from "../lib/auth";
import { getStore } from "../lib/store";
import { hydrateTiers, nextTier, resolveTier } from "../lib/discounts";
import { formatRub } from "../lib/calc";
import type { Client, Order, OrderStatus } from "../lib/types";

const store = getStore();

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Новая",
  confirmed: "Подтверждён",
  in_progress: "В работе",
  done: "Завершён",
  cancelled: "Отменён",
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function daysWord(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "смена";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "смены";
  return "смен";
}

function Login({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [req, setReq] = useState<RequestResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountAvailable, setAccountAvailable] = useState<boolean | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };
  useEffect(() => stopPolling, []);
  useEffect(() => {
    fetch("/api/auth-request")
      .then((response) => response.json())
      .then((data) => setAccountAvailable(Boolean(data?.available)))
      .catch(() => setAccountAvailable(false));
  }, []);

  // Опрос статуса: для способа «кнопка в боте» и первичной привязки по контакту.
  const startPolling = (token: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const s = await pollAuthStatus(token);
      if (s.status === "confirmed") {
        stopPolling();
        finalizeSession(phone, name || s.name);
        await bridgeSupabaseSession(phone, token); // RLS-токен (если Supabase настроен)
        onDone();
      } else if (s.status === "expired") {
        stopPolling();
        setError("Время истекло — запросите код заново.");
      }
    }, 2500);
  };

  const request = async () => {
    setError(""); setLoading(true);
    const res = await requestOtp(phone);
    setLoading(false);
    if (!res.ok) { setError(res.error || "Ошибка"); return; }
    setReq(res);
    setStep("code");
    if (res.token && (res.linked || res.deepLink)) startPolling(res.token);
  };

  const verify = async () => {
    setError(""); setLoading(true);
    const res = await verifyOtp({ phone, code, name, token: req?.token, mode: req?.mode });
    setLoading(false);
    if (!res.ok) { setError(res.error || "Ошибка"); return; }
    stopPolling();
    onDone();
  };

  const backToPhone = () => {
    stopPolling(); setStep("phone"); setCode(""); setError(""); setReq(null);
  };

  // Показывать ли поле ввода кода: всегда, кроме первичной привязки через бота.
  const showCodeInput = !req?.deepLink || req?.devCode;

  if (accountAvailable === null) {
    return <div className="acc-card"><div className="acc-hint">Проверяю доступ к кабинету…</div></div>;
  }

  if (!accountAvailable) {
    return (
      <div className="acc-card">
        <div className="acc-label">Личный кабинет</div>
        <h2 style={{ margin: "10px 0 12px" }}>Доступ подключается</h2>
        <p className="acc-hint">
          История заказов и клиентские скидки появятся после подключения защищённого входа.
          По текущему проекту можно связаться напрямую в Telegram.
        </p>
        <a
          className="acc-btn"
          href="https://t.me/YuriElygin"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", marginTop: 16, textAlign: "center", textDecoration: "none" }}
        >
          Написать в Telegram
        </a>
      </div>
    );
  }

  return (
    <div className="acc-card">
      {step === "phone" ? (
        <>
          <div className="acc-label">Вход по телефону</div>
          <div className="acc-field">
            <input className="acc-input" placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="acc-field">
            <input
              className="acc-input"
              placeholder="Телефон, напр. +7 999 123-45-67"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && request()}
            />
          </div>
          <button className="acc-btn" onClick={request} disabled={loading}>
            {loading ? "Отправляю…" : "Войти через Telegram"}
          </button>
          <p className="acc-hint">
            Войдите, чтобы видеть историю заказов и накопленную скидку. Код входа
            пришлёт Telegram-бот.
          </p>
          {error && <div className="acc-err">{error}</div>}
        </>
      ) : (
        <>
          {/* Первичная привязка: открыть бота и поделиться номером */}
          {req?.deepLink && (
            <>
              <div className="acc-label">Подтверждение в Telegram</div>
              <p className="acc-hint" style={{ marginTop: 0, marginBottom: 14 }}>
                Откройте бота и нажмите «Поделиться номером» — это привяжет аккаунт
                (нужно один раз). После этого вход будет мгновенным.
              </p>
              <a className="acc-btn" href={req.deepLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                Открыть Telegram-бота
              </a>
              <p className="acc-hint">⏳ Ждём подтверждения из Telegram…</p>
            </>
          )}

          {/* Код из бота / локальная разработка */}
          {showCodeInput && (
            <>
              <div className="acc-label">{req?.mode === "tg" ? "Код из Telegram" : "Код подтверждения"}</div>
              {req?.devCode && (
                <div className="acc-otp-box">Код локальной разработки: <b>{req.devCode}</b></div>
              )}
              {req?.mode === "tg" && req?.linked && (
                <p className="acc-hint" style={{ marginTop: 0 }}>
                  Бот отправил код. Введите его или нажмите «✅ Подтвердить вход» прямо в Telegram.
                </p>
              )}
              <div className="acc-field">
                <input
                  className="acc-input"
                  placeholder="4-значный код"
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                />
              </div>
              <button className="acc-btn" onClick={verify} disabled={loading || code.length < 4}>
                {loading ? "Проверяю…" : "Войти"}
              </button>
            </>
          )}

          <p className="acc-hint">
            <span className="acc-link" onClick={backToPhone}>← Изменить номер</span>
          </p>
          {error && <div className="acc-err">{error}</div>}
        </>
      )}
    </div>
  );
}

function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [c, o] = await Promise.all([
        store.getClientByPhone(session.phone),
        store.listOrdersByPhone(session.phone),
      ]);
      if (active) { setClient(c); setOrders(o); }
    })();
    return () => { active = false; };
  }, [session.phone]);

  const completed = client?.completedOrders ?? 0;
  const tier = useMemo(() => resolveTier(completed), [completed]);
  const next = useMemo(() => nextTier(completed), [completed]);

  const progressPct = next
    ? Math.min(100, Math.round(((completed - tier.minOrders) / (next.tier.minOrders - tier.minOrders)) * 100))
    : 100;

  return (
    <>
      <div className="acc-card">
        <div className="acc-profile">
          <div>
            <div className="acc-name">{session.name || "Клиент"}</div>
            <div className="acc-phone">+{session.phone}</div>
          </div>
          <div className="acc-badge"><span className="dot" />{tier.label}</div>
        </div>

        <div className="acc-stats">
          <div className="acc-stat">
            <div className="acc-stat-val">{completed}</div>
            <div className="acc-stat-label">Заказов</div>
          </div>
          <div className="acc-stat">
            <div className="acc-stat-val red">{tier.percent}%</div>
            <div className="acc-stat-label">Ваша скидка</div>
          </div>
          <div className="acc-stat">
            <div className="acc-stat-val">{orders.length}</div>
            <div className="acc-stat-label">Всего заявок</div>
          </div>
        </div>

        <div className="acc-progress">
          {next ? (
            <>
              <div className="acc-progress-txt">
                Ещё <b>{next.ordersLeft}</b> {next.ordersLeft === 1 ? "заказ" : next.ordersLeft < 5 ? "заказа" : "заказов"} до уровня «{next.tier.label}» — скидка <b>{next.tier.percent}%</b>
              </div>
              <div className="acc-progress-track">
                <div className="acc-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </>
          ) : (
            <div className="acc-progress-txt">Максимальный уровень достигнут — спасибо, что вы с нами! 🔥</div>
          )}
        </div>
      </div>

      <div className="acc-card">
        <h2 className="acc-section-title">История заказов</h2>
        {orders.length === 0 ? (
          <div className="acc-empty">
            Заказов пока нет. <a href="/calculator">Собрать смету →</a>
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="acc-order">
              <div>
                <div className="acc-order-type">{o.selection.shootType}</div>
                <div className="acc-order-meta">
                  {fmtDate(o.createdAt)} · {o.selection.days} {daysWord(o.selection.days)}
                  {o.selection.urgent ? " · срочно" : ""}
                </div>
              </div>
              <div className="acc-order-price">
                {formatRub(o.breakdown.totalMin)} – {formatRub(o.breakdown.totalMax)}
                <div className="acc-order-status">{STATUS_LABEL[o.status]}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="acc-card">
        <button className="acc-btn acc-btn-ghost" onClick={onSignOut}>Выйти</button>
      </div>
    </>
  );
}

export default function Account() {
  const [session, setSession] = useState<Session | null>(() => getSession());
  // Подтянуть отредактированные в админке уровни скидок; key ремаунтит дашборд.
  const [tiersReady, setTiersReady] = useState(0);
  useEffect(() => { hydrateTiers().then(() => setTiersReady((v) => v + 1)); }, []);

  return (
    <div className="acc-wrap">
      <div className="acc-top">
        <a className="acc-logo" href="/">YELYG<span>I</span>NN</a>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a className="acc-back" href="/#all-sections">Все разделы</a>
          <a className="acc-back" href="/">← на главную</a>
        </div>
      </div>

      <p className="acc-eyebrow">Личный кабинет</p>
      <h1 className="acc-title">{session ? <>Ваш <span>кабинет</span></> : <>Вход для <span>клиентов</span></>}</h1>

      {session ? (
        <div key={tiersReady}>
          <Dashboard session={session} onSignOut={() => { signOut(); setSession(null); }} />
        </div>
      ) : (
        <Login onDone={() => setSession(getSession())} />
      )}
    </div>
  );
}
