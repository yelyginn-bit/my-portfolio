// Распознавание лиц (Этап I): группировка кадров по «людям». Сейчас детерминированный
// feature flag по умолчанию выключен. Production не отправляет изображения во
// внешние сервисы и не создаёт биометрические embeddings.
// pgvector-эмбеддинги в таблицах face_groups/face_instances). Замени MockFaceService.
import type { Asset } from "./types";

export interface FaceService {
  readonly name: string;
  /** Возвращает соответствие assetId → имя группы лица. */
  groupFaces(assets: Asset[]): Promise<Record<string, string>>;
}

class MockFaceService implements FaceService {
  readonly name = "mock";

  async groupFaces(assets: Asset[]): Promise<Record<string, string>> {
    const photos = assets.filter((a) => a.type === "photo");
    const n = Math.min(4, Math.max(1, Math.ceil(photos.length / 3)));
    const out: Record<string, string> = {};
    for (const a of photos) {
      const h = [...a.id].reduce((x, c) => x + c.charCodeAt(0), 0);
      out[a.id] = `Персона ${(h % n) + 1}`;
    }
    return out;
  }
}

class DisabledFaceService implements FaceService {
  readonly name = "disabled";
  async groupFaces(): Promise<Record<string, string>> { return {}; }
}

let _face: FaceService | null = null;
export function getFace(): FaceService {
  const enabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_FACE_GROUPING === "true";
  if (!_face) _face = enabled ? new MockFaceService() : new DisabledFaceService();
  return _face;
}
