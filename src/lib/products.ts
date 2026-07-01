// Каталог дополнительных товаров/услуг для продажи из галереи (Этап F).
// Редактируй здесь — чек-аут и админка подхватят. Позже можно вынести в БД (services).
export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  /** photo — за кадр (умножается на число выбранных фото); item/project — за единицу. */
  unit: "photo" | "item" | "project";
  category: "retouch" | "print" | "extra" | "photobook" | "certificate" | "editing";
  /** true — количество берётся из числа отмеченных фото (ретушь/печать). */
  perSelectedPhoto?: boolean;
}

export const PRODUCTS: Product[] = [
  { id: "retouch", title: "Ретушь фото", description: "Глубокая ретушь отмеченных кадров", price: 500, unit: "photo", category: "retouch", perSelectedPhoto: true },
  { id: "print_a4", title: "Печать A4", description: "Фотопечать на премиальной бумаге", price: 400, unit: "photo", category: "print", perSelectedPhoto: true },
  { id: "extra_photo", title: "Доп. обработанные фото", description: "Дополнительные кадры в обработке", price: 600, unit: "photo", category: "extra" },
  { id: "extra_editing", title: "Доп. монтаж видео", description: "Ещё одна версия монтажа", price: 5000, unit: "project", category: "editing" },
  { id: "photobook", title: "Фотокнига", description: "Печатный фотоальбом премиум-класса", price: 6000, unit: "item", category: "photobook" },
  { id: "certificate", title: "Подарочный сертификат", description: "Сертификат на съёмку", price: 5000, unit: "item", category: "certificate" },
];

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
