// Серверный клиент Supabase (service_role) для эндпоинтов auth/webhook.
// Возвращает null, если ключи не заданы — тогда вход работает в локальном dev-режиме.
import { createClient } from "@supabase/supabase-js";

let _admin = null;

export function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_admin) {
    _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _admin;
}
