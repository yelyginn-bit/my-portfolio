// Авторизация клиента по телефону.
// Каналы доставки OTP (выбираются автоматически ответом /api/auth-request):
//  • 'tg'         — код/кнопка через Telegram-бота (прод, есть бот + Supabase);
//  • 'dev_server' — код на экране, проверка серверная (Supabase есть, бота нет);
//  • 'local'      — полностью локальный dev-OTP (нет сервера) — код на экране.
// HttpOnly cookie является источником серверной сессии; в sessionStorage хранится
// только минимальное отображаемое состояние без JWT.
import type { Client } from "./types";
import { getStore, isValidPhone, normalizePhone } from "./store";
import { isSupabaseConfigured, setSupabaseToken } from "./supabaseClient";
import { secureFetch } from "./api";

/**
 * Мост к Supabase RLS: по подтверждённому OTP получает у сервера JWT (sub=user_id)
 * и привязывает его к Supabase-клиенту. Без Supabase/JWT-секрета — тихо ничего не делает.
 */
export async function bridgeSupabaseSession(phone: string, token?: string): Promise<void> {
  if (!token) return;
  try {
    const r = await secureFetch("/api/auth-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, token }),
    });
    const d = await r.json();
    if (d.ok && d.access_token) setSupabaseToken(d.access_token);
  } catch {
    /* сервер/Supabase недоступны — работаем без RLS-токена */
  }
}

const SESSION_KEY = "yel_session_v1";
const OTP_KEY = "yel_otp_v1";
const OTP_TTL_MS = 5 * 60 * 1000;

export type AuthMode = "tg" | "dev_server" | "local";

export interface Session {
  phone: string;
  name?: string;
  loggedInAt: string;
}

export interface RequestResult {
  ok: boolean;
  mode: AuthMode;
  token?: string;         // для verify и опроса статуса
  deepLink?: string | null; // tg + не привязан: ссылка «открыть бота»
  devCode?: string;       // dev_server/local: код на экране
  error?: string;
}

// ─── Сессия ──────────────────────────────────────────────────────────────────
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function finalizeSession(phone: string, name?: string | null): Session {
  const s: Session = { phone: normalizePhone(phone), name: name || undefined, loggedInAt: new Date().toISOString() };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  // Production-профиль создаётся сервером после OTP; браузер пишет клиента
  // напрямую только в локальном fallback-режиме разработки.
  if (!isSupabaseConfigured) getStore().upsertClient({ phone: s.phone, name: s.name }).catch(() => {});
  return s;
}

export function signOut(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_KEY);
    secureFetch("/api/session-logout", { method: "POST" }).catch(() => {});
  }
  setSupabaseToken(null);
}

// ─── Локальный dev-OTP (фолбэк, когда сервера нет) ────────────────────────────
function genCode(): string {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

function localRequest(phone: string): RequestResult {
  const code = genCode();
  const rec = { phone: normalizePhone(phone), code, expiresAt: Date.now() + OTP_TTL_MS };
  window.sessionStorage.setItem(OTP_KEY, JSON.stringify(rec));
  return { ok: true, mode: "local", devCode: code };
}

function localVerify(phone: string, code: string): { ok: boolean; error?: string } {
  let rec: { phone: string; code: string; expiresAt: number } | null = null;
  try {
    rec = JSON.parse(window.sessionStorage.getItem(OTP_KEY) || "null");
  } catch {
    rec = null;
  }
  const p = normalizePhone(phone);
  if (!rec || rec.phone !== p) return { ok: false, error: "Запросите код заново" };
  if (Date.now() > rec.expiresAt) return { ok: false, error: "Код истёк — запросите новый" };
  if (rec.code !== String(code).trim()) return { ok: false, error: "Неверный код" };
  window.sessionStorage.removeItem(OTP_KEY);
  return { ok: true };
}

// ─── Запрос кода ───────────────────────────────────────────────────────────────
export async function requestOtp(phone: string): Promise<RequestResult> {
  if (!isValidPhone(phone)) return { ok: false, mode: "local", error: "Некорректный номер телефона" };
  try {
    const r = await secureFetch("/api/auth-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (r.ok) {
      const d = (await r.json()) as RequestResult;
      if (d.ok && d.mode && d.mode !== "local") return d;
    }
  } catch {
    /* В dev используем локальный OTP; в production вход без сервера запрещён. */
  }
  if (import.meta.env.DEV) return localRequest(phone);
  return {
    ok: false,
    mode: "local",
    error: "Сервис входа временно недоступен. Попробуйте позже или напишите @YuriElygin.",
  };
}

// ─── Проверка кода ──────────────────────────────────────────────────────────────
export async function verifyOtp(args: {
  phone: string;
  code: string;
  name?: string;
  token?: string;
  mode?: AuthMode;
}): Promise<{ ok: boolean; client?: Client; error?: string }> {
  const { phone, code, name, token, mode } = args;

  if (mode && mode !== "local") {
    try {
      const r = await secureFetch("/api/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, token }),
      });
      const d = await r.json();
      if (d.ok) {
        finalizeSession(phone, name || d.client?.name);
        await bridgeSupabaseSession(phone, token); // RLS-токен (если Supabase настроен)
        return { ok: true };
      }
      return { ok: false, error: d.error || "Неверный код" };
    } catch {
      return { ok: false, error: "Ошибка соединения" };
    }
  }

  if (!import.meta.env.DEV) {
    return { ok: false, error: "Локальный код доступен только в режиме разработки" };
  }

  const local = localVerify(phone, code);
  if (!local.ok) return local;
  finalizeSession(phone, name);
  return { ok: true };
}

// ─── Опрос статуса (кнопка в боте / первичная привязка) ───────────────────────
export async function pollAuthStatus(
  token: string,
): Promise<{ status: "pending" | "confirmed" | "expired" | "unknown"; phone?: string; name?: string }> {
  try {
    const r = await secureFetch("/api/auth-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const d = await r.json();
    return { status: d.status, phone: d.phone, name: d.name };
  } catch {
    return { status: "unknown" };
  }
}
