// AI-сервис (Этап I): теги и поиск по изображениям. Сейчас детерминированный mock,
// архитектура готова к подключению vision-API (Anthropic/OpenAI) — замени MockAIService
// на реализацию, дёргающую serverless-эндпоинт, и переключи getAI() по env.
import type { Asset } from "./types";

export interface AIService {
  readonly name: string;
  /** Сгенерировать теги для ассета. */
  tagImage(asset: Asset): Promise<string[]>;
  /** Текстовый поиск/фильтр по уже проставленным тегам + имени файла. */
  search(query: string, assets: Asset[]): Asset[];
}

const PALETTE = ["крупный план", "свет", "улица", "студия", "детали", "эмоции", "движение"];
const DICT: [RegExp, string][] = [
  [/portrait|порт/i, "портрет"],
  [/wed|свад/i, "свадьба"],
  [/food|еда|menu/i, "еда"],
  [/prod|товар|product|goods/i, "предметка"],
  [/event|меро|conf/i, "репортаж"],
  [/interior|интер|room/i, "интерьер"],
  [/team|команд|staff/i, "команда"],
];

class MockAIService implements AIService {
  readonly name = "mock";

  async tagImage(asset: Asset): Promise<string[]> {
    const tags = new Set<string>();
    tags.add(asset.type === "video" ? "видео" : "фото");
    const fn = (asset.filename || "").toLowerCase();
    for (const [re, t] of DICT) if (re.test(fn)) tags.add(t);
    if (asset.width && asset.height) tags.add(asset.width >= asset.height ? "горизонталь" : "вертикаль");
    // Детерминированный «случайный» тег по id — стабилен между прогонами.
    const h = [...asset.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    tags.add(PALETTE[h % PALETTE.length]);
    return [...tags];
  }

  search(query: string, assets: Asset[]): Asset[] {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        (a.aiTags || []).some((t) => t.toLowerCase().includes(q)) ||
        (a.filename || "").toLowerCase().includes(q),
    );
  }
}

let _ai: AIService | null = null;
export function getAI(): AIService {
  if (!_ai) _ai = new MockAIService();
  return _ai;
}
