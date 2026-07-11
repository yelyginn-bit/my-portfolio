// Доменные типы продающей части сайта (калькулятор, заказы, клиенты, скидки).
// Слой данных абстрагирован (см. store.ts), типы общие для localStorage и Supabase.

export type PriceUnit = "project" | "day" | "person" | "hour";

/** Одна строка прайса: услуга с вилкой цены и единицей измерения. */
export interface PriceItem {
  name: string;
  priceMin: number;
  priceMax: number;
  /** project — за проект (разово), day — за смену (× кол-во дней), person/hour — за единицу. */
  unit: PriceUnit;
}

/** Данные по одному типу съёмки: обязательные позиции + опциональные доп-услуги. */
export interface ShootTypeData {
  base: PriceItem[];
  options: PriceItem[];
}

/** Весь прайс: ключ — название типа съёмки. */
export type EstimateData = Record<string, ShootTypeData>;

// ─── Скидки ────────────────────────────────────────────────────────────────

/** Уровень скидки. Применяется, когда completedOrders >= minOrders (берётся наивысший подходящий). */
export interface DiscountTier {
  id: string;
  /** Человекочитаемое название уровня для кабинета/админки. */
  label: string;
  /** Порог: число завершённых заказов, начиная с которого действует уровень. */
  minOrders: number;
  /** Процент скидки 0..100. */
  percent: number;
}

// ─── Галереи и медиа ───────────────────────────────────────────────────────

export type GalleryVisibility = "public" | "private" | "password" | "token";
export type DownloadPolicy = "original" | "web" | "none";
export type AssetType = "photo" | "video";

export interface Gallery {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  shootDate?: string;
  coverAssetId?: string;
  visibility: GalleryVisibility;
  downloadPolicy: DownloadPolicy;
  published: boolean;
  createdAt: string;
  /** Привязка к клиенту (телефон) — опц. */
  clientPhone?: string;
  /** Водяной знак на web-превью (v2); оригиналы без знака — по DownloadToken. */
  watermarkEnabled?: boolean;
  watermarkText?: string;
}

/** Альбом — под-структура галереи (v2). Ассет может принадлежать альбому (опц.). */
export interface Album {
  id: string;
  galleryId: string;
  title: string;
  coverAssetId?: string;
  sortOrder: number;
  createdAt: string;
}

export interface Asset {
  id: string;
  galleryId: string;
  /** Альбом внутри галереи (v2); null = «без альбома» (текущее поведение). */
  albumId?: string;
  type: AssetType;
  /** Провайдер хранилища: 'local'(IndexedDB) | 'r2' | 's3' | ... */
  storageProvider: string;
  /** Ключ оригинала в хранилище. */
  storageKey: string;
  /** Превью: inline data-URL (dev) или ключ объекта (прод). */
  thumbUrl?: string;
  thumbKey?: string;
  filename?: string;
  mime?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  /** Видео: провайдер ('local' | 'cloudflare_stream') и id во внешнем сервисе. */
  videoProvider?: string;
  videoUid?: string;
  durationSec?: number;
  /** AI-теги (Этап I): ключевые слова от vision-сервиса (mock/реальный). */
  aiTags?: string[];
  /** Группа лица (Этап I): id «человека» от face-сервиса. */
  faceGroup?: string;
  sortOrder: number;
  createdAt: string;
}

// ─── Сущности v2 (комментарии, download-токены, уведомления, audit, прайс) ───

/** Комментарий клиента/гостя к конкретному фото в галерее. */
export interface PhotoComment {
  id: string;
  galleryId: string;
  assetId: string;
  clientPhone?: string;
  viewerKey?: string;     // гость по share-токену
  authorName?: string;
  text: string;
  createdAt: string;
}

/** Право на скачивание (срок/лимит/качество). Отделяет «скачать» от «смотреть». */
export interface DownloadToken {
  id: string;
  token: string;
  galleryId: string;
  assetId?: string;       // null = вся галерея / zip
  quality: "original" | "web";
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  createdAt: string;
}

export type NotificationStatus = "pending" | "sent" | "failed";

/** Журнал исходящих уведомлений (lead.new / payment.succeeded / gallery.shared / …). */
export interface Notification {
  id: string;
  type: string;
  channel: string;        // 'telegram' | 'email'
  recipient?: string;
  payload?: unknown;
  entityType?: string;
  entityId?: string;
  status: NotificationStatus;
  error?: string;
  createdAt: string;
  sentAt?: string;
}

/** Audit trail — каждая мутация админа (кто/что/до/после). */
export interface AdminAction {
  id: string;
  actor: string;
  action: string;         // 'gallery.update' | 'access.create' | 'discount.change' | ...
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

/** Правило прайса калькулятора (перенос из pricing.data в БД, v2). */
export interface PriceRule {
  id: string;
  shootType: string;
  kind: "base" | "option";
  name: string;
  unit: PriceUnit;
  priceMin: number;
  priceMax: number;
  sortOrder: number;
  active: boolean;
}

// ─── Шаринг и отбор (Этап C) ──────────────────────────────────────────────

/** Ссылка на галерею. Работает без регистрации (токен в URL /g/:token). */
export interface ShareLink {
  id: string;
  galleryId: string;
  token: string;
  /** Пароль (опц.). В dev — как есть; в проде хешируется на сервере. */
  password?: string;
  canDownload: boolean;
  expiresAt?: string;
  createdAt: string;
}

/** Результат разрешения share-токена (плоская форма — без discriminated narrowing). */
export interface ShareResolution {
  ok: boolean;
  reason?: "notfound" | "password" | "expired";
  gallery?: Gallery;
  canDownload?: boolean;
}

export type SelectionKind = "like" | "pick" | "retouch" | "print";

/** Отметка клиента на фото. viewerKey = "phone:<...>" (вошёл) или "token:<...>" (гость). */
export interface Selection {
  id: string;
  galleryId: string;
  assetId: string;
  kind: SelectionKind;
  viewerKey: string;
  createdAt: string;
}

// ─── Клиент ──────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  /** Нормализованный телефон (только цифры с ведущей 7), служит идентификатором. */
  phone: string;
  name?: string;
  createdAt: string;
  /** Кол-во завершённых заказов — основа для расчёта уровня скидки. */
  completedOrders: number;
}

// ─── Заказы ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "new"
  | "confirmed"
  | "in_progress"
  | "done"
  | "cancelled";

/** Выбор пользователя в калькуляторе — сохраняется в заказе целиком. */
export interface OrderSelection {
  shootType: string;
  /** Кол-во съёмочных смен (множитель для позиций с unit==="day"). */
  days: number;
  /** Названия выбранных обязательных позиций. */
  baseItems: string[];
  /** Названия выбранных доп-услуг. */
  optionItems: string[];
  /** Срочность (ускоренные сроки) — наценка из конфига. */
  urgent: boolean;
}

/** Итог расчёта — храним вилку до и после скидки + сам процент. */
export interface PriceBreakdown {
  subtotalMin: number;
  subtotalMax: number;
  discountPercent: number;
  totalMin: number;
  totalMax: number;
}

export interface Order {
  id: string;
  /** Телефон клиента, если заказ оформлен авторизованным пользователем. */
  clientPhone?: string;
  createdAt: string;
  status: OrderStatus;
  selection: OrderSelection;
  breakdown: PriceBreakdown;
  contactName?: string;
  contact?: string;
  comment?: string;
  paymentConfirmedAt?: string;
  receiptStatus?: "not_required" | "pending" | "issued" | "cancelled";
  receiptIssuedAt?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  receiptDeliveryMethod?: "Telegram" | "email" | "другое";
  receiptSentAt?: string;
  receiptAdminComment?: string;
}

// ─── Портфолио-кейсы / Блог (Этап H) ─────────────────────────────────────

export interface PortfolioCase {
  id: string;
  slug: string;
  clientName?: string;
  title: string;
  task?: string;       // задача
  solution?: string;   // решение
  result?: string;     // результат
  coverAssetId?: string;
  galleryId?: string;  // привязанная галерея (медиа кейса)
  published: boolean;
  sortOrder: number;
  createdAt: string;
  rightsStatus?: string;
  clientPermissionStatus?: string;
  peopleConsentStatus?: string;
  musicLicenseStatus?: string;
  brandUsageStatus?: string;
  projectRole?: string;
  productionTeam?: string;
  rightsNote?: string;
  publishAllowed?: boolean;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  bodyMd?: string;        // тело в markdown
  coverUrl?: string;      // обложка (URL)
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
}

// ─── Отзывы / CRM (Этап G) ──────────────────────────────────────────────

export interface Review {
  id: string;
  clientPhone?: string;
  authorName?: string;
  rating: number; // 1..5
  text: string;
  galleryId?: string;
  published: boolean;
  createdAt: string;
}

/** Агрегаты для дашборда админки. */
export interface DashboardMetrics {
  clients: number;
  orders: number;
  leads: number;
  galleries: number;
  assets: number;
  shopOrders: number;
  shopPaid: number;
  revenuePaid: number; // сумма оплаченных заказов магазина
  estRevenue: number;  // ориентир по заказам калькулятора (среднее вилки)
}

// ─── Магазин (Этап F) ─────────────────────────────────────────────────────

export interface OrderItem {
  productId: string;
  title: string;
  qty: number;
  unitPrice: number;
  total: number;
  /** Какие фото (для ретуши/печати). */
  assetIds?: string[];
}

export type ShopOrderStatus = "pending" | "paid" | "cancelled";

/** Заказ допов из галереи (ретушь/печать/фотокнига/…), с оплатой. */
export interface ShopOrder {
  id: string;
  createdAt: string;
  status: ShopOrderStatus;
  clientPhone?: string;
  contactName?: string;
  contact?: string;
  galleryId?: string;
  items: OrderItem[];
  total: number;
  paymentProvider?: string;
  paymentId?: string;
  paidAt?: string;
  paymentConfirmedAt?: string;
  receiptStatus?: "not_required" | "pending" | "issued" | "cancelled";
  receiptIssuedAt?: string;
  receiptSentAt?: string;
}

/** Заявка из формы (не обязательно привязана к расчёту калькулятора). */
export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  message: string;
  /** Откуда пришла заявка: "hero" | "calculator" | "photo" | ... */
  source: string;
}
