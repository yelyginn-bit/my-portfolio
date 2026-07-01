// Экспорт выбора клиента (Этап I) для импорта в Capture One / Lightroom / DaVinci
// Resolve. Собирает ZIP: selection.csv + списки имён по категориям + README.
// Формат универсальный (имена файлов), т.к. у фото-редакторов нет единого формата выборки.
import { zipSync } from "fflate";
import type { Asset, Selection, SelectionKind } from "./types";

const enc = (s: string) => new TextEncoder().encode(s);

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

const README = `Экспорт выбора клиента — Yelyginn
==================================
selection.csv   — таблица: имя файла, like, retouch, print (1 = отмечено)
retouch.txt     — имена файлов, отмеченных на ретушь
print.txt       — имена файлов, отмеченных на печать
likes.txt       — понравившиеся кадры

Как импортировать:
• Capture One — отфильтруйте по имени файла (Filters) или используйте список как чек-лист.
• Lightroom Classic — Library → Text filter по имени файла; отбирайте по списку.
• DaVinci Resolve — импортируйте selection.csv для сверки клипов/кадров.
`;

/** Есть ли что экспортировать. */
export function hasSelections(selections: Selection[]): boolean {
  return selections.length > 0;
}

export function exportSelectionsZip(
  galleryTitle: string,
  assets: Asset[],
  selections: Selection[],
): void {
  const byAsset = new Map<string, Set<SelectionKind>>();
  for (const s of selections) {
    if (!byAsset.has(s.assetId)) byAsset.set(s.assetId, new Set());
    byAsset.get(s.assetId)!.add(s.kind);
  }
  const nameOf = (a: Asset) => a.filename || `${a.id}`;
  const marked = assets.filter((a) => byAsset.has(a.id));

  const rows = [["filename", "type", "like", "retouch", "print"]];
  for (const a of marked) {
    const m = byAsset.get(a.id)!;
    rows.push([nameOf(a), a.type, m.has("like") ? "1" : "", m.has("retouch") ? "1" : "", m.has("print") ? "1" : ""]);
  }
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");

  const cat = (kind: SelectionKind) => marked.filter((a) => byAsset.get(a.id)!.has(kind)).map(nameOf).join("\n");

  const files: Record<string, Uint8Array> = { "selection.csv": enc(csv), "README.txt": enc(README) };
  const ret = cat("retouch"); if (ret) files["retouch.txt"] = enc(ret);
  const pr = cat("print"); if (pr) files["print.txt"] = enc(pr);
  const lk = cat("like"); if (lk) files["likes.txt"] = enc(lk);

  const zipped = zipSync(files, { level: 0 });
  const safe = (galleryTitle || "gallery").replace(/[^\wа-яё.-]+/giu, "_").slice(0, 40);
  triggerDownload(new Blob([zipped], { type: "application/zip" }), `${safe}-выбор.zip`);
}
