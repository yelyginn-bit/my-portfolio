// Слой доступа к данным. Интерфейс async — чтобы LocalDataStore (сейчас)
// и будущий SupabaseDataStore (Фаза 3) были взаимозаменяемы без правок UI.
//
// completedOrders НЕ хранится отдельным счётчиком, а выводится из завершённых заказов.
// Это исключает двойное начисление и рассинхрон.
import type { AdminAction, Album, Asset, BlogPost, Client, DownloadToken, Gallery, Lead, Notification, NotificationStatus, Order, OrderItem, PhotoComment, PortfolioCase, PriceRule, Review, Selection, SelectionKind, ShareLink, ShareResolution, ShopOrder } from "./types";
import { isSupabaseConfigured } from "./supabaseClient";
import { SupabaseDataStore } from "./supabaseStore";
import { secureToken } from "./secureRandom";

export interface DataStore {
  // Клиенты
  getClientByPhone(phone: string): Promise<Client | null>;
  upsertClient(input: { phone: string; name?: string }): Promise<Client>;
  listClients(): Promise<Client[]>;

  // Заказы
  createOrder(
    input: Omit<Order, "id" | "createdAt" | "status"> & { status?: Order["status"] },
  ): Promise<Order>;
  listOrdersByPhone(phone: string): Promise<Order[]>;
  listOrders(): Promise<Order[]>;

  // Заявки
  createLead(input: Omit<Lead, "id" | "createdAt">): Promise<Lead>;
  listLeads(): Promise<Lead[]>;

  /** Число завершённых (не отменённых) заказов клиента — основа скидки. */
  completedOrderCount(phone: string): Promise<number>;

  // Галереи (Этап B)
  createGallery(input: Partial<Gallery> & { title: string }): Promise<Gallery>;
  listGalleries(): Promise<Gallery[]>;
  getGallery(id: string): Promise<Gallery | null>;
  updateGallery(id: string, patch: Partial<Gallery>): Promise<Gallery>;
  deleteGallery(id: string): Promise<void>;

  // Ассеты (фото/видео)
  addAsset(input: Omit<Asset, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number }): Promise<Asset>;
  listAssets(galleryId: string): Promise<Asset[]>;
  updateAsset(id: string, patch: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: string): Promise<void>;

  // Шаринг и отбор (Этап C)
  createShareLink(
    galleryId: string,
    opts?: { password?: string; canDownload?: boolean; expiresAt?: string },
  ): Promise<ShareLink>;
  listShareLinks(galleryId: string): Promise<ShareLink[]>;
  resolveShareToken(token: string, password?: string): Promise<ShareResolution>;
  toggleSelection(input: {
    galleryId: string;
    assetId: string;
    kind: SelectionKind;
    viewerKey: string;
  }): Promise<{ on: boolean }>;
  listSelectionsByViewer(galleryId: string, viewerKey: string): Promise<Selection[]>;
  listSelections(galleryId: string): Promise<Selection[]>;

  // Магазин (Этап F)
  createShopOrder(input: {
    clientPhone?: string;
    contactName?: string;
    contact?: string;
    galleryId?: string;
    items: OrderItem[];
  }): Promise<ShopOrder>;
  listShopOrders(): Promise<ShopOrder[]>;
  getShopOrder(id: string): Promise<ShopOrder | null>;
  markShopOrderPaid(id: string, info: { provider: string; paymentId: string }): Promise<void>;

  // Отзывы (Этап G)
  createReview(input: Omit<Review, "id" | "createdAt">): Promise<Review>;
  listReviews(opts?: { publishedOnly?: boolean }): Promise<Review[]>;
  updateReview(id: string, patch: Partial<Review>): Promise<Review>;
  deleteReview(id: string): Promise<void>;

  // Настройки (KV; например, переопределение скидок, реквизиты студии)
  getSetting<T = unknown>(key: string): Promise<T | null>;
  setSetting<T = unknown>(key: string, value: T): Promise<void>;

  // Портфолио-кейсы (Этап H)
  createCase(input: Omit<PortfolioCase, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number }): Promise<PortfolioCase>;
  listCases(opts?: { publishedOnly?: boolean }): Promise<PortfolioCase[]>;
  getCase(idOrSlug: string): Promise<PortfolioCase | null>;
  updateCase(id: string, patch: Partial<PortfolioCase>): Promise<PortfolioCase>;
  deleteCase(id: string): Promise<void>;

  // Блог (Этап H)
  createPost(input: Omit<BlogPost, "id" | "createdAt">): Promise<BlogPost>;
  listPosts(opts?: { publishedOnly?: boolean }): Promise<BlogPost[]>;
  getPostBySlug(slug: string): Promise<BlogPost | null>;
  updatePost(id: string, patch: Partial<BlogPost>): Promise<BlogPost>;
  deletePost(id: string): Promise<void>;

  // ── Сущности v2 ──
  // Альбомы
  createAlbum(input: Omit<Album, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number }): Promise<Album>;
  listAlbums(galleryId: string): Promise<Album[]>;
  updateAlbum(id: string, patch: Partial<Album>): Promise<Album>;
  deleteAlbum(id: string): Promise<void>;
  // Комментарии к фото
  addComment(input: Omit<PhotoComment, "id" | "createdAt">): Promise<PhotoComment>;
  listComments(galleryId: string): Promise<PhotoComment[]>;
  deleteComment(id: string): Promise<void>;
  // Download-токены
  createDownloadToken(input: Omit<DownloadToken, "id" | "createdAt" | "usedCount" | "token"> & { token?: string }): Promise<DownloadToken>;
  getDownloadToken(token: string): Promise<DownloadToken | null>;
  consumeDownloadToken(id: string): Promise<void>;
  // Уведомления
  createNotification(input: Omit<Notification, "id" | "createdAt" | "status"> & { status?: NotificationStatus }): Promise<Notification>;
  listNotifications(): Promise<Notification[]>;
  updateNotificationStatus(id: string, status: NotificationStatus, error?: string): Promise<void>;
  // Audit
  logAdminAction(input: Omit<AdminAction, "id" | "createdAt">): Promise<AdminAction>;
  listAdminActions(): Promise<AdminAction[]>;
  // Прайс-правила
  listPriceRules(opts?: { activeOnly?: boolean }): Promise<PriceRule[]>;
  createPriceRule(input: Omit<PriceRule, "id">): Promise<PriceRule>;
  updatePriceRule(id: string, patch: Partial<PriceRule>): Promise<PriceRule>;
  deletePriceRule(id: string): Promise<void>;
}

/** Нормализует телефон РФ к виду 7XXXXXXXXXX (только цифры). */
export function normalizePhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 10) digits = "7" + digits;
  return digits;
}

/** Валиден ли РФ-номер (7 + 10 цифр). */
export function isValidPhone(raw: string): boolean {
  return /^7\d{10}$/.test(normalizePhone(raw));
}

function genId(prefix: string): string {
  return `${prefix}_${secureToken(12)}`;
}

// ─── LocalStorage реализация ─────────────────────────────────────────────────

const KEYS = {
  clients: "yel_clients_v1",
  orders: "yel_orders_v1",
  leads: "yel_leads_v1",
  galleries: "yel_galleries_v1",
  assets: "yel_assets_v1",
  shareLinks: "yel_sharelinks_v1",
  selections: "yel_selections_v1",
  shopOrders: "yel_shop_orders_v1",
  reviews: "yel_reviews_v1",
  settings: "yel_settings_v1",
  cases: "yel_cases_v1",
  posts: "yel_posts_v1",
  albums: "yel_albums_v1",
  comments: "yel_comments_v1",
  dlTokens: "yel_dltokens_v1",
  notifications: "yel_notifications_v1",
  adminActions: "yel_admin_actions_v1",
  priceRules: "yel_price_rules_v1",
} as const;

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export class LocalDataStore implements DataStore {
  async getClientByPhone(phone: string): Promise<Client | null> {
    const p = normalizePhone(phone);
    const found = read<Client>(KEYS.clients).find((c) => c.phone === p);
    if (!found) return null;
    return { ...found, completedOrders: await this.completedOrderCount(p) };
  }

  async upsertClient(input: { phone: string; name?: string }): Promise<Client> {
    const p = normalizePhone(input.phone);
    const clients = read<Client>(KEYS.clients);
    let client = clients.find((c) => c.phone === p);
    if (client) {
      if (input.name) client.name = input.name;
    } else {
      client = {
        id: genId("cl"),
        phone: p,
        name: input.name,
        createdAt: new Date().toISOString(),
        completedOrders: 0,
      };
      clients.push(client);
    }
    write(KEYS.clients, clients);
    return { ...client, completedOrders: await this.completedOrderCount(p) };
  }

  async createOrder(
    input: Omit<Order, "id" | "createdAt" | "status"> & { status?: Order["status"] },
  ): Promise<Order> {
    const orders = read<Order>(KEYS.orders);
    const order: Order = {
      ...input,
      id: genId("ord"),
      createdAt: new Date().toISOString(),
      status: input.status ?? "new",
    };
    orders.push(order);
    write(KEYS.orders, orders);
    return order;
  }

  async listOrdersByPhone(phone: string): Promise<Order[]> {
    const p = normalizePhone(phone);
    return read<Order>(KEYS.orders)
      .filter((o) => o.clientPhone && normalizePhone(o.clientPhone) === p)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listClients(): Promise<Client[]> {
    const clients = read<Client>(KEYS.clients);
    // Подставляем актуальное число завершённых заказов каждому клиенту.
    return Promise.all(
      clients.map(async (c) => ({
        ...c,
        completedOrders: await this.completedOrderCount(c.phone),
      })),
    );
  }

  async listOrders(): Promise<Order[]> {
    return read<Order>(KEYS.orders).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async createLead(input: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
    const leads = read<Lead>(KEYS.leads);
    const lead: Lead = {
      ...input,
      id: genId("lead"),
      createdAt: new Date().toISOString(),
    };
    leads.push(lead);
    write(KEYS.leads, leads);
    return lead;
  }

  async listLeads(): Promise<Lead[]> {
    return read<Lead>(KEYS.leads).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async completedOrderCount(phone: string): Promise<number> {
    const p = normalizePhone(phone);
    return read<Order>(KEYS.orders).filter(
      (o) => o.clientPhone && normalizePhone(o.clientPhone) === p && o.status === "done",
    ).length;
  }

  // ─── Галереи ────────────────────────────────────────────────────────────
  async createGallery(input: Partial<Gallery> & { title: string }): Promise<Gallery> {
    const galleries = read<Gallery>(KEYS.galleries);
    const gallery: Gallery = {
      id: genId("gal"),
      title: input.title,
      slug: input.slug,
      description: input.description,
      shootDate: input.shootDate,
      coverAssetId: input.coverAssetId,
      visibility: input.visibility ?? "private",
      downloadPolicy: input.downloadPolicy ?? "web",
      published: input.published ?? false,
      createdAt: new Date().toISOString(),
      clientPhone: input.clientPhone ? normalizePhone(input.clientPhone) : undefined,
    };
    galleries.push(gallery);
    write(KEYS.galleries, galleries);
    return gallery;
  }

  async listGalleries(): Promise<Gallery[]> {
    return read<Gallery>(KEYS.galleries).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getGallery(id: string): Promise<Gallery | null> {
    return read<Gallery>(KEYS.galleries).find((g) => g.id === id) ?? null;
  }

  async updateGallery(id: string, patch: Partial<Gallery>): Promise<Gallery> {
    const galleries = read<Gallery>(KEYS.galleries);
    const idx = galleries.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error("Галерея не найдена");
    galleries[idx] = { ...galleries[idx], ...patch, id };
    write(KEYS.galleries, galleries);
    return galleries[idx];
  }

  async deleteGallery(id: string): Promise<void> {
    write(KEYS.galleries, read<Gallery>(KEYS.galleries).filter((g) => g.id !== id));
    write(KEYS.assets, read<Asset>(KEYS.assets).filter((a) => a.galleryId !== id));
  }

  // ─── Ассеты ─────────────────────────────────────────────────────────────
  async addAsset(
    input: Omit<Asset, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number },
  ): Promise<Asset> {
    const assets = read<Asset>(KEYS.assets);
    const inGallery = assets.filter((a) => a.galleryId === input.galleryId).length;
    const asset: Asset = {
      ...input,
      id: genId("ast"),
      sortOrder: input.sortOrder ?? inGallery,
      createdAt: new Date().toISOString(),
    };
    assets.push(asset);
    write(KEYS.assets, assets);
    return asset;
  }

  async listAssets(galleryId: string): Promise<Asset[]> {
    return read<Asset>(KEYS.assets)
      .filter((a) => a.galleryId === galleryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async updateAsset(id: string, patch: Partial<Asset>): Promise<Asset> {
    const assets = read<Asset>(KEYS.assets);
    const idx = assets.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Ассет не найден");
    assets[idx] = { ...assets[idx], ...patch, id };
    write(KEYS.assets, assets);
    return assets[idx];
  }

  async deleteAsset(id: string): Promise<void> {
    write(KEYS.assets, read<Asset>(KEYS.assets).filter((a) => a.id !== id));
  }

  // ─── Шаринг ─────────────────────────────────────────────────────────────
  async createShareLink(
    galleryId: string,
    opts?: { password?: string; canDownload?: boolean; expiresAt?: string },
  ): Promise<ShareLink> {
    const links = read<ShareLink>(KEYS.shareLinks);
    const link: ShareLink = {
      id: genId("shl"),
      galleryId,
      token: genId("t").replace("t_", ""),
      password: opts?.password || undefined,
      canDownload: opts?.canDownload ?? false,
      expiresAt: opts?.expiresAt,
      createdAt: new Date().toISOString(),
    };
    links.push(link);
    write(KEYS.shareLinks, links);
    return link;
  }

  async listShareLinks(galleryId: string): Promise<ShareLink[]> {
    return read<ShareLink>(KEYS.shareLinks).filter((l) => l.galleryId === galleryId);
  }

  async resolveShareToken(token: string, password?: string): Promise<ShareResolution> {
    const link = read<ShareLink>(KEYS.shareLinks).find((l) => l.token === token);
    if (!link) return { ok: false, reason: "notfound" };
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now())
      return { ok: false, reason: "expired" };
    if (link.password && link.password !== password) return { ok: false, reason: "password" };
    const gallery = await this.getGallery(link.galleryId);
    if (!gallery) return { ok: false, reason: "notfound" };
    return { ok: true, gallery, canDownload: link.canDownload };
  }

  // ─── Отбор ──────────────────────────────────────────────────────────────
  async toggleSelection(input: {
    galleryId: string;
    assetId: string;
    kind: SelectionKind;
    viewerKey: string;
  }): Promise<{ on: boolean }> {
    const all = read<Selection>(KEYS.selections);
    const idx = all.findIndex(
      (s) => s.assetId === input.assetId && s.viewerKey === input.viewerKey && s.kind === input.kind,
    );
    if (idx !== -1) {
      all.splice(idx, 1);
      write(KEYS.selections, all);
      return { on: false };
    }
    all.push({
      id: genId("sel"),
      galleryId: input.galleryId,
      assetId: input.assetId,
      kind: input.kind,
      viewerKey: input.viewerKey,
      createdAt: new Date().toISOString(),
    });
    write(KEYS.selections, all);
    return { on: true };
  }

  async listSelectionsByViewer(galleryId: string, viewerKey: string): Promise<Selection[]> {
    return read<Selection>(KEYS.selections).filter(
      (s) => s.galleryId === galleryId && s.viewerKey === viewerKey,
    );
  }

  async listSelections(galleryId: string): Promise<Selection[]> {
    return read<Selection>(KEYS.selections).filter((s) => s.galleryId === galleryId);
  }

  // ─── Магазин ────────────────────────────────────────────────────────────
  async createShopOrder(input: {
    clientPhone?: string;
    contactName?: string;
    contact?: string;
    galleryId?: string;
    items: OrderItem[];
  }): Promise<ShopOrder> {
    const orders = read<ShopOrder>(KEYS.shopOrders);
    const total = input.items.reduce((s, i) => s + i.total, 0);
    const order: ShopOrder = {
      id: genId("shop"),
      createdAt: new Date().toISOString(),
      status: "pending",
      clientPhone: input.clientPhone ? normalizePhone(input.clientPhone) : undefined,
      contactName: input.contactName,
      contact: input.contact,
      galleryId: input.galleryId,
      items: input.items,
      total,
    };
    orders.push(order);
    write(KEYS.shopOrders, orders);
    return order;
  }

  async listShopOrders(): Promise<ShopOrder[]> {
    return read<ShopOrder>(KEYS.shopOrders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getShopOrder(id: string): Promise<ShopOrder | null> {
    return read<ShopOrder>(KEYS.shopOrders).find((o) => o.id === id) ?? null;
  }

  async markShopOrderPaid(id: string, info: { provider: string; paymentId: string }): Promise<void> {
    const orders = read<ShopOrder>(KEYS.shopOrders);
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return;
    orders[idx] = {
      ...orders[idx],
      status: "paid",
      paymentProvider: info.provider,
      paymentId: info.paymentId,
      paidAt: new Date().toISOString(),
    };
    write(KEYS.shopOrders, orders);
  }

  // ─── Отзывы ─────────────────────────────────────────────────────────────
  async createReview(input: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const reviews = read<Review>(KEYS.reviews);
    const review: Review = {
      ...input,
      clientPhone: input.clientPhone ? normalizePhone(input.clientPhone) : undefined,
      id: genId("rev"),
      createdAt: new Date().toISOString(),
    };
    reviews.push(review);
    write(KEYS.reviews, reviews);
    return review;
  }

  async listReviews(opts?: { publishedOnly?: boolean }): Promise<Review[]> {
    let list = read<Review>(KEYS.reviews).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (opts?.publishedOnly) list = list.filter((r) => r.published);
    return list;
  }

  async updateReview(id: string, patch: Partial<Review>): Promise<Review> {
    const reviews = read<Review>(KEYS.reviews);
    const idx = reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Отзыв не найден");
    reviews[idx] = { ...reviews[idx], ...patch, id };
    write(KEYS.reviews, reviews);
    return reviews[idx];
  }

  async deleteReview(id: string): Promise<void> {
    write(KEYS.reviews, read<Review>(KEYS.reviews).filter((r) => r.id !== id));
  }

  // ─── Настройки (KV) ───────────────────────────────────────────────────────
  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const all = read<{ key: string; value: T }>(KEYS.settings);
    return all.find((s) => s.key === key)?.value ?? null;
  }

  async setSetting<T = unknown>(key: string, value: T): Promise<void> {
    const all = read<{ key: string; value: unknown }>(KEYS.settings);
    const idx = all.findIndex((s) => s.key === key);
    if (idx === -1) all.push({ key, value });
    else all[idx] = { key, value };
    write(KEYS.settings, all);
  }

  // ─── Портфолио-кейсы ──────────────────────────────────────────────────────
  async createCase(
    input: Omit<PortfolioCase, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number },
  ): Promise<PortfolioCase> {
    const cases = read<PortfolioCase>(KEYS.cases);
    const item: PortfolioCase = {
      ...input,
      id: genId("case"),
      sortOrder: input.sortOrder ?? cases.length,
      createdAt: new Date().toISOString(),
    };
    cases.push(item);
    write(KEYS.cases, cases);
    return item;
  }

  async listCases(opts?: { publishedOnly?: boolean }): Promise<PortfolioCase[]> {
    let list = read<PortfolioCase>(KEYS.cases).sort((a, b) => a.sortOrder - b.sortOrder);
    if (opts?.publishedOnly) list = list.filter((c) => c.published);
    return list;
  }

  async getCase(idOrSlug: string): Promise<PortfolioCase | null> {
    return read<PortfolioCase>(KEYS.cases).find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }

  async updateCase(id: string, patch: Partial<PortfolioCase>): Promise<PortfolioCase> {
    const cases = read<PortfolioCase>(KEYS.cases);
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Кейс не найден");
    cases[idx] = { ...cases[idx], ...patch, id };
    write(KEYS.cases, cases);
    return cases[idx];
  }

  async deleteCase(id: string): Promise<void> {
    write(KEYS.cases, read<PortfolioCase>(KEYS.cases).filter((c) => c.id !== id));
  }

  // ─── Блог ─────────────────────────────────────────────────────────────────
  async createPost(input: Omit<BlogPost, "id" | "createdAt">): Promise<BlogPost> {
    const posts = read<BlogPost>(KEYS.posts);
    const post: BlogPost = {
      ...input,
      tags: input.tags ?? [],
      id: genId("post"),
      createdAt: new Date().toISOString(),
      publishedAt: input.published ? input.publishedAt ?? new Date().toISOString() : input.publishedAt,
    };
    posts.push(post);
    write(KEYS.posts, posts);
    return post;
  }

  async listPosts(opts?: { publishedOnly?: boolean }): Promise<BlogPost[]> {
    let list = read<BlogPost>(KEYS.posts).sort((a, b) =>
      (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt),
    );
    if (opts?.publishedOnly) list = list.filter((p) => p.published);
    return list;
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    return read<BlogPost>(KEYS.posts).find((p) => p.slug === slug) ?? null;
  }

  async updatePost(id: string, patch: Partial<BlogPost>): Promise<BlogPost> {
    const posts = read<BlogPost>(KEYS.posts);
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Пост не найден");
    const next = { ...posts[idx], ...patch, id };
    if (patch.published && !posts[idx].published && !next.publishedAt) {
      next.publishedAt = new Date().toISOString();
    }
    posts[idx] = next;
    write(KEYS.posts, posts);
    return next;
  }

  async deletePost(id: string): Promise<void> {
    write(KEYS.posts, read<BlogPost>(KEYS.posts).filter((p) => p.id !== id));
  }

  // ─── Альбомы (v2) ─────────────────────────────────────────────────────────
  async createAlbum(input: Omit<Album, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number }): Promise<Album> {
    const all = read<Album>(KEYS.albums);
    const album: Album = {
      ...input,
      id: genId("alb"),
      sortOrder: input.sortOrder ?? all.filter((a) => a.galleryId === input.galleryId).length,
      createdAt: new Date().toISOString(),
    };
    all.push(album);
    write(KEYS.albums, all);
    return album;
  }
  async listAlbums(galleryId: string): Promise<Album[]> {
    return read<Album>(KEYS.albums).filter((a) => a.galleryId === galleryId).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async updateAlbum(id: string, patch: Partial<Album>): Promise<Album> {
    const all = read<Album>(KEYS.albums);
    const i = all.findIndex((a) => a.id === id);
    if (i === -1) throw new Error("Альбом не найден");
    all[i] = { ...all[i], ...patch, id };
    write(KEYS.albums, all);
    return all[i];
  }
  async deleteAlbum(id: string): Promise<void> {
    write(KEYS.albums, read<Album>(KEYS.albums).filter((a) => a.id !== id));
    // Ассеты остаются в галерее (album_id очищаем).
    write(KEYS.assets, read<Asset>(KEYS.assets).map((a) => (a.albumId === id ? { ...a, albumId: undefined } : a)));
  }

  // ─── Комментарии к фото (v2) ──────────────────────────────────────────────
  async addComment(input: Omit<PhotoComment, "id" | "createdAt">): Promise<PhotoComment> {
    const all = read<PhotoComment>(KEYS.comments);
    const c: PhotoComment = { ...input, id: genId("cmt"), createdAt: new Date().toISOString() };
    all.push(c);
    write(KEYS.comments, all);
    return c;
  }
  async listComments(galleryId: string): Promise<PhotoComment[]> {
    return read<PhotoComment>(KEYS.comments).filter((c) => c.galleryId === galleryId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async deleteComment(id: string): Promise<void> {
    write(KEYS.comments, read<PhotoComment>(KEYS.comments).filter((c) => c.id !== id));
  }

  // ─── Download-токены (v2) ─────────────────────────────────────────────────
  async createDownloadToken(
    input: Omit<DownloadToken, "id" | "createdAt" | "usedCount" | "token"> & { token?: string },
  ): Promise<DownloadToken> {
    const all = read<DownloadToken>(KEYS.dlTokens);
    const t: DownloadToken = {
      ...input,
      token: input.token || genId("dl").replace("dl_", ""),
      id: genId("dlt"),
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    all.push(t);
    write(KEYS.dlTokens, all);
    return t;
  }
  async getDownloadToken(token: string): Promise<DownloadToken | null> {
    return read<DownloadToken>(KEYS.dlTokens).find((t) => t.token === token) ?? null;
  }
  async consumeDownloadToken(id: string): Promise<void> {
    const all = read<DownloadToken>(KEYS.dlTokens);
    const i = all.findIndex((t) => t.id === id);
    if (i === -1) return;
    all[i] = { ...all[i], usedCount: all[i].usedCount + 1 };
    write(KEYS.dlTokens, all);
  }

  // ─── Уведомления (v2) ─────────────────────────────────────────────────────
  async createNotification(
    input: Omit<Notification, "id" | "createdAt" | "status"> & { status?: NotificationStatus },
  ): Promise<Notification> {
    const all = read<Notification>(KEYS.notifications);
    const n: Notification = { ...input, id: genId("ntf"), status: input.status ?? "pending", createdAt: new Date().toISOString() };
    all.push(n);
    write(KEYS.notifications, all);
    return n;
  }
  async listNotifications(): Promise<Notification[]> {
    return read<Notification>(KEYS.notifications).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async updateNotificationStatus(id: string, status: NotificationStatus, error?: string): Promise<void> {
    const all = read<Notification>(KEYS.notifications);
    const i = all.findIndex((n) => n.id === id);
    if (i === -1) return;
    all[i] = { ...all[i], status, error, sentAt: status === "sent" ? new Date().toISOString() : all[i].sentAt };
    write(KEYS.notifications, all);
  }

  // ─── Audit (v2) ───────────────────────────────────────────────────────────
  async logAdminAction(input: Omit<AdminAction, "id" | "createdAt">): Promise<AdminAction> {
    const all = read<AdminAction>(KEYS.adminActions);
    const a: AdminAction = { ...input, id: genId("act"), createdAt: new Date().toISOString() };
    all.push(a);
    write(KEYS.adminActions, all);
    return a;
  }
  async listAdminActions(): Promise<AdminAction[]> {
    return read<AdminAction>(KEYS.adminActions).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ─── Прайс-правила (v2) ───────────────────────────────────────────────────
  async listPriceRules(opts?: { activeOnly?: boolean }): Promise<PriceRule[]> {
    let list = read<PriceRule>(KEYS.priceRules).sort((a, b) => a.sortOrder - b.sortOrder);
    if (opts?.activeOnly) list = list.filter((r) => r.active);
    return list;
  }
  async createPriceRule(input: Omit<PriceRule, "id">): Promise<PriceRule> {
    const all = read<PriceRule>(KEYS.priceRules);
    const r: PriceRule = { ...input, id: genId("pr") };
    all.push(r);
    write(KEYS.priceRules, all);
    return r;
  }
  async updatePriceRule(id: string, patch: Partial<PriceRule>): Promise<PriceRule> {
    const all = read<PriceRule>(KEYS.priceRules);
    const i = all.findIndex((r) => r.id === id);
    if (i === -1) throw new Error("Правило не найдено");
    all[i] = { ...all[i], ...patch, id };
    write(KEYS.priceRules, all);
    return all[i];
  }
  async deletePriceRule(id: string): Promise<void> {
    write(KEYS.priceRules, read<PriceRule>(KEYS.priceRules).filter((r) => r.id !== id));
  }
}

// Singleton. Провайдер выбирается автоматически: если заданы ключи Supabase —
// реальная БД (SupabaseDataStore), иначе localStorage (LocalDataStore).
let _store: DataStore | null = null;
export function getStore(): DataStore {
  if (!_store) {
    if (isSupabaseConfigured) {
      _store = new SupabaseDataStore();
    } else {
      _store = new LocalDataStore();
    }
  }
  return _store;
}
