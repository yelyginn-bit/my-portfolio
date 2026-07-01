// Видео (Этап E). Два провайдера:
//  • local — файл в IndexedDB + нативный <video> (dev, работает без облака);
//  • cloudflare_stream — загрузка в Cloudflare Stream (транскод h264/h265,
//    адаптивный плеер, авто-превью). Включается заданием VITE_CF_STREAM_CUSTOMER.
// Загрузка в Stream идёт напрямую с клиента по одноразовой ссылке (direct_upload),
// секреты остаются на сервере (api/stream-upload-url).
import { getStorage } from "./storage";

const storage = getStorage();
const env: Record<string, string | undefined> =
  (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

/** Customer-код Cloudflare Stream (для iframe/превью). Задан → используем Stream. */
const STREAM_CUSTOMER = env.VITE_CF_STREAM_CUSTOMER;
export const useStream = Boolean(STREAM_CUSTOMER);

export interface VideoUploadResult {
  provider: string;
  storageKey?: string;
  videoUid?: string;
  posterDataUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
}

function ridExt(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return { id: Math.random().toString(36).slice(2) + Date.now().toString(36), ext: m ? m[1].toLowerCase() : "mp4" };
}

/** Кадр-постер и длительность/размеры из видеофайла (канвас, без зависимостей). */
export function makeVideoPoster(
  file: File,
): Promise<{ posterDataUrl: string; durationSec: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadeddata = () => {
      // Перемотать на ~1с (или середину коротких роликов) для осмысленного кадра.
      try { video.currentTime = Math.min(1, (video.duration || 2) / 2); } catch { /* noop */ }
    };
    video.onseeked = () => {
      const w = video.videoWidth, h = video.videoHeight;
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { cleanup(); return reject(new Error("no ctx")); }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const poster = canvas.toDataURL("image/jpeg", 0.7);
      const duration = video.duration || 0;
      cleanup();
      resolve({ posterDataUrl: poster, durationSec: Math.round(duration), width: w, height: h });
    };
    video.onerror = () => { cleanup(); reject(new Error("bad video")); };
  });
}

export async function uploadVideo(
  file: File,
  galleryId: string,
  onProgress?: (pct: number) => void,
): Promise<VideoUploadResult> {
  const meta = await makeVideoPoster(file).catch(() => ({
    posterDataUrl: "", durationSec: 0, width: 0, height: 0,
  }));

  if (useStream) {
    const r = await fetch("/api/stream-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name }),
    });
    if (!r.ok) throw new Error("Stream не настроен или недоступен");
    const { uploadURL, uid } = await r.json();
    // Одноразовая загрузка файла в Stream (multipart, поле "file") с прогрессом.
    await new Promise<void>((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadURL);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Stream upload failed")));
      xhr.onerror = () => reject(new Error("Stream upload failed"));
      xhr.send(fd);
    });
    return { provider: "cloudflare_stream", videoUid: uid, durationSec: meta.durationSec, width: meta.width, height: meta.height };
  }

  // Локально: блоб в IndexedDB.
  const { id, ext } = ridExt(file.name);
  const key = `galleries/${galleryId}/video/${id}.${ext}`;
  await storage.upload(key, file, onProgress);
  return {
    provider: "local",
    storageKey: key,
    posterDataUrl: meta.posterDataUrl,
    durationSec: meta.durationSec,
    width: meta.width,
    height: meta.height,
  };
}

/** Постер видео для плитки. */
export async function videoPoster(asset: { videoProvider?: string; videoUid?: string; thumbUrl?: string }): Promise<string> {
  if (asset.videoProvider === "cloudflare_stream" && STREAM_CUSTOMER && asset.videoUid) {
    return `https://customer-${STREAM_CUSTOMER}.cloudflarestream.com/${asset.videoUid}/thumbnails/thumbnail.jpg`;
  }
  return asset.thumbUrl || "";
}

/** Данные для плеера: нативный <video> (local) или iframe Stream. */
export async function videoPlayback(asset: {
  videoProvider?: string;
  videoUid?: string;
  storageKey: string;
}): Promise<{ kind: "native" | "iframe"; src: string }> {
  if (asset.videoProvider === "cloudflare_stream" && STREAM_CUSTOMER && asset.videoUid) {
    return { kind: "iframe", src: `https://customer-${STREAM_CUSTOMER}.cloudflarestream.com/${asset.videoUid}/iframe` };
  }
  return { kind: "native", src: await storage.url(asset.storageKey) };
}

export function fmtDuration(sec?: number): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
