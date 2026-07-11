// Storage Layer — абстракция хранения бинарных файлов (фото/видео).
// Метаданные ассетов лежат в DataStore; сами файлы — здесь.
//  • LocalStorageProvider — IndexedDB (dev, работает без облака);
//  • SupabaseStorageProvider — приватный Supabase Storage (free tier);
//  • R2Provider — Cloudflare R2 через presigned-эндпоинты (прод).
// Выбор: VITE_STORAGE_PROVIDER ("local" | "supabase" | "r2").
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

export interface StorageProvider {
  readonly name: string;
  /** Загрузить файл под ключом. */
  upload(key: string, file: Blob, onProgress?: (pct: number) => void): Promise<void>;
  /** Получить URL для отображения (objectURL в dev / signed URL в проде). */
  url(key: string): Promise<string>;
  /** Получить сам файл (для скачивания/зипа). */
  blob(key: string): Promise<Blob | null>;
  /** Удалить файл. */
  remove(key: string): Promise<void>;
}

// ─── IndexedDB (dev) ──────────────────────────────────────────────────────────
const DB_NAME = "yel_media";
const STORE = "blobs";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve((r.result as Blob) ?? null);
    r.onerror = () => reject(r.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const urlCache = new Map<string, string>();

class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  async upload(key: string, file: Blob, onProgress?: (pct: number) => void): Promise<void> {
    await idbPut(key, file);
    onProgress?.(100);
  }
  async url(key: string): Promise<string> {
    if (urlCache.has(key)) return urlCache.get(key)!;
    const blob = await idbGet(key);
    if (!blob) return "";
    const u = URL.createObjectURL(blob);
    urlCache.set(key, u);
    return u;
  }
  async blob(key: string): Promise<Blob | null> {
    return idbGet(key);
  }
  async remove(key: string): Promise<void> {
    await idbDel(key);
    const u = urlCache.get(key);
    if (u) { URL.revokeObjectURL(u); urlCache.delete(key); }
  }
}

// ─── Контекст доступа для presigned-эндпоинтов ────────────────────────────────
// /api/file-url теперь требует авторизацию: админ (Bearer JWT) или гость галереи
// (X-Gallery-Access). Вьювер /g ставит короткоживущий ticket после проверки
// загрузкой; административная сессия передаётся защищённой HttpOnly cookie.
import { secureFetch } from "./api";
let _galleryTicket: string | null = null;
/** Задать короткоживущий ticket текущей галереи. null — сбросить. */
export function setShareContext(ticket: string | null): void {
  _galleryTicket = ticket || null;
}

function galleryHeaders(): HeadersInit | undefined {
  return _galleryTicket ? { "X-Gallery-Access": _galleryTicket } : undefined;
}

// ─── Cloudflare R2 (через presigned-эндпоинты) ────────────────────────────────
class R2Provider implements StorageProvider {
  readonly name = "r2";
  async upload(key: string, file: Blob, onProgress?: (pct: number) => void): Promise<void> {
    const r = await secureFetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, contentType: file.type || "application/octet-stream", size: file.size }),
    });
    if (!r.ok) throw new Error("Не удалось получить ссылку для загрузки");
    const { url } = await r.json();
    // PUT с прогрессом через XHR.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(file);
    });
  }
  async url(key: string): Promise<string> {
    const r = await fetch(`/api/file-url?key=${encodeURIComponent(key)}`, { headers: galleryHeaders(), credentials: "same-origin" });
    if (!r.ok) return "";
    const { url } = await r.json();
    return url;
  }
  async blob(key: string): Promise<Blob | null> {
    const u = await this.url(key);
    if (!u) return null;
    const r = await fetch(u);
    return r.ok ? await r.blob() : null;
  }
  async remove(key: string): Promise<void> {
    await secureFetch(`/api/file-url?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
    }).catch(() => {});
  }
}

const env: Record<string, string | undefined> =
  (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_BUCKET = env.VITE_SUPABASE_STORAGE_BUCKET || "media";

export function yandexStorageKey(publicKey: string, path: string): string {
  return `ydisk:${encodeURIComponent(publicKey)}:${encodeURIComponent(path)}`;
}

function yandexStorageParts(key: string): { publicKey: string; path: string } | null {
  if (!key.startsWith("ydisk:")) return null;
  const separator = key.indexOf(":", 6);
  if (separator === -1) return null;
  return {
    publicKey: decodeURIComponent(key.slice(6, separator)),
    path: decodeURIComponent(key.slice(separator + 1)),
  };
}

class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";

  private async bucket() {
    const sb = await getSupabase();
    if (!sb) throw new Error("Supabase не настроен");
    return sb.storage.from(SUPABASE_BUCKET);
  }

  async upload(key: string, file: Blob, onProgress?: (pct: number) => void): Promise<void> {
    const authorization = await secureFetch("/api/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, contentType: file.type || "application/octet-stream", size: file.size }) });
    const signed = await authorization.json().catch(() => ({}));
    if (!authorization.ok || signed.provider !== "supabase" || !signed.token) throw new Error("Не удалось подготовить загрузку");
    const bucket = await this.bucket();
    const { error } = await bucket.uploadToSignedUrl(key, signed.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw error;
    onProgress?.(100);
  }

  async url(key: string): Promise<string> {
    const yandex = yandexStorageParts(key);
    if (yandex) {
      const params = new URLSearchParams({
        action: "url",
        publicKey: yandex.publicKey,
        path: yandex.path,
      });
      const response = await fetch(`/api/yandex-disk?${params}`);
      if (!response.ok) return "";
      const data = await response.json();
      return data.url || "";
    }
    const r = await fetch(`/api/file-url?key=${encodeURIComponent(key)}`, { headers: galleryHeaders(), credentials: "same-origin" });
    if (!r.ok) return "";
    const data = await r.json();
    return data.url || "";
  }

  async blob(key: string): Promise<Blob | null> {
    const u = await this.url(key);
    if (!u) return null;
    const r = await fetch(u);
    return r.ok ? await r.blob() : null;
  }

  async remove(key: string): Promise<void> {
    if (yandexStorageParts(key)) return;
    await secureFetch(`/api/file-url?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
    }).catch(() => {});
  }
}

let _storage: StorageProvider | null = null;
export function getStorage(): StorageProvider {
  if (!_storage) {
    if (env.VITE_STORAGE_PROVIDER === "r2") _storage = new R2Provider();
    else if (env.VITE_STORAGE_PROVIDER === "supabase" && isSupabaseConfigured) _storage = new SupabaseStorageProvider();
    else _storage = new LocalStorageProvider();
  }
  return _storage;
}

/** Удалённое хранилище — оригиналы доступны через серверный /api/download.
 *  В local-режиме serverless нет, скачивание идёт целиком на клиенте. */
export function isRemoteStorage(): boolean {
  return env.VITE_STORAGE_PROVIDER === "r2" || (env.VITE_STORAGE_PROVIDER === "supabase" && isSupabaseConfigured);
}

// ─── Генерация превью на канвасе (без зависимостей) ───────────────────────────
/** Делает уменьшенный JPEG-превью (data-URL) и читает размеры исходника. */
export function makeThumbnail(
  file: File,
  maxSize = 480,
): Promise<{ thumbUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); return reject(new Error("no ctx")); }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve({ thumbUrl: canvas.toDataURL("image/jpeg", 0.7), width, height });
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("bad image")); };
    img.src = objectUrl;
  });
}
