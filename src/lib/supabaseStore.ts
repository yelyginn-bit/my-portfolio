// Реализация DataStore поверх Supabase (Postgres). Тот же интерфейс, что и
// LocalDataStore — UI и логика скидок не меняются. Активируется автоматически,
// когда заданы ключи (см. getStore() в store.ts).
//
// Маппинг БД↔типы: в БД scalar-поля (subtotal/total/discount_percent) для отчётов,
// а полная вилка цен и выбор хранятся в breakdown_json/selection_json (источник
// правды для UI). Клиент идентифицируется телефоном; в orders хранится client_id.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Asset, Client, Gallery, Lead, Order, OrderSelection, PriceBreakdown,
  BlogPost, OrderItem, PortfolioCase, Review, Selection, SelectionKind, ShareLink, ShareResolution, ShopOrder,
  AdminAction, Album, DownloadToken, Notification, NotificationStatus, PhotoComment, PriceRule,
} from "./types";
import { type DataStore, normalizePhone } from "./store";
import { getSupabase } from "./supabaseClient";

function mid(a: number, b: number): number {
  return Math.round((a + b) / 2);
}

interface OrderRow {
  id: string;
  client_id: string | null;
  gallery_id: string | null;
  status: Order["status"];
  discount_percent: number;
  comment: string | null;
  source: string | null;
  selection_json: OrderSelection | null;
  breakdown_json: PriceBreakdown | null;
  created_at: string;
  clients?: { phone: string; name: string | null } | null;
}

export class SupabaseDataStore implements DataStore {
  private async sb(): Promise<SupabaseClient> {
    const sb = await getSupabase();
    if (!sb) throw new Error("Supabase не сконфигурирован");
    return sb;
  }

  private rowToOrder(r: OrderRow): Order {
    // breakdown_json/selection_json в БД nullable (например, у shop-заказов их нет) —
    // даём безопасные дефолты, чтобы UI (Dashboard/Admin) не падал на null.
    const selection: OrderSelection = r.selection_json ?? {
      shootType: "", days: 1, baseItems: [], optionItems: [], urgent: false,
    };
    const breakdown: PriceBreakdown = r.breakdown_json ?? {
      subtotalMin: 0, subtotalMax: 0, discountPercent: 0, totalMin: 0, totalMax: 0,
    };
    return {
      id: r.id,
      clientPhone: r.clients?.phone,
      createdAt: r.created_at,
      status: r.status,
      selection,
      breakdown,
      contactName: r.clients?.name ?? undefined,
      contact: r.clients?.phone,
      comment: r.comment ?? undefined,
    };
  }

  // ─── Клиенты ────────────────────────────────────────────────────────────
  async getClientByPhone(phone: string): Promise<Client | null> {
    const p = normalizePhone(phone);
    const { data } = await (await this.sb()).from("clients").select("*").eq("phone", p).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      phone: data.phone,
      name: data.name ?? undefined,
      createdAt: data.created_at,
      completedOrders: await this.completedOrderCount(p),
    };
  }

  async upsertClient(input: { phone: string; name?: string }): Promise<Client> {
    const p = normalizePhone(input.phone);
    const { data, error } = await (await this.sb())
      .from("clients")
      .upsert({ phone: p, ...(input.name ? { name: input.name } : {}) }, { onConflict: "phone" })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      phone: data.phone,
      name: data.name ?? undefined,
      createdAt: data.created_at,
      completedOrders: await this.completedOrderCount(p),
    };
  }

  async listClients(): Promise<Client[]> {
    const { data } = await (await this.sb()).from("clients").select("*").order("created_at", { ascending: false });
    const clients = data ?? [];
    return Promise.all(
      clients.map(async (c) => ({
        id: c.id,
        phone: c.phone,
        name: c.name ?? undefined,
        createdAt: c.created_at,
        completedOrders: await this.completedOrderCount(c.phone),
      })),
    );
  }

  private async clientIdByPhone(phone: string): Promise<string | null> {
    const { data } = await (await this.sb()).from("clients").select("id").eq("phone", normalizePhone(phone)).maybeSingle();
    return data?.id ?? null;
  }

  // ─── Заказы ─────────────────────────────────────────────────────────────
  async createOrder(
    input: Omit<Order, "id" | "createdAt" | "status"> & { status?: Order["status"] },
  ): Promise<Order> {
    let clientId: string | null = null;
    if (input.clientPhone) {
      const c = await this.upsertClient({ phone: input.clientPhone, name: input.contactName });
      clientId = c.id;
    }
    const b = input.breakdown;
    const { data, error } = await (await this.sb())
      .from("orders")
      .insert({
        client_id: clientId,
        status: input.status ?? "new",
        subtotal: mid(b.subtotalMin, b.subtotalMax),
        discount_percent: b.discountPercent,
        total: mid(b.totalMin, b.totalMax),
        currency: "RUB",
        comment: input.comment ?? null,
        source: input.selection?.shootType ? "calculator" : "homepage",
        selection_json: input.selection,
        breakdown_json: b,
      })
      .select("*, clients(phone,name)")
      .single();
    if (error) throw error;
    return this.rowToOrder(data as OrderRow);
  }

  async listOrdersByPhone(phone: string): Promise<Order[]> {
    const clientId = await this.clientIdByPhone(phone);
    if (!clientId) return [];
    const { data } = await (await this.sb())
      .from("orders")
      .select("*, clients(phone,name)")
      .eq("client_id", clientId)
      .neq("source", "shop")
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => this.rowToOrder(r as OrderRow));
  }

  async listOrders(): Promise<Order[]> {
    // Только заказы-сметы (калькулятор); shop-заказы — отдельно через listShopOrders (паритет с Local).
    const { data } = await (await this.sb())
      .from("orders")
      .select("*, clients(phone,name)")
      .neq("source", "shop")
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => this.rowToOrder(r as OrderRow));
  }

  async completedOrderCount(phone: string): Promise<number> {
    const clientId = await this.clientIdByPhone(phone);
    if (!clientId) return 0;
    const { count } = await (await this.sb())
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .neq("source", "shop")
      .eq("status", "done");
    return count ?? 0;
  }

  // ─── Заявки ─────────────────────────────────────────────────────────────
  async createLead(input: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
    const { data, error } = await (await this.sb())
      .from("leads")
      .insert({ name: input.name, contact: input.contact, message: input.message, source: input.source })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      createdAt: data.created_at,
      name: data.name,
      contact: data.contact,
      message: data.message,
      source: data.source,
    };
  }

  async listLeads(): Promise<Lead[]> {
    const { data } = await (await this.sb()).from("leads").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((l) => ({
      id: l.id,
      createdAt: l.created_at,
      name: l.name,
      contact: l.contact,
      message: l.message,
      source: l.source,
    }));
  }

  // ─── Галереи ────────────────────────────────────────────────────────────
  private rowToGallery(g: any): Gallery {
    return {
      id: g.id,
      title: g.title,
      slug: g.slug ?? undefined,
      description: g.description ?? undefined,
      shootDate: g.shoot_date ?? undefined,
      coverAssetId: g.cover_asset_id ?? undefined,
      visibility: g.visibility,
      downloadPolicy: g.download_policy,
      published: g.published,
      createdAt: g.created_at,
      clientPhone: g.clients?.phone ?? undefined,
      watermarkEnabled: g.watermark_enabled ?? undefined,
      watermarkText: g.watermark_text ?? undefined,
    };
  }

  private rowToAsset(a: any): Asset {
    return {
      id: a.id,
      galleryId: a.gallery_id,
      type: a.type,
      albumId: a.album_id ?? undefined,
      storageProvider: a.storage_provider,
      storageKey: a.storage_key,
      thumbKey: a.thumb_key ?? undefined,
      filename: a.filename ?? undefined,
      mime: a.mime ?? undefined,
      width: a.width ?? undefined,
      height: a.height ?? undefined,
      sizeBytes: a.size_bytes ?? undefined,
      videoProvider: a.video_provider ?? undefined,
      videoUid: a.video_uid ?? undefined,
      durationSec: a.duration_sec ?? undefined,
      aiTags: a.ai_tags ?? undefined,
      faceGroup: a.face_group ?? undefined,
      sortOrder: a.sort_order ?? 0,
      createdAt: a.created_at,
    };
  }

  async createGallery(input: Partial<Gallery> & { title: string }): Promise<Gallery> {
    let clientId: string | null = null;
    if (input.clientPhone) clientId = await this.clientIdByPhone(input.clientPhone);
    const { data, error } = await (await this.sb())
      .from("galleries")
      .insert({
        title: input.title,
        slug: input.slug ?? null,
        description: input.description ?? null,
        shoot_date: input.shootDate ?? null,
        visibility: input.visibility ?? "private",
        download_policy: input.downloadPolicy ?? "web",
        published: input.published ?? false,
        client_id: clientId,
        watermark_enabled: input.watermarkEnabled ?? false,
        watermark_text: input.watermarkText ?? null,
      })
      .select("*, clients(phone)")
      .single();
    if (error) throw error;
    return this.rowToGallery(data);
  }

  async listGalleries(): Promise<Gallery[]> {
    const { data } = await (await this.sb())
      .from("galleries")
      .select("*, clients(phone)")
      .order("created_at", { ascending: false });
    return (data ?? []).map((g) => this.rowToGallery(g));
  }

  async getGallery(id: string): Promise<Gallery | null> {
    const { data } = await (await this.sb())
      .from("galleries")
      .select("*, clients(phone)")
      .eq("id", id)
      .maybeSingle();
    return data ? this.rowToGallery(data) : null;
  }

  async updateGallery(id: string, patch: Partial<Gallery>): Promise<Gallery> {
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.slug !== undefined) row.slug = patch.slug;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.shootDate !== undefined) row.shoot_date = patch.shootDate;
    if (patch.coverAssetId !== undefined) row.cover_asset_id = patch.coverAssetId;
    if (patch.visibility !== undefined) row.visibility = patch.visibility;
    if (patch.downloadPolicy !== undefined) row.download_policy = patch.downloadPolicy;
    if (patch.published !== undefined) row.published = patch.published;
    if (patch.watermarkEnabled !== undefined) row.watermark_enabled = patch.watermarkEnabled;
    if (patch.watermarkText !== undefined) row.watermark_text = patch.watermarkText;
    const { data, error } = await (await this.sb())
      .from("galleries")
      .update(row)
      .eq("id", id)
      .select("*, clients(phone)")
      .single();
    if (error) throw error;
    return this.rowToGallery(data);
  }

  async deleteGallery(id: string): Promise<void> {
    await (await this.sb()).from("galleries").delete().eq("id", id);
  }

  // ─── Ассеты ─────────────────────────────────────────────────────────────
  async addAsset(
    input: Omit<Asset, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number },
  ): Promise<Asset> {
    const { data, error } = await (await this.sb())
      .from("assets")
      .insert({
        gallery_id: input.galleryId,
        album_id: input.albumId ?? null,
        type: input.type,
        storage_provider: input.storageProvider,
        storage_key: input.storageKey,
        thumb_key: input.thumbKey ?? null,
        filename: input.filename ?? null,
        mime: input.mime ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        size_bytes: input.sizeBytes ?? null,
        video_provider: input.videoProvider ?? null,
        video_uid: input.videoUid ?? null,
        duration_sec: input.durationSec ?? null,
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return this.rowToAsset(data);
  }

  async listAssets(galleryId: string): Promise<Asset[]> {
    const { data } = await (await this.sb())
      .from("assets")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: true });
    return (data ?? []).map((a) => this.rowToAsset(a));
  }

  async updateAsset(id: string, patch: Partial<Asset>): Promise<Asset> {
    const row: Record<string, unknown> = {};
    if (patch.aiTags !== undefined) row.ai_tags = patch.aiTags;
    if (patch.faceGroup !== undefined) row.face_group = patch.faceGroup;
    if (patch.albumId !== undefined) row.album_id = patch.albumId;
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
    if (patch.thumbKey !== undefined) row.thumb_key = patch.thumbKey;
    const { data, error } = await (await this.sb()).from("assets").update(row).eq("id", id).select().single();
    if (error) throw error;
    return this.rowToAsset(data);
  }

  async deleteAsset(id: string): Promise<void> {
    await (await this.sb()).from("assets").delete().eq("id", id);
  }

  // ─── Шаринг ─────────────────────────────────────────────────────────────
  // ⚠️ Анонимный доступ к приватной галерее по токену в проде должен идти через
  // security-definer RPC (см. db/policies.sql), иначе RLS не пустит гостя.
  async createShareLink(
    galleryId: string,
    opts?: { password?: string; canDownload?: boolean; expiresAt?: string },
  ): Promise<ShareLink> {
    const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    const { data, error } = await (await this.sb())
      .from("share_links")
      .insert({
        gallery_id: galleryId,
        token,
        password_hash: opts?.password ?? null,
        can_download: opts?.canDownload ?? false,
        expires_at: opts?.expiresAt ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id, galleryId, token: data.token, password: data.password_hash ?? undefined,
      canDownload: data.can_download, expiresAt: data.expires_at ?? undefined, createdAt: data.created_at,
    };
  }

  async listShareLinks(galleryId: string): Promise<ShareLink[]> {
    const { data } = await (await this.sb()).from("share_links").select("*").eq("gallery_id", galleryId);
    return (data ?? []).map((l) => ({
      id: l.id, galleryId: l.gallery_id, token: l.token, password: l.password_hash ?? undefined,
      canDownload: l.can_download, expiresAt: l.expires_at ?? undefined, createdAt: l.created_at,
    }));
  }

  async resolveShareToken(token: string, password?: string): Promise<ShareResolution> {
    const { data: link } = await (await this.sb())
      .from("share_links")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (!link) return { ok: false, reason: "notfound" };
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now())
      return { ok: false, reason: "expired" };
    if (link.password_hash && link.password_hash !== password) return { ok: false, reason: "password" };
    const gallery = await this.getGallery(link.gallery_id);
    if (!gallery) return { ok: false, reason: "notfound" };
    return { ok: true, gallery, canDownload: link.can_download };
  }

  // ─── Отбор ──────────────────────────────────────────────────────────────
  async toggleSelection(input: {
    galleryId: string;
    assetId: string;
    kind: SelectionKind;
    viewerKey: string;
  }): Promise<{ on: boolean }> {
    const sb = await this.sb();
    const { data: existing } = await sb
      .from("selections")
      .select("id")
      .eq("asset_id", input.assetId)
      .eq("viewer_key", input.viewerKey)
      .eq("kind", input.kind)
      .maybeSingle();
    if (existing) {
      await sb.from("selections").delete().eq("id", existing.id);
      return { on: false };
    }
    await sb.from("selections").insert({
      gallery_id: input.galleryId,
      asset_id: input.assetId,
      viewer_key: input.viewerKey,
      kind: input.kind,
    });
    return { on: true };
  }

  async listSelectionsByViewer(galleryId: string, viewerKey: string): Promise<Selection[]> {
    const { data } = await (await this.sb())
      .from("selections")
      .select("*")
      .eq("gallery_id", galleryId)
      .eq("viewer_key", viewerKey);
    return (data ?? []).map(this.rowToSelection);
  }

  async listSelections(galleryId: string): Promise<Selection[]> {
    const { data } = await (await this.sb()).from("selections").select("*").eq("gallery_id", galleryId);
    return (data ?? []).map(this.rowToSelection);
  }

  private rowToSelection(s: any): Selection {
    return {
      id: s.id, galleryId: s.gallery_id, assetId: s.asset_id,
      kind: s.kind, viewerKey: s.viewer_key, createdAt: s.created_at,
    };
  }

  // ─── Магазин ────────────────────────────────────────────────────────────
  private rowToShopOrder(o: any): ShopOrder {
    const paid = o.status === "confirmed" || o.status === "done";
    const items: OrderItem[] = (o.order_items ?? []).map((it: any) => ({
      productId: it.service_id ?? it.kind ?? "item",
      title: it.title,
      qty: it.qty,
      unitPrice: it.unit_price,
      total: it.total,
      assetIds: it.asset_ids ?? undefined,
    }));
    const payment = (o.payments ?? [])[0];
    return {
      id: o.id,
      createdAt: o.created_at,
      status: o.status === "cancelled" ? "cancelled" : paid ? "paid" : "pending",
      clientPhone: o.clients?.phone ?? undefined,
      contactName: o.clients?.name ?? undefined,
      contact: o.clients?.phone ?? undefined,
      galleryId: o.gallery_id ?? undefined,
      items,
      total: o.total,
      paymentProvider: payment?.provider ?? undefined,
      paymentId: payment?.provider_payment_id ?? undefined,
      paidAt: payment?.paid_at ?? undefined,
    };
  }

  async createShopOrder(input: {
    clientPhone?: string;
    contactName?: string;
    contact?: string;
    galleryId?: string;
    items: OrderItem[];
  }): Promise<ShopOrder> {
    const sb = await this.sb();
    let clientId: string | null = null;
    if (input.clientPhone) {
      const c = await this.upsertClient({ phone: input.clientPhone, name: input.contactName });
      clientId = c.id;
    }
    const total = input.items.reduce((s, i) => s + i.total, 0);
    const { data: order, error } = await sb
      .from("orders")
      .insert({
        client_id: clientId,
        gallery_id: input.galleryId ?? null,
        status: "new",
        subtotal: total,
        total,
        currency: "RUB",
        source: "shop",
      })
      .select("*, clients(phone,name)")
      .single();
    if (error) throw error;
    if (input.items.length) {
      await sb.from("order_items").insert(
        input.items.map((i) => ({
          order_id: order.id,
          kind: "other",
          title: i.title,
          qty: i.qty,
          unit_price: i.unitPrice,
          total: i.total,
          asset_ids: i.assetIds ?? null,
        })),
      );
    }
    return this.rowToShopOrder({ ...order, order_items: input.items.map((i) => ({
      title: i.title, qty: i.qty, unit_price: i.unitPrice, total: i.total, asset_ids: i.assetIds, kind: i.productId,
    })) });
  }

  async listShopOrders(): Promise<ShopOrder[]> {
    const { data } = await (await this.sb())
      .from("orders")
      .select("*, clients(phone,name), order_items(*), payments(*)")
      .eq("source", "shop")
      .order("created_at", { ascending: false });
    return (data ?? []).map((o) => this.rowToShopOrder(o));
  }

  async getShopOrder(id: string): Promise<ShopOrder | null> {
    const { data } = await (await this.sb())
      .from("orders")
      .select("*, clients(phone,name), order_items(*), payments(*)")
      .eq("id", id)
      .maybeSingle();
    return data ? this.rowToShopOrder(data) : null;
  }

  async markShopOrderPaid(id: string, info: { provider: string; paymentId: string }): Promise<void> {
    const sb = await this.sb();
    const { data: order } = await sb.from("orders").select("total").eq("id", id).maybeSingle();
    await sb.from("payments").insert({
      order_id: id,
      provider: info.provider,
      provider_payment_id: info.paymentId,
      amount: order?.total ?? 0,
      currency: "RUB",
      status: "succeeded",
      paid_at: new Date().toISOString(),
    });
    await sb.from("orders").update({ status: "confirmed" }).eq("id", id);
  }

  // ─── Отзывы ─────────────────────────────────────────────────────────────
  private rowToReview(r: any): Review {
    return {
      id: r.id,
      clientPhone: r.clients?.phone ?? undefined,
      authorName: r.author_name ?? undefined,
      rating: r.rating,
      text: r.text,
      galleryId: r.gallery_id ?? undefined,
      published: r.published,
      createdAt: r.created_at,
    };
  }

  async createReview(input: Omit<Review, "id" | "createdAt">): Promise<Review> {
    let clientId: string | null = null;
    // Паритет с Local и createOrder/createShopOrder: создаём клиента, если его ещё нет.
    if (input.clientPhone) {
      const c = await this.upsertClient({ phone: input.clientPhone, name: input.authorName });
      clientId = c.id;
    }
    const { data, error } = await (await this.sb())
      .from("reviews")
      .insert({
        client_id: clientId,
        author_name: input.authorName ?? null,
        rating: input.rating,
        text: input.text,
        gallery_id: input.galleryId ?? null,
        published: input.published,
      })
      .select("*, clients(phone)")
      .single();
    if (error) throw error;
    return this.rowToReview(data);
  }

  async listReviews(opts?: { publishedOnly?: boolean }): Promise<Review[]> {
    let q = (await this.sb()).from("reviews").select("*, clients(phone)").order("created_at", { ascending: false });
    if (opts?.publishedOnly) q = q.eq("published", true);
    const { data } = await q;
    return (data ?? []).map((r) => this.rowToReview(r));
  }

  async updateReview(id: string, patch: Partial<Review>): Promise<Review> {
    const row: Record<string, unknown> = {};
    if (patch.authorName !== undefined) row.author_name = patch.authorName;
    if (patch.rating !== undefined) row.rating = patch.rating;
    if (patch.text !== undefined) row.text = patch.text;
    if (patch.published !== undefined) row.published = patch.published;
    if (patch.galleryId !== undefined) row.gallery_id = patch.galleryId;
    const { data, error } = await (await this.sb())
      .from("reviews").update(row).eq("id", id).select("*, clients(phone)").single();
    if (error) throw error;
    return this.rowToReview(data);
  }

  async deleteReview(id: string): Promise<void> {
    await (await this.sb()).from("reviews").delete().eq("id", id);
  }

  // ─── Настройки (KV) ───────────────────────────────────────────────────────
  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const { data } = await (await this.sb()).from("settings").select("value").eq("key", key).maybeSingle();
    return (data?.value as T) ?? null;
  }

  async setSetting<T = unknown>(key: string, value: T): Promise<void> {
    await (await this.sb())
      .from("settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  }

  // ─── Портфолио-кейсы ──────────────────────────────────────────────────────
  private rowToCase(c: any): PortfolioCase {
    return {
      id: c.id, slug: c.slug, clientName: c.client_name ?? undefined, title: c.title,
      task: c.task ?? undefined, solution: c.solution ?? undefined, result: c.result ?? undefined,
      coverAssetId: c.cover_asset_id ?? undefined, galleryId: c.gallery_id ?? undefined,
      published: c.published, sortOrder: c.sort_order ?? 0, createdAt: c.created_at,
    };
  }

  async createCase(
    input: Omit<PortfolioCase, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number },
  ): Promise<PortfolioCase> {
    const { data, error } = await (await this.sb())
      .from("portfolio_cases")
      .insert({
        slug: input.slug, client_name: input.clientName ?? null, title: input.title,
        task: input.task ?? null, solution: input.solution ?? null, result: input.result ?? null,
        cover_asset_id: input.coverAssetId ?? null, gallery_id: input.galleryId ?? null,
        published: input.published, sort_order: input.sortOrder ?? 0,
      })
      .select().single();
    if (error) throw error;
    return this.rowToCase(data);
  }

  async listCases(opts?: { publishedOnly?: boolean }): Promise<PortfolioCase[]> {
    let q = (await this.sb()).from("portfolio_cases").select("*").order("sort_order", { ascending: true });
    if (opts?.publishedOnly) q = q.eq("published", true);
    const { data } = await q;
    return (data ?? []).map((c) => this.rowToCase(c));
  }

  async getCase(idOrSlug: string): Promise<PortfolioCase | null> {
    const sb = await this.sb();
    const { data } = await sb.from("portfolio_cases").select("*").or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).maybeSingle();
    return data ? this.rowToCase(data) : null;
  }

  async updateCase(id: string, patch: Partial<PortfolioCase>): Promise<PortfolioCase> {
    const row: Record<string, unknown> = {};
    if (patch.slug !== undefined) row.slug = patch.slug;
    if (patch.clientName !== undefined) row.client_name = patch.clientName;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.task !== undefined) row.task = patch.task;
    if (patch.solution !== undefined) row.solution = patch.solution;
    if (patch.result !== undefined) row.result = patch.result;
    if (patch.coverAssetId !== undefined) row.cover_asset_id = patch.coverAssetId;
    if (patch.galleryId !== undefined) row.gallery_id = patch.galleryId;
    if (patch.published !== undefined) row.published = patch.published;
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
    const { data, error } = await (await this.sb()).from("portfolio_cases").update(row).eq("id", id).select().single();
    if (error) throw error;
    return this.rowToCase(data);
  }

  async deleteCase(id: string): Promise<void> {
    await (await this.sb()).from("portfolio_cases").delete().eq("id", id);
  }

  // ─── Блог ─────────────────────────────────────────────────────────────────
  private rowToPost(p: any): BlogPost {
    return {
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt ?? undefined,
      bodyMd: p.body_md ?? undefined, coverUrl: p.og_image_url ?? undefined, tags: p.tags ?? [],
      seoTitle: p.seo_title ?? undefined, seoDescription: p.seo_description ?? undefined,
      published: p.published, publishedAt: p.published_at ?? undefined, createdAt: p.created_at,
    };
  }

  async createPost(input: Omit<BlogPost, "id" | "createdAt">): Promise<BlogPost> {
    const { data, error } = await (await this.sb())
      .from("blog_posts")
      .insert({
        slug: input.slug, title: input.title, excerpt: input.excerpt ?? null, body_md: input.bodyMd ?? null,
        og_image_url: input.coverUrl ?? null, tags: input.tags ?? [], seo_title: input.seoTitle ?? null,
        seo_description: input.seoDescription ?? null, published: input.published,
        published_at: input.published ? input.publishedAt ?? new Date().toISOString() : input.publishedAt ?? null,
      })
      .select().single();
    if (error) throw error;
    return this.rowToPost(data);
  }

  async listPosts(opts?: { publishedOnly?: boolean }): Promise<BlogPost[]> {
    let q = (await this.sb()).from("blog_posts").select("*").order("published_at", { ascending: false, nullsFirst: false });
    if (opts?.publishedOnly) q = q.eq("published", true);
    const { data } = await q;
    return (data ?? []).map((p) => this.rowToPost(p));
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const { data } = await (await this.sb()).from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    return data ? this.rowToPost(data) : null;
  }

  async updatePost(id: string, patch: Partial<BlogPost>): Promise<BlogPost> {
    const row: Record<string, unknown> = {};
    if (patch.slug !== undefined) row.slug = patch.slug;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.excerpt !== undefined) row.excerpt = patch.excerpt;
    if (patch.bodyMd !== undefined) row.body_md = patch.bodyMd;
    if (patch.coverUrl !== undefined) row.og_image_url = patch.coverUrl;
    if (patch.tags !== undefined) row.tags = patch.tags;
    if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle;
    if (patch.seoDescription !== undefined) row.seo_description = patch.seoDescription;
    if (patch.published !== undefined) {
      row.published = patch.published;
      if (patch.published && patch.publishedAt === undefined) row.published_at = new Date().toISOString();
    }
    if (patch.publishedAt !== undefined) row.published_at = patch.publishedAt;
    const { data, error } = await (await this.sb()).from("blog_posts").update(row).eq("id", id).select().single();
    if (error) throw error;
    return this.rowToPost(data);
  }

  async deletePost(id: string): Promise<void> {
    await (await this.sb()).from("blog_posts").delete().eq("id", id);
  }

  // ─── Альбомы (v2) ─────────────────────────────────────────────────────────
  private rowToAlbum(a: any): Album {
    return { id: a.id, galleryId: a.gallery_id, title: a.title, coverAssetId: a.cover_asset_id ?? undefined, sortOrder: a.sort_order ?? 0, createdAt: a.created_at };
  }
  async createAlbum(input: Omit<Album, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number }): Promise<Album> {
    const { data, error } = await (await this.sb()).from("albums")
      .insert({ gallery_id: input.galleryId, title: input.title, cover_asset_id: input.coverAssetId ?? null, sort_order: input.sortOrder ?? 0 })
      .select().single();
    if (error) throw error;
    return this.rowToAlbum(data);
  }
  async listAlbums(galleryId: string): Promise<Album[]> {
    const { data } = await (await this.sb()).from("albums").select("*").eq("gallery_id", galleryId).order("sort_order", { ascending: true });
    return (data ?? []).map((a) => this.rowToAlbum(a));
  }
  async updateAlbum(id: string, patch: Partial<Album>): Promise<Album> {
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    // "coverAssetId" в patch со значением undefined = снять обложку (→ null).
    if ("coverAssetId" in patch) row.cover_asset_id = patch.coverAssetId ?? null;
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
    const { data, error } = await (await this.sb()).from("albums").update(row).eq("id", id).select().single();
    if (error) throw error;
    return this.rowToAlbum(data);
  }
  async deleteAlbum(id: string): Promise<void> {
    await (await this.sb()).from("albums").delete().eq("id", id); // assets.album_id → null (on delete set null)
  }

  // ─── Комментарии (v2) ─────────────────────────────────────────────────────
  async addComment(input: Omit<PhotoComment, "id" | "createdAt">): Promise<PhotoComment> {
    let clientId: string | null = null;
    if (input.clientPhone) clientId = await this.clientIdByPhone(input.clientPhone);
    const { data, error } = await (await this.sb()).from("photo_comments")
      .insert({ gallery_id: input.galleryId, asset_id: input.assetId, client_id: clientId, viewer_key: input.viewerKey ?? null, author_name: input.authorName ?? null, text: input.text })
      .select("*, clients(phone)").single();
    if (error) throw error;
    return { id: data.id, galleryId: data.gallery_id, assetId: data.asset_id, clientPhone: data.clients?.phone ?? undefined, viewerKey: data.viewer_key ?? undefined, authorName: data.author_name ?? undefined, text: data.text, createdAt: data.created_at };
  }
  async listComments(galleryId: string): Promise<PhotoComment[]> {
    const { data } = await (await this.sb()).from("photo_comments").select("*, clients(phone)").eq("gallery_id", galleryId).order("created_at", { ascending: true });
    return (data ?? []).map((c) => ({ id: c.id, galleryId: c.gallery_id, assetId: c.asset_id, clientPhone: c.clients?.phone ?? undefined, viewerKey: c.viewer_key ?? undefined, authorName: c.author_name ?? undefined, text: c.text, createdAt: c.created_at }));
  }
  async deleteComment(id: string): Promise<void> {
    await (await this.sb()).from("photo_comments").delete().eq("id", id);
  }

  // ─── Download-токены (v2) ─────────────────────────────────────────────────
  private rowToDlToken(t: any): DownloadToken {
    return { id: t.id, token: t.token, galleryId: t.gallery_id, assetId: t.asset_id ?? undefined, quality: t.quality, expiresAt: t.expires_at ?? undefined, maxUses: t.max_uses ?? undefined, usedCount: t.used_count ?? 0, createdAt: t.created_at };
  }
  async createDownloadToken(input: Omit<DownloadToken, "id" | "createdAt" | "usedCount" | "token"> & { token?: string }): Promise<DownloadToken> {
    const token = input.token || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    const { data, error } = await (await this.sb()).from("download_tokens")
      .insert({ token, gallery_id: input.galleryId, asset_id: input.assetId ?? null, quality: input.quality, expires_at: input.expiresAt ?? null, max_uses: input.maxUses ?? null })
      .select().single();
    if (error) throw error;
    return this.rowToDlToken(data);
  }
  async getDownloadToken(token: string): Promise<DownloadToken | null> {
    const { data } = await (await this.sb()).from("download_tokens").select("*").eq("token", token).maybeSingle();
    return data ? this.rowToDlToken(data) : null;
  }
  async consumeDownloadToken(id: string): Promise<void> {
    const sb = await this.sb();
    const { data } = await sb.from("download_tokens").select("used_count").eq("id", id).maybeSingle();
    await sb.from("download_tokens").update({ used_count: (data?.used_count ?? 0) + 1 }).eq("id", id);
  }

  // ─── Уведомления (v2) ─────────────────────────────────────────────────────
  private rowToNotif(n: any): Notification {
    return { id: n.id, type: n.type, channel: n.channel, recipient: n.recipient ?? undefined, payload: n.payload ?? undefined, entityType: n.entity_type ?? undefined, entityId: n.entity_id ?? undefined, status: n.status, error: n.error ?? undefined, createdAt: n.created_at, sentAt: n.sent_at ?? undefined };
  }
  async createNotification(input: Omit<Notification, "id" | "createdAt" | "status"> & { status?: NotificationStatus }): Promise<Notification> {
    const { data, error } = await (await this.sb()).from("notifications")
      .insert({ type: input.type, channel: input.channel, recipient: input.recipient ?? null, payload: input.payload ?? null, entity_type: input.entityType ?? null, entity_id: input.entityId ?? null, status: input.status ?? "pending" })
      .select().single();
    if (error) throw error;
    return this.rowToNotif(data);
  }
  async listNotifications(): Promise<Notification[]> {
    const { data } = await (await this.sb()).from("notifications").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((n) => this.rowToNotif(n));
  }
  async updateNotificationStatus(id: string, status: NotificationStatus, error?: string): Promise<void> {
    await (await this.sb()).from("notifications").update({ status, error: error ?? null, sent_at: status === "sent" ? new Date().toISOString() : null }).eq("id", id);
  }

  // ─── Audit (v2) ───────────────────────────────────────────────────────────
  async logAdminAction(input: Omit<AdminAction, "id" | "createdAt">): Promise<AdminAction> {
    const { data, error } = await (await this.sb()).from("admin_actions")
      .insert({ actor: input.actor, action: input.action, entity_type: input.entityType ?? null, entity_id: input.entityId ?? null, before: input.before ?? null, after: input.after ?? null })
      .select().single();
    if (error) throw error;
    return { id: data.id, actor: data.actor, action: data.action, entityType: data.entity_type ?? undefined, entityId: data.entity_id ?? undefined, before: data.before ?? undefined, after: data.after ?? undefined, createdAt: data.created_at };
  }
  async listAdminActions(): Promise<AdminAction[]> {
    const { data } = await (await this.sb()).from("admin_actions").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((a) => ({ id: a.id, actor: a.actor, action: a.action, entityType: a.entity_type ?? undefined, entityId: a.entity_id ?? undefined, before: a.before ?? undefined, after: a.after ?? undefined, createdAt: a.created_at }));
  }

  // ─── Прайс-правила (v2) ───────────────────────────────────────────────────
  private rowToPriceRule(r: any): PriceRule {
    return { id: r.id, shootType: r.shoot_type, kind: r.kind, name: r.name, unit: r.unit, priceMin: r.price_min, priceMax: r.price_max, sortOrder: r.sort_order ?? 0, active: r.active };
  }
  async listPriceRules(opts?: { activeOnly?: boolean }): Promise<PriceRule[]> {
    let q = (await this.sb()).from("price_rules").select("*").order("sort_order", { ascending: true });
    if (opts?.activeOnly) q = q.eq("active", true);
    const { data } = await q;
    return (data ?? []).map((r) => this.rowToPriceRule(r));
  }
  async createPriceRule(input: Omit<PriceRule, "id">): Promise<PriceRule> {
    const { data, error } = await (await this.sb()).from("price_rules")
      .insert({ shoot_type: input.shootType, kind: input.kind, name: input.name, unit: input.unit, price_min: input.priceMin, price_max: input.priceMax, sort_order: input.sortOrder, active: input.active })
      .select().single();
    if (error) throw error;
    return this.rowToPriceRule(data);
  }
  async updatePriceRule(id: string, patch: Partial<PriceRule>): Promise<PriceRule> {
    const row: Record<string, unknown> = {};
    if (patch.shootType !== undefined) row.shoot_type = patch.shootType;
    if (patch.kind !== undefined) row.kind = patch.kind;
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.unit !== undefined) row.unit = patch.unit;
    if (patch.priceMin !== undefined) row.price_min = patch.priceMin;
    if (patch.priceMax !== undefined) row.price_max = patch.priceMax;
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
    if (patch.active !== undefined) row.active = patch.active;
    const { data, error } = await (await this.sb()).from("price_rules").update(row).eq("id", id).select().single();
    if (error) throw error;
    return this.rowToPriceRule(data);
  }
  async deletePriceRule(id: string): Promise<void> {
    await (await this.sb()).from("price_rules").delete().eq("id", id);
  }
}
