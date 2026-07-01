// Скачивание фото из галереи (Этап D): одиночное, выбранные, ZIP всей галереи.
// Учитывает downloadPolicy: 'original' — как есть; 'web' — ужимаем канвасом; 'none' — запрет.
// ZIP собирается на клиенте (fflate), т.к. serverless не потянет большие архивы.
import { zipSync } from "fflate";
import { getStorage } from "./storage";
import type { Asset, DownloadPolicy } from "./types";

const storage = getStorage();
const WEB_MAX = 2048; // px по длинной стороне для web-версии

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function fileName(asset: Asset, index: number, policy: DownloadPolicy): string {
  const base = (asset.filename || `photo-${String(index + 1).padStart(3, "0")}.jpg`).replace(/\s+/g, "_");
  if (policy === "web") return base.replace(/\.(\w+)$/, "") + "-web.jpg";
  return base;
}

/** Опции водяного знака на web-версии. Оригиналы (по DownloadToken) — без знака. */
export interface Watermark {
  text: string;
}

/** Нанести диагональный плиточный водяной знак на канвас (полупрозрачный). */
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  const t = text.trim();
  if (!t) return;
  const fontSize = Math.max(14, Math.round(Math.min(w, h) / 22));
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, fontSize / 14);
  ctx.font = `600 ${fontSize}px -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  const stepX = ctx.measureText(t).width + fontSize * 3;
  const stepY = fontSize * 4;
  const diag = Math.sqrt(w * w + h * h);
  for (let y = -diag; y < diag; y += stepY) {
    for (let x = -diag; x < diag; x += stepX) {
      ctx.strokeText(t, x, y);
      ctx.fillText(t, x, y);
    }
  }
  ctx.restore();
}

/** Ужать изображение канвасом до web-версии (JPEG); опц. водяной знак. */
function webResize(blob: Blob, watermark?: Watermark): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const u = URL.createObjectURL(blob);
    img.onload = () => {
      const scale = Math.min(1, WEB_MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(u); return reject(new Error("no ctx")); }
      ctx.drawImage(img, 0, 0, w, h);
      if (watermark?.text) drawWatermark(ctx, w, h, watermark.text);
      URL.revokeObjectURL(u);
      c.toBlob((b) => resolve(b || blob), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error("bad image")); };
    img.src = u;
  });
}

async function resolveBlob(asset: Asset, policy: DownloadPolicy, watermark?: Watermark): Promise<Blob | null> {
  const raw = await storage.blob(asset.storageKey);
  if (!raw) return null;
  if (policy === "web" && asset.type === "photo") {
    try { return await webResize(raw, watermark); } catch { return raw; }
  }
  return raw;
}

/** Скачать одно фото. watermark наносится только на web-версию. */
export async function downloadSingle(asset: Asset, policy: DownloadPolicy, index = 0, watermark?: Watermark): Promise<void> {
  if (policy === "none") return;
  const blob = await resolveBlob(asset, policy, watermark);
  if (blob) triggerDownload(blob, fileName(asset, index, policy));
}

/** Скачать набор фото одним ZIP-архивом. onProgress(done, total). watermark — на web-версии. */
export async function downloadZip(
  assets: Asset[],
  policy: DownloadPolicy,
  zipName: string,
  onProgress?: (done: number, total: number) => void,
  watermark?: Watermark,
): Promise<void> {
  if (policy === "none" || assets.length === 0) return;
  const files: Record<string, Uint8Array> = {};
  let done = 0;
  for (let i = 0; i < assets.length; i++) {
    const blob = await resolveBlob(assets[i], policy, watermark);
    if (blob) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      files[fileName(assets[i], i, policy)] = buf;
    }
    onProgress?.(++done, assets.length);
  }
  // level 0 — фото уже сжаты, не тратим CPU на повторное сжатие.
  const zipped = zipSync(files, { level: 0 });
  triggerDownload(new Blob([zipped], { type: "application/zip" }), `${zipName || "gallery"}.zip`);
}
