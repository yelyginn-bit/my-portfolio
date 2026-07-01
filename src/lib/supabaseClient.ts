// Клиент Supabase. SDK грузится ЛЕНИВО (dynamic import) и только если заданы
// env-ключи — поэтому supabase-js не попадает в бандл маркетинга, пока БД не
// подключена. Без ключей приложение работает на LocalDataStore (см. store.ts).
import type { SupabaseClient } from "@supabase/supabase-js"; // type-only, стирается при сборке

// Guard на случай не-Vite окружения (тесты в node): import.meta.env там нет.
const env: Record<string, string | undefined> = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;

/** true, когда заданы ключи Supabase. Дешёвая проверка без загрузки SDK. */
export const isSupabaseConfigured = Boolean(url && anon);

let _client: SupabaseClient | null = null;

const TOKEN_KEY = "yel_sb_token";

function storedToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

/**
 * Установить/снять пользовательский JWT (выдан /api/auth-session или /api/admin-login).
 * Токен идёт в заголовке Authorization → PostgREST применяет RLS по его claim'ам.
 * Сбрасываем кэш клиента, чтобы заголовок применился.
 */
export function setSupabaseToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  _client = null;
}

/** Singleton-клиент Supabase или null, если ключи не заданы. SDK импортируется по требованию. */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    const { createClient } = await import("@supabase/supabase-js");
    const token = storedToken();
    _client = createClient(
      url!,
      anon!,
      token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined,
    );
  }
  return _client;
}
