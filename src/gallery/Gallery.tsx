// Просмотр галереи клиентом (Этап C). Работает по share-ссылке /g/:token без
// регистрации. Masonry, progressive/blur, fullscreen-лайтбокс с zoom и клавишами,
// отбор фото (лайк/ретушь/печать). Отметки видит администратор.
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStore } from "../lib/store";
import { getAI } from "../lib/ai";
import { getStorage, setShareContext } from "../lib/storage";
import { getSession } from "../lib/auth";
import { downloadSingle, downloadZip } from "../lib/download";
import { fmtDuration, videoPlayback, videoPoster } from "../lib/video";
import Checkout from "./Checkout";
import type { Album, Asset, Gallery as GalleryT, PhotoComment, SelectionKind } from "../lib/types";
import { secureFetch } from "../lib/api";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const store = getStore();
const storage = getStorage();

const MARKS: { kind: SelectionKind; icon: string; label: string }[] = [
  { kind: "like", icon: "♥", label: "Нравится" },
  { kind: "retouch", icon: "✂", label: "На ретушь" },
  { kind: "print", icon: "⎙", label: "На печать" },
];

function tokenFromUrl(): string {
  // /g/<token> либо ?token=
  const m = /^\/g\/([^/?#]+)/.exec(window.location.pathname);
  if (m) return decodeURIComponent(m[1]);
  return new URLSearchParams(window.location.search).get("token") || "";
}

const selKey = (assetId: string, kind: SelectionKind) => `${assetId}:${kind}`;

const GalleryPublicLinks = () => (
  <nav className="g-public-links" aria-label="Навигация по сайту">
    <a href="/">Главная</a>
    <a href="/#all-sections">Все разделы</a>
  </nav>
);

export default function Gallery() {
  const token = tokenFromUrl();
  const session = getSession();
  const viewerKey = session ? `phone:${session.phone}` : `token:${token}`;

  const [state, setState] = useState<"loading" | "password" | "ok" | "notfound" | "expired">("loading");
  const [gallery, setGallery] = useState<GalleryT | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [full, setFull] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const [toast, setToast] = useState("");
  const [canDownload, setCanDownload] = useState(false);
  const [zipPct, setZipPct] = useState<number | null>(null);
  const [player, setPlayer] = useState<{ kind: "native" | "iframe"; src: string } | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [query, setQuery] = useState("");
  const [faceFilter, setFaceFilter] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumFilter, setAlbumFilter] = useState<string | null>(null);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [accessTicket, setAccessTicket] = useState("");

  // Доступные группы лиц (Этап I) и отфильтрованный набор для показа.
  const faceGroups = useMemo(
    () => [...new Set(assets.map((a) => a.faceGroup).filter(Boolean) as string[])].sort(),
    [assets],
  );
  const view = useMemo(() => {
    let v = getAI().search(query, assets);
    if (faceFilter) v = v.filter((a) => a.faceGroup === faceFilter);
    if (albumFilter) v = v.filter((a) => a.albumId === albumFilter);
    return v;
  }, [assets, query, faceFilter, albumFilter]);

  const open = useCallback(async (password?: string) => {
    if (!token) { setState("notfound"); return; }
    if (isSupabaseConfigured) {
      const response = await secureFetch("/api/gallery-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) {
        setAccessTicket(data.accessTicket || "");
        setShareContext(data.accessTicket || null);
        const gal = data.gallery as GalleryT;
        const list = data.assets as Asset[];
        setGallery(gal);
        setAssets(list);
        setAlbums(data.albums || []);
        setSel(new Set((data.selections || []).map((s: any) => selKey(s.asset_id, s.kind))));
        setComments((data.comments || []).map((c: any) => ({ id: c.id, galleryId: c.gallery_id, assetId: c.asset_id, viewerKey: c.viewer_key, authorName: c.author_name, text: c.text, createdAt: c.created_at })));
        const map: Record<string, string> = {};
        await Promise.all(list.map(async (a) => { map[a.id] = a.type === "video" ? await videoPoster(a) : a.thumbUrl || (await storage.url(a.storageKey)); }));
        setUrls(map);
        setCanDownload(Boolean(data.canDownload) && gal.downloadPolicy !== "none");
        setState("ok");
        return;
      }
      if (data.reason === "password") { setState("password"); if (password) setPwdErr("Неверный пароль"); }
      else setState("notfound");
      return;
    }
    const res = await store.resolveShareToken(token, password);
    if (res.ok && res.gallery) {
      const gal = res.gallery;
      setGallery(gal);
      const list = await store.listAssets(gal.id);
      setAssets(list);
      const map: Record<string, string> = {};
      await Promise.all(list.map(async (a) => {
        map[a.id] = a.type === "video" ? await videoPoster(a) : a.thumbUrl || (await storage.url(a.storageKey));
      }));
      setUrls(map);
      const mine = await store.listSelectionsByViewer(gal.id, viewerKey);
      setSel(new Set(mine.map((s) => selKey(s.assetId, s.kind))));
      setCanDownload(Boolean(res.canDownload) && gal.downloadPolicy !== "none");
      try { setComments(await store.listComments(gal.id)); } catch { /* комментарии не критичны */ }
      try { setAlbums(await store.listAlbums(gal.id)); } catch { /* альбомы не критичны */ }
      setState("ok");
      return;
    }
    if (res.reason === "password") { setState("password"); if (password) setPwdErr("Неверный пароль"); }
    else setState(res.reason === "expired" ? "expired" : "notfound");
  }, [token, viewerKey]);

  useEffect(() => { open(); }, [open]);

  // Сброс лайтбокса при смене фильтра/поиска (индексы меняются).
  useEffect(() => { setLightbox(null); }, [query, faceFilter, albumFilter]);

  // Лениво: полноразмерное фото или источник плеера для видео.
  useEffect(() => {
    setCommentText(""); // не переносим черновик между кадрами
    if (lightbox === null) { setPlayer(null); return; }
    const a = view[lightbox];
    if (!a) return;
    if (a.type === "video") {
      setPlayer(null);
      videoPlayback(a).then(setPlayer);
    } else {
      setPlayer(null);
      if (!full[a.id]) storage.url(a.storageKey).then((u) => setFull((m) => ({ ...m, [a.id]: u })));
    }
  }, [lightbox, view, full]);

  // Клавиши в лайтбоксе.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : Math.min(view.length - 1, i + 1)));
      else if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, view.length]);

  const toggle = async (asset: Asset, kind: SelectionKind) => {
    if (!gallery) return;
    const k = selKey(asset.id, kind);
    setSel((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
    const { on } = isSupabaseConfigured
      ? await secureFetch("/api/gallery-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", accessTicket, galleryId: gallery.id, assetId: asset.id, kind }) }).then((response) => response.json())
      : await store.toggleSelection({ galleryId: gallery.id, assetId: asset.id, kind, viewerKey });
    const label = MARKS.find((m) => m.kind === kind)?.label ?? "";
    setToast(on ? `Отмечено: ${label.toLowerCase()}` : "Отметка снята");
    window.clearTimeout((toggle as any)._t);
    (toggle as any)._t = window.setTimeout(() => setToast(""), 1600);
  };

  // Комментарий клиента/гостя к конкретному фото (виден администратору).
  const addComment = async (asset: Asset) => {
    const text = commentText.trim();
    if (!gallery || !text || commentBusy) return;
    setCommentBusy(true);
    try {
      const c = isSupabaseConfigured
        ? await secureFetch("/api/gallery-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", accessTicket, galleryId: gallery.id, assetId: asset.id, authorName: session?.name, text }) }).then(async (response) => {
          const data = await response.json(); const row = data.comment;
          return { id: row.id, galleryId: row.gallery_id, assetId: row.asset_id, viewerKey: row.viewer_key, authorName: row.author_name, text: row.text, createdAt: row.created_at };
        })
        : await store.addComment({ galleryId: gallery.id, assetId: asset.id, viewerKey, clientPhone: session?.phone, authorName: session?.name, text });
      setComments((list) => [...list, c]);
      setCommentText("");
    } finally {
      setCommentBusy(false);
    }
  };

  // Удалить можно только свой комментарий (по viewerKey).
  const removeComment = async (c: PhotoComment) => {
    if (isSupabaseConfigured) await secureFetch("/api/gallery-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-comment", accessTicket, galleryId: c.galleryId, assetId: c.assetId, commentId: c.id }) });
    else { if (c.viewerKey !== viewerKey) return; await store.deleteComment(c.id); }
    setComments((list) => list.filter((x) => x.id !== c.id));
  };

  if (state === "loading") return <><GalleryPublicLinks /><div className="g-center"><p>Загрузка…</p></div></>;
  if (state === "notfound") return <><GalleryPublicLinks /><div className="g-center"><h2>Галерея не найдена</h2><p>Проверьте ссылку — возможно, она устарела.</p></div></>;
  if (state === "expired") return <><GalleryPublicLinks /><div className="g-center"><h2>Срок ссылки истёк</h2><p>Запросите новую ссылку у фотографа.</p></div></>;
  if (state === "password") {
    return (
      <>
        <GalleryPublicLinks />
        <div className="g-center">
          <h2>Галерея защищена паролем</h2>
          <p>Введите пароль, который дал фотограф.</p>
          <input className="g-input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && open(pwd)} autoFocus />
          <button className="g-btn" onClick={() => open(pwd)}>Открыть</button>
          {pwdErr && <p style={{ color: "#ff6b5e" }}>{pwdErr}</p>}
        </div>
      </>
    );
  }

  const policy = gallery?.downloadPolicy ?? "web";
  // Водяной знак — только на web-версии (policy 'web') и если включён в галерее.
  // Оригиналы выдаются по DownloadToken через /api/download без знака.
  const watermark =
    policy === "web" && gallery?.watermarkEnabled
      ? { text: gallery.watermarkText || gallery.title }
      : undefined;
  const selectedAssets = () => assets.filter((a) => MARKS.some((m) => sel.has(selKey(a.id, m.kind))));
  const selectedCount = selectedAssets().length;
  const retouchCount = assets.filter((a) => sel.has(selKey(a.id, "retouch"))).length;
  const printCount = assets.filter((a) => sel.has(selKey(a.id, "print"))).length;

  const runZip = async (list: Asset[], suffix: string) => {
    if (!gallery || list.length === 0 || zipPct !== null) return;
    setZipPct(0);
    try {
      await downloadZip(list, policy, gallery.title + suffix, (d, t) => setZipPct(Math.round((d / t) * 100)), watermark);
    } finally {
      setZipPct(null);
    }
  };

  // Скачивание использует тот же короткоживущий ticket, что и просмотр файла.
  const downloadOne = (asset: Asset, index: number) => {
    downloadSingle(asset, policy, index, watermark);
  };

  const lbAsset = lightbox !== null ? view[lightbox] : null;

  // Одна ячейка masonry (фото/видео + панель отметок). Индекс — позиция в view.
  const renderCell = (a: Asset, i: number) => (
    <div className="g-cell" key={a.id}>
      <img src={urls[a.id]} alt="" loading="lazy" onClick={() => { setZoom(false); setLightbox(i); }} />
      {a.type === "video" && (
        <span style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "3px 8px", fontSize: 11, pointerEvents: "none" }}>
          ▶ {fmtDuration(a.durationSec) || "видео"}
        </span>
      )}
      <div className="g-cell-bar">
        {MARKS.map((m) => (
          <div
            key={m.kind}
            className="g-mark"
            data-on={sel.has(selKey(a.id, m.kind))}
            title={m.label}
            onClick={(e) => { e.stopPropagation(); toggle(a, m.kind); }}
          >
            {m.icon}
          </div>
        ))}
      </div>
    </div>
  );

  // Секции по альбомам: только когда есть альбомы и не активны поиск/фильтры
  // (иначе индексы/порядок ломаются). Альбомы по sortOrder, «Без альбома» — в конец.
  const sections = (() => {
    if (albums.length === 0 || albumFilter || query.trim() || faceFilter) return null;
    const byId = new Map<string, { album: Album | null; items: { a: Asset; i: number }[] }>();
    const noneKey = "__none__";
    const ordered = [...albums].sort((x, y) => x.sortOrder - y.sortOrder);
    ordered.forEach((al) => byId.set(al.id, { album: al, items: [] }));
    byId.set(noneKey, { album: null, items: [] });
    view.forEach((a, i) => {
      const key = a.albumId && byId.has(a.albumId) ? a.albumId : noneKey;
      byId.get(key)!.items.push({ a, i });
    });
    const result = [...ordered.map((al) => byId.get(al.id)!), byId.get(noneKey)!];
    return result.filter((s) => s.items.length > 0);
  })();

  return (
    <>
      <div className="g-top">
        <div>
          <div className="g-title">{gallery?.title}</div>
          <div className="g-sub">
            {assets.length} фото{gallery?.shootDate ? ` · ${gallery.shootDate}` : ""}
            {sel.size > 0 ? ` · выбрано отметок: ${sel.size}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="g-lb-btn" onClick={() => setShowCheckout(true)}>🛒 Заказать</button>
          {canDownload && (
            <>
              {selectedCount > 0 && (
                <button className="g-lb-btn" disabled={zipPct !== null} onClick={() => runZip(selectedAssets(), "-выбранные")}>
                  ⬇ Выбранные ({selectedCount})
                </button>
              )}
              <button className="g-lb-btn" data-on="true" disabled={zipPct !== null} onClick={() => runZip(assets, "")}>
                {zipPct !== null ? `Архивирую… ${zipPct}%` : "⬇ Скачать всё (ZIP)"}
              </button>
            </>
          )}
          <a className="g-lb-btn" href="/#all-sections">Разделы</a>
          <a className="g-logo" href="/">YELYG<span>I</span>NN</a>
        </div>
      </div>

      <div className="g-wrap">
        <div className="g-legend" style={{ marginBottom: 16 }}>
          <span>Наведите на фото и отметьте: {MARKS.map((m) => <span key={m.kind}><b>{m.icon}</b> {m.label}. </span>)}</span>
        </div>

        {/* Поиск по тегам (AI) + фильтр по людям (распознавание лиц) */}
        {assets.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <input
              className="g-input"
              style={{ width: "min(280px, 60vw)" }}
              placeholder="Поиск по тегам…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {albums.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="g-mark" data-on={albumFilter === null} onClick={() => setAlbumFilter(null)} style={{ width: "auto", padding: "0 12px", fontSize: 12 }}>Все альбомы</span>
                {albums.map((al) => (
                  <span key={al.id} className="g-mark" data-on={albumFilter === al.id} onClick={() => setAlbumFilter(albumFilter === al.id ? null : al.id)} style={{ width: "auto", padding: "0 12px", fontSize: 12 }}>{al.title}</span>
                ))}
              </div>
            )}
            {faceGroups.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="g-mark" data-on={faceFilter === null} onClick={() => setFaceFilter(null)} style={{ width: "auto", padding: "0 12px", fontSize: 12 }}>Все</span>
                {faceGroups.map((g) => (
                  <span key={g} className="g-mark" data-on={faceFilter === g} onClick={() => setFaceFilter(faceFilter === g ? null : g)} style={{ width: "auto", padding: "0 12px", fontSize: 12 }}>{g}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {assets.length === 0 ? (
          <div className="g-center"><p>В галерее пока нет фото.</p></div>
        ) : view.length === 0 ? (
          <div className="g-center"><p>Ничего не найдено по фильтру.</p></div>
        ) : sections ? (
          // Группировка по альбомам (заголовки + обложки), индексы остаются в порядке view.
          sections.map((s) => (
            <div key={s.album?.id ?? "none"} style={{ marginBottom: 30 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px" }}>
                {s.album?.coverAssetId && urls[s.album.coverAssetId] && (
                  <img src={urls[s.album.coverAssetId]} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} />
                )}
                <h2 style={{ fontSize: "clamp(16px, 2.4vw, 22px)", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  {s.album?.title ?? "Без альбома"}
                </h2>
                <span style={{ fontSize: 12, color: "var(--gray)" }}>{s.items.length}</span>
              </div>
              <div className="g-masonry">
                {s.items.map(({ a, i }) => renderCell(a, i))}
              </div>
            </div>
          ))
        ) : (
          <div className="g-masonry">
            {view.map((a, i) => renderCell(a, i))}
          </div>
        )}
      </div>

      {lbAsset && (
        <div className="g-lb" onClick={() => setLightbox(null)}>
          <span className="g-lb-close" onClick={() => setLightbox(null)}>✕</span>
          {lightbox! > 0 && (
            <span className="g-lb-nav g-lb-prev" onClick={(e) => { e.stopPropagation(); setZoom(false); setLightbox(lightbox! - 1); }}>‹</span>
          )}
          {lightbox! < view.length - 1 && (
            <span className="g-lb-nav g-lb-next" onClick={(e) => { e.stopPropagation(); setZoom(false); setLightbox(lightbox! + 1); }}>›</span>
          )}
          {lbAsset.type === "video" ? (
            !player ? (
              <p style={{ color: "#fff" }}>Загрузка видео…</p>
            ) : player.kind === "iframe" ? (
              <iframe
                src={player.src}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                style={{ width: "90vw", height: "80vh", border: 0, borderRadius: 8 }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video
                src={player.src}
                controls
                autoPlay
                style={{ maxWidth: "94vw", maxHeight: "86vh" }}
                onClick={(e) => e.stopPropagation()}
              />
            )
          ) : (
            <img
              className={zoom ? "zoom" : ""}
              src={full[lbAsset.id] || urls[lbAsset.id]}
              alt=""
              onClick={(e) => { e.stopPropagation(); setZoom((z) => !z); }}
            />
          )}
          <div className="g-lb-bar" onClick={(e) => e.stopPropagation()}>
            {MARKS.map((m) => (
              <button
                key={m.kind}
                className="g-lb-btn"
                data-on={sel.has(selKey(lbAsset.id, m.kind))}
                onClick={() => toggle(lbAsset, m.kind)}
              >
                {m.icon} {m.label}
              </button>
            ))}
            {canDownload && (
              <button className="g-lb-btn" onClick={() => downloadOne(lbAsset, lightbox ?? 0)}>
                ⬇ {policy === "original" ? "Оригинал" : "Скачать"}
              </button>
            )}
          </div>

          {/* Комментарии к фото (видны администратору) */}
          {(() => {
            const lbComments = comments.filter((c) => c.assetId === lbAsset.id);
            return (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute", top: 18, right: 18, width: "min(320px, 86vw)",
                  maxHeight: "70vh", display: "flex", flexDirection: "column", gap: 8,
                  background: "rgba(18,18,18,0.92)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14, padding: 14, backdropFilter: "blur(10px)",
                }}
              >
                <div style={{ fontSize: 12.5, color: "#8e8e8c", letterSpacing: "0.02em" }}>
                  Комментарии {lbComments.length > 0 ? `· ${lbComments.length}` : ""}
                </div>
                <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, maxHeight: "44vh" }}>
                  {lbComments.length === 0 && (
                    <div style={{ fontSize: 12.5, color: "#6f6f6d" }}>Пока нет. Оставьте пожелание к этому кадру.</div>
                  )}
                  {lbComments.map((c) => (
                    <div key={c.id} style={{ fontSize: 13, lineHeight: 1.45 }}>
                      <span style={{ color: "#8e8e8c", fontSize: 11.5 }}>{c.authorName || "Гость"}</span>
                      <div style={{ color: "#f5f5f4", whiteSpace: "pre-wrap" }}>
                        {c.text}
                        {c.viewerKey === viewerKey && (
                          <button
                            onClick={() => removeComment(c)}
                            title="Удалить"
                            style={{ marginLeft: 8, background: "none", border: "none", color: "#fe2c1f", cursor: "pointer", fontSize: 12 }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="g-input"
                    style={{ width: "100%", fontSize: 13, padding: "9px 11px" }}
                    placeholder="Ваш комментарий…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addComment(lbAsset); }}
                  />
                  <button
                    className="g-lb-btn"
                    style={{ flexShrink: 0 }}
                    disabled={commentBusy || !commentText.trim()}
                    onClick={() => addComment(lbAsset)}
                  >
                    →
                  </button>
                </div>
                <div style={{ fontSize: 10.5, lineHeight: 1.4, color: "#8e8e8c" }}>
                  Комментарий сохраняется для работы над этой галереей. <a href="/privacy-policy" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>Обработка данных</a> · <a href="/gallery-terms" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>условия галереи</a>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {toast && <div className="g-toast">{toast}</div>}

      {showCheckout && gallery && (
        <Checkout
          galleryId={gallery.id}
          retouchCount={retouchCount}
          printCount={printCount}
          defaultName={session?.name}
          defaultPhone={session?.phone}
          onClose={() => setShowCheckout(false)}
          onPaid={() => setToast("Заказ оформлен — спасибо!")}
        />
      )}
    </>
  );
}
