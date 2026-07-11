// Админ-панель галерей (Этап B): создание, drag&drop загрузка фото, сетка
// ассетов, выбор обложки, удаление, настройка доступа. Файлы — через Storage
// Layer (IndexedDB в dev / R2 в проде), метаданные — через DataStore.
import { useEffect, useRef, useState, type DragEvent } from "react";
import { getStore } from "../lib/store";
import { getStorage, makeThumbnail, yandexStorageKey } from "../lib/storage";
import { uploadVideo, videoPoster } from "../lib/video";
import { exportSelectionsZip } from "../lib/export";
import { getAI } from "../lib/ai";
import { getFace } from "../lib/face";
import { logAudit } from "../lib/audit";
import { notify } from "../lib/notify";
import type { Album, Asset, DownloadPolicy, Gallery, GalleryVisibility, PhotoComment } from "../lib/types";
import { secureToken } from "../lib/secureRandom";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { secureFetch } from "../lib/api";

const store = getStore();
const storage = getStorage();

function rid() {
  return secureToken(16);
}
function ext(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "jpg";
}

interface Upload { id: string; name: string; pct: number }

export default function Galleries() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selected, setSelected] = useState<Gallery | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [selCount, setSelCount] = useState(0);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumFilter, setAlbumFilter] = useState<string | null>(null);
  const [yandexUrl, setYandexUrl] = useState("");
  const [yandexBusy, setYandexBusy] = useState(false);
  const [yandexMessage, setYandexMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadGalleries = async () => setGalleries(await store.listGalleries());
  useEffect(() => { loadGalleries(); }, []);

  const openGallery = async (g: Gallery) => {
    setSelected(g);
    setShareUrl("");
    setAlbumFilter(null);
    const list = await store.listAssets(g.id);
    setAssets(list);
    store.listSelections(g.id).then((s) => setSelCount(s.length));
    store.listComments(g.id).then(setComments).catch(() => setComments([]));
    store.listAlbums(g.id).then(setAlbums).catch(() => setAlbums([]));
    store.getSetting<string>(`gallery_yandex_${g.id}`).then((value) => setYandexUrl(value || "")).catch(() => setYandexUrl(""));
    // Разрешаем URL для показа: inline thumb (dev) либо из хранилища.
    const map: Record<string, string> = {};
    await Promise.all(
      list.map(async (a) => {
        map[a.id] = a.type === "video" ? await videoPoster(a) : a.thumbUrl || (await storage.url(a.storageKey));
      }),
    );
    setUrls(map);
  };

  const syncYandex = async () => {
    if (!selected || !yandexUrl.trim() || yandexBusy) return;
    setYandexBusy(true);
    setYandexMessage("");
    try {
      const publicKey = yandexUrl.trim();
      const response = await fetch(`/api/yandex-disk?${new URLSearchParams({ publicKey })}`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Папка недоступна");

      await store.setSetting(`gallery_yandex_${selected.id}`, publicKey);
      const existing = new Set(assets.map((asset) => asset.storageKey));
      let added = 0;
      const allowedYandexImages = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
      for (const item of data.items || []) {
        if (item.type !== "file" || !allowedYandexImages.has(String(item.mimeType))) continue;
        const key = yandexStorageKey(publicKey, item.path);
        if (existing.has(key)) continue;
        const asset = await store.addAsset({
          galleryId: selected.id,
          type: "photo",
          storageProvider: "yandex",
          storageKey: key,
          filename: item.name,
          mime: item.mimeType,
          sizeBytes: item.size || undefined,
        });
        existing.add(key);
        added += 1;
        setAssets((list) => [...list, asset]);
        storage.url(key).then((url) => setUrls((map) => ({ ...map, [asset.id]: url })));
      }
      setYandexMessage(added ? `Добавлено фото: ${added}` : "Новых фотографий нет");
    } catch (error) {
      setYandexMessage(error instanceof Error ? error.message : "Не удалось синхронизировать");
    } finally {
      setYandexBusy(false);
    }
  };

  const createGallery = async () => {
    const title = newTitle.trim();
    if (!title) return;
    // Дефолтная политика скачивания берётся из настроек студии (Этап G).
    const studio = await store.getSetting<{ defaultDownloadPolicy?: DownloadPolicy }>("studio");
    const g = await store.createGallery({ title, downloadPolicy: studio?.defaultDownloadPolicy });
    logAudit("gallery.create", { entityType: "gallery", entityId: g.id, after: { title: g.title } });
    setNewTitle("");
    await loadGalleries();
    openGallery(g);
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!selected) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    for (const file of list) {
      const upId = rid();
      const setPct = (pct: number) => setUploads((u) => u.map((x) => (x.id === upId ? { ...x, pct } : x)));
      setUploads((u) => [...u, { id: upId, name: file.name, pct: 0 }]);
      try {
        if (file.type.startsWith("video/")) {
          const res = await uploadVideo(file, selected.id, setPct);
          const asset = await store.addAsset({
            galleryId: selected.id,
            type: "video",
            storageProvider: res.provider,
            storageKey: res.storageKey || `stream:${res.videoUid}`,
            videoProvider: res.provider,
            videoUid: res.videoUid,
            thumbUrl: res.posterDataUrl || undefined,
            durationSec: res.durationSec,
            filename: file.name,
            mime: file.type,
            width: res.width,
            height: res.height,
            sizeBytes: file.size,
          });
          setAssets((a) => [...a, asset]);
          setUrls((m) => ({ ...m, [asset.id]: "" }));
          videoPoster(asset).then((p) => setUrls((m) => ({ ...m, [asset.id]: p })));
        } else {
          const { thumbUrl, width, height } = await makeThumbnail(file).catch(() => ({
            thumbUrl: "", width: 0, height: 0,
          }));
          const key = `galleries/${selected.id}/orig/${rid()}.${ext(file.name)}`;
          await storage.upload(key, file, setPct);
          const asset = await store.addAsset({
            galleryId: selected.id,
            type: "photo",
            storageProvider: storage.name,
            storageKey: key,
            thumbUrl: storage.name === "local" ? thumbUrl : undefined,
            filename: file.name,
            mime: file.type,
            width: width || undefined,
            height: height || undefined,
            sizeBytes: file.size,
          });
          setAssets((a) => [...a, asset]);
          setUrls((m) => ({ ...m, [asset.id]: asset.thumbUrl || "" }));
          if (storage.name !== "local") {
            storage.url(key).then((u) => setUrls((m) => ({ ...m, [asset.id]: u })));
          }
        }
      } finally {
        setUploads((u) => u.filter((x) => x.id !== upId));
      }
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const setCover = async (assetId: string) => {
    if (!selected) return;
    const g = await store.updateGallery(selected.id, { coverAssetId: assetId });
    setSelected(g);
    await loadGalleries();
  };

  const removeAsset = async (a: Asset) => {
    await storage.remove(a.storageKey).catch(() => {});
    await store.deleteAsset(a.id);
    logAudit("asset.delete", { entityType: "asset", entityId: a.id, before: { filename: a.filename, galleryId: a.galleryId } });
    setAssets((list) => list.filter((x) => x.id !== a.id));
  };

  const patchGallery = async (patch: Partial<Gallery>) => {
    if (!selected) return;
    const before = { visibility: selected.visibility, downloadPolicy: selected.downloadPolicy, published: selected.published };
    const g = await store.updateGallery(selected.id, patch);
    // Изменение доступа/настроек галереи — критично для audit.
    logAudit("gallery.update", { entityType: "gallery", entityId: selected.id, before, after: patch });
    setSelected(g);
    await loadGalleries();
  };

  const [aiBusy, setAiBusy] = useState<"ai" | "face" | null>(null);

  const runAiTags = async () => {
    if (!selected || aiBusy) return;
    setAiBusy("ai");
    try {
      const ai = getAI();
      for (const a of assets) await store.updateAsset(a.id, { aiTags: await ai.tagImage(a) });
      setAssets(await store.listAssets(selected.id));
    } finally { setAiBusy(null); }
  };

  const runFaces = async () => {
    if (!selected || aiBusy) return;
    setAiBusy("face");
    try {
      const groups = await getFace().groupFaces(assets);
      for (const [id, g] of Object.entries(groups)) await store.updateAsset(id, { faceGroup: g });
      setAssets(await store.listAssets(selected.id));
    } finally { setAiBusy(null); }
  };

  // ─── Альбомы (разделы внутри галереи) ──────────────────────────────────────
  const addAlbum = async () => {
    if (!selected) return;
    const title = prompt("Название альбома:")?.trim();
    if (!title) return;
    const al = await store.createAlbum({ galleryId: selected.id, title, sortOrder: albums.length });
    logAudit("album.create", { entityType: "album", entityId: al.id, after: { title, galleryId: selected.id } });
    setAlbums((list) => [...list, al]);
  };

  const renameAlbum = async (al: Album) => {
    const title = prompt("Новое название альбома:", al.title)?.trim();
    if (!title || title === al.title) return;
    const u = await store.updateAlbum(al.id, { title });
    logAudit("album.update", { entityType: "album", entityId: al.id, before: { title: al.title }, after: { title } });
    setAlbums((list) => list.map((x) => (x.id === al.id ? u : x)));
  };

  const removeAlbum = async (al: Album) => {
    if (!confirm(`Удалить альбом «${al.title}»? Фото останутся в галерее (без альбома).`)) return;
    await store.deleteAlbum(al.id);
    logAudit("album.delete", { entityType: "album", entityId: al.id, before: { title: al.title } });
    setAlbums((list) => list.filter((x) => x.id !== al.id));
    setAssets((list) => list.map((a) => (a.albumId === al.id ? { ...a, albumId: undefined } : a)));
    if (albumFilter === al.id) setAlbumFilter(null);
  };

  // Привязать ассет к альбому (или открепить — albumId="").
  const assignAlbum = async (a: Asset, albumId: string) => {
    const next = albumId || undefined;
    const u = await store.updateAsset(a.id, { albumId: next });
    setAssets((list) => list.map((x) => (x.id === a.id ? u : x)));
  };

  // Сделать фото обложкой альбома (повторный клик — снять обложку).
  const setAlbumCover = async (albumId: string, assetId: string) => {
    const cur = albums.find((x) => x.id === albumId)?.coverAssetId;
    const next = cur === assetId ? undefined : assetId;
    const u = await store.updateAlbum(albumId, { coverAssetId: next });
    setAlbums((list) => list.map((x) => (x.id === albumId ? u : x)));
  };

  // Переместить альбом влево/вправе (обмен sortOrder с соседом, сохранение обоих).
  const moveAlbum = async (al: Album, dir: -1 | 1) => {
    const ordered = [...albums].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = ordered.findIndex((x) => x.id === al.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    const [a, b] = await Promise.all([
      store.updateAlbum(al.id, { sortOrder: swap.sortOrder }),
      store.updateAlbum(swap.id, { sortOrder: al.sortOrder }),
    ]);
    setAlbums((list) => list.map((x) => (x.id === a.id ? a : x.id === b.id ? b : x)).sort((m, n) => m.sortOrder - n.sortOrder));
  };

  const removeComment = async (c: PhotoComment) => {
    if (!confirm("Удалить комментарий клиента?")) return;
    await store.deleteComment(c.id);
    logAudit("comment.delete", { entityType: "photo_comment", entityId: c.id, before: { assetId: c.assetId, text: c.text } });
    setComments((list) => list.filter((x) => x.id !== c.id));
  };

  const exportSelection = async () => {
    if (!selected) return;
    const sels = await store.listSelections(selected.id);
    if (sels.length === 0) { alert("Клиент пока ничего не отметил."); return; }
    exportSelectionsZip(selected.title, assets, sels);
  };

  const share = async () => {
    if (!selected) return;
    const password = prompt("Пароль для галереи (необязательно — оставьте пустым):") || undefined;
    const link = isSupabaseConfigured
      ? await secureFetch("/api/admin-share-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ galleryId: selected.id, password, canDownload: selected.downloadPolicy !== "none" }) }).then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.link) throw new Error(data.error || "Не удалось создать ссылку");
        return data.link;
      })
      : await store.createShareLink(selected.id, { password, canDownload: selected.downloadPolicy !== "none" });
    logAudit("access.create", { entityType: "gallery", entityId: selected.id, after: { token: link.token, password: !!password, canDownload: link.canDownload } });
    // В dev rewrite /g/:token не работает — даём ссылку через ?token=; в проде — красивый /g/<token>.
    const url = import.meta.env.DEV
      ? `${location.origin}/gallery.html?token=${link.token}`
      : `${location.origin}/g/${link.token}`;
    notify("gallery.shared", {
      entityType: "gallery", entityId: selected.id,
      text: `Открыт доступ к галерее «${selected.title}»${password ? " (под паролем)" : ""}\n${url}`,
      payload: { token: link.token, password: !!password },
    });
    setShareUrl(url + (password ? `  (пароль: ${password})` : ""));
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard недоступен */ }
  };

  // Выдать право на скачивание ОРИГИНАЛОВ (без водяного знака) по DownloadToken.
  // Ссылка вида /api/download?token=...&asset=<id> — оригинал отдаётся серверно.
  const issueOriginalsToken = async () => {
    if (!selected) return;
    const days = Number(prompt("Срок действия токена, дней (пусто — бессрочно):", "14") || "0");
    const expiresAt = days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : undefined;
    const tk = await store.createDownloadToken({ galleryId: selected.id, quality: "original", expiresAt });
    const base = `${location.origin}/api/download?token=${tk.token}`;
    logAudit("download.token", { entityType: "gallery", entityId: selected.id, after: { token: tk.token, quality: "original", expiresAt } });
    notify("gallery.shared", {
      entityType: "gallery", entityId: selected.id,
      text: `Выдан доступ к оригиналам галереи «${selected.title}»${expiresAt ? ` (до ${new Date(expiresAt).toLocaleDateString("ru-RU")})` : ""}`,
      payload: { token: tk.token, quality: "original" },
    });
    setShareUrl(`Оригиналы: ${base}&asset=<id фото>`);
    try { await navigator.clipboard.writeText(base); } catch { /* clipboard недоступен */ }
  };

  const removeGallery = async () => {
    if (!selected) return;
    if (!confirm(`Удалить галерею «${selected.title}» и все её фото?`)) return;
    for (const a of assets) await storage.remove(a.storageKey).catch(() => {});
    await store.deleteGallery(selected.id);
    logAudit("gallery.delete", { entityType: "gallery", entityId: selected.id, before: { title: selected.title } });
    setSelected(null);
    setAssets([]);
    await loadGalleries();
  };

  return (
    <div className="adm-card" style={{ padding: 18 }}>
      <div className="gal-layout">
        {/* Список галерей */}
        <div>
          <div className="gal-new">
            <input
              placeholder="Новая галерея…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGallery()}
            />
            <button className="gal-mini-btn" onClick={createGallery}>+</button>
          </div>
          <div className="gal-list">
            {galleries.length === 0 && <div className="adm-empty" style={{ padding: 18 }}>Пока нет галерей.</div>}
            {galleries.map((g) => (
              <button
                key={g.id}
                className="gal-item"
                data-active={selected?.id === g.id}
                onClick={() => openGallery(g)}
              >
                <b>{g.title}</b>
                <span>{g.visibility} · {g.published ? "опубл." : "черновик"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Управление выбранной галереей */}
        <div>
          {!selected ? (
            <div className="adm-empty">Выберите галерею слева или создайте новую.</div>
          ) : (
            <>
              <div className="gal-meta">
                <strong style={{ fontSize: 16 }}>{selected.title}</strong>
                <select
                  value={selected.visibility}
                  onChange={(e) => patchGallery({ visibility: e.target.value as GalleryVisibility })}
                  title="Доступ"
                >
                  <option value="private">Приватная</option>
                  <option value="public">Публичная</option>
                  <option value="password">По паролю</option>
                  <option value="token">По ссылке</option>
                </select>
                <select
                  value={selected.downloadPolicy}
                  onChange={(e) => patchGallery({ downloadPolicy: e.target.value as DownloadPolicy })}
                  title="Скачивание"
                >
                  <option value="none">Без скачивания</option>
                  <option value="web">Web-версия</option>
                  <option value="original">Оригиналы</option>
                </select>
                <label style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selected.published}
                    onChange={(e) => patchGallery({ published: e.target.checked })}
                  />
                  Опубликована
                </label>
                <label style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }} title="Водяной знак на web-версии скачивания (оригиналы — по токену, без знака)">
                  <input
                    type="checkbox"
                    checked={!!selected.watermarkEnabled}
                    onChange={(e) => patchGallery({ watermarkEnabled: e.target.checked })}
                  />
                  Водяной знак
                </label>
                {selected.watermarkEnabled && (
                  <input
                    className="adm-input"
                    style={{ width: 150, padding: "6px 9px", fontSize: 12 }}
                    placeholder="Текст знака (умолч. — название)"
                    defaultValue={selected.watermarkText ?? ""}
                    onBlur={(e) => patchGallery({ watermarkText: e.target.value.trim() || undefined })}
                  />
                )}
                <button className="gal-mini-btn ghost" onClick={exportSelection} style={{ marginLeft: "auto", padding: "8px 14px" }}>
                  Экспорт выбора
                </button>
                <button className="gal-mini-btn ghost" onClick={issueOriginalsToken} style={{ padding: "8px 14px" }} title="Ссылка на скачивание оригиналов без водяного знака">
                  Токен на оригиналы
                </button>
                <button className="gal-mini-btn" onClick={share} style={{ padding: "8px 14px" }}>
                  Поделиться
                </button>
                <button className="gal-mini-btn ghost" onClick={removeGallery} style={{ padding: "8px 14px" }}>
                  Удалить галерею
                </button>
              </div>

              {shareUrl && (
                <p className="adm-note" style={{ marginTop: 0 }}>
                  🔗 Ссылка скопирована: <code>{shareUrl}</code>
                </p>
              )}
              {selCount > 0 && (
                <p className="adm-note" style={{ marginTop: 0 }}>
                  Клиент отметил фото: <b style={{ color: "#fff" }}>{selCount}</b> (лайк/ретушь/печать).
                </p>
              )}

              {comments.length > 0 && (
                <details style={{ margin: "0 0 14px" }} open>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#8e8e8c" }}>
                    💬 Комментарии клиента ({comments.length})
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {comments.map((c) => (
                      <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#121212", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px" }}>
                        {urls[c.assetId] && (
                          <img src={urls[c.assetId]} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, color: "#8e8e8c" }}>{c.authorName || "Гость"} · {new Date(c.createdAt).toLocaleDateString("ru-RU")}</div>
                          <div style={{ fontSize: 13, color: "#f5f5f4", whiteSpace: "pre-wrap" }}>{c.text}</div>
                        </div>
                        <button
                          className="adm-pill"
                          style={{ cursor: "pointer", background: "transparent", color: "#fe2c1f", borderColor: "rgba(254,44,31,0.5)", flexShrink: 0 }}
                          onClick={() => removeComment(c)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {assets.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 14px", flexWrap: "wrap" }}>
                  <button className="gal-mini-btn ghost" style={{ padding: "8px 14px" }} disabled={!!aiBusy} onClick={runAiTags}>
                    {aiBusy === "ai" ? "Размечаю…" : "✨ AI-теги"}
                  </button>
                  <button className="gal-mini-btn ghost" style={{ padding: "8px 14px" }} disabled={!!aiBusy} onClick={runFaces}>
                    {aiBusy === "face" ? "Распознаю…" : "🙂 Распознать лица"}
                  </button>
                  <span style={{ fontSize: 11.5, color: "#8e8e8c" }}>AI-функции отключены до подключения vision/face API</span>
                </div>
              )}

              {/* Альбомы (разделы внутри галереи) */}
              <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "0 0 14px", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, color: "#8e8e8c", marginRight: 2 }}>Альбомы:</span>
                <button className="gal-chip" data-on={albumFilter === null} style={{ position: "static", background: albumFilter === null ? "#fe2c1f" : "transparent", border: "1px solid rgba(255,255,255,0.2)" }} onClick={() => setAlbumFilter(null)}>
                  Все
                </button>
                {[...albums].sort((a, b) => a.sortOrder - b.sortOrder).map((al, i, arr) => (
                  <span key={al.id} className="gal-chip" style={{ position: "static", display: "inline-flex", gap: 6, alignItems: "center", background: albumFilter === al.id ? "#fe2c1f" : "transparent", border: "1px solid rgba(255,255,255,0.2)" }}>
                    {al.coverAssetId && urls[al.coverAssetId] && (
                      <img src={urls[al.coverAssetId]} alt="" style={{ width: 18, height: 18, objectFit: "cover", borderRadius: 4 }} />
                    )}
                    <span style={{ cursor: "pointer", opacity: i === 0 ? 0.25 : 0.7 }} title="Левее" onClick={() => i > 0 && moveAlbum(al, -1)}>‹</span>
                    <span style={{ cursor: "pointer" }} onClick={() => setAlbumFilter(albumFilter === al.id ? null : al.id)}>{al.title}</span>
                    <span style={{ cursor: "pointer", opacity: i === arr.length - 1 ? 0.25 : 0.7 }} title="Правее" onClick={() => i < arr.length - 1 && moveAlbum(al, 1)}>›</span>
                    <span style={{ cursor: "pointer", opacity: 0.7 }} title="Переименовать" onClick={() => renameAlbum(al)}>✎</span>
                    <span style={{ cursor: "pointer", opacity: 0.7 }} title="Удалить" onClick={() => removeAlbum(al)}>✕</span>
                  </span>
                ))}
                <button className="gal-chip" style={{ position: "static", background: "transparent", border: "1px dashed rgba(255,255,255,0.3)" }} onClick={addAlbum}>
                  + альбом
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", gap: 8, marginBottom: 14 }}>
                <input
                  className="adm-input"
                  value={yandexUrl}
                  onChange={(event) => setYandexUrl(event.target.value)}
                  placeholder="Публичная ссылка на папку Яндекс Диска"
                  aria-label="Публичная ссылка на папку Яндекс Диска"
                />
                <button className="gal-mini-btn ghost" onClick={syncYandex} disabled={yandexBusy || !yandexUrl.trim()}>
                  {yandexBusy ? "Синхронизация…" : "Синхронизировать Диск"}
                </button>
                {yandexMessage && <span className="adm-note" style={{ gridColumn: "1 / -1", margin: 0 }}>{yandexMessage}</span>}
              </div>

              <div
                className="gal-drop"
                data-over={over}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
              >
                Перетащите фото или видео сюда или нажмите, чтобы выбрать
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>

              {uploads.length > 0 && (
                <div className="gal-prog">
                  {uploads.map((u) => (
                    <div key={u.id} className="gal-prog-row">
                      {u.name} — {u.pct}%
                      <div className="gal-prog-bar"><div className="gal-prog-fill" style={{ width: `${u.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}

              {assets.length > 0 && (
                <div className="gal-grid">
                  {(albumFilter ? assets.filter((a) => a.albumId === albumFilter) : assets).map((a) => (
                    <div key={a.id} className="gal-tile" data-cover={selected.coverAssetId === a.id}>
                      {urls[a.id] ? <img src={urls[a.id]} alt={a.filename || ""} loading="lazy" /> : null}
                      {a.type === "video" && (
                        <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "2px 7px", fontSize: 11 }}>▶ видео</span>
                      )}
                      <div className="gal-tile-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                        {albums.length > 0 && (
                          <select
                            value={a.albumId ?? ""}
                            onChange={(e) => assignAlbum(a, e.target.value)}
                            style={{ fontSize: 10.5, background: "rgba(0,0,0,0.65)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "3px 5px" }}
                          >
                            <option value="">— без альбома —</option>
                            {albums.map((al) => <option key={al.id} value={al.id}>{al.title}</option>)}
                          </select>
                        )}
                        {a.albumId && albums.some((al) => al.id === a.albumId) && (
                          <span
                            className="gal-chip"
                            style={albums.find((al) => al.id === a.albumId)?.coverAssetId === a.id ? { background: "#fe2c1f", borderColor: "#fe2c1f" } : undefined}
                            title="Обложка альбома (клик — назначить/снять)"
                            onClick={() => setAlbumCover(a.albumId!, a.id)}
                          >
                            ★ альбом
                          </span>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <span className="gal-chip" onClick={() => setCover(a.id)}>обложка</span>
                          <span className="gal-chip" onClick={() => removeAsset(a)}>✕</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {assets.length === 0 && uploads.length === 0 && (
                <p className="adm-note">В галерее пока нет фото — загрузите первые.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
