/** Raw catalog stays in content/. Only its consented projection enters the browser. */
export const SHOOT_GENRES = ['портрет', 'студия', 'репортаж', 'предметка'] as const;
export type ShootGenre = typeof SHOOT_GENRES[number];
export interface ShootPhoto {id: string; alt: string; width: number; height: number; widths: number[]}
export interface Shoot {slug: string; title: string; concept: string[]; date: string; genre: ShootGenre; consent: boolean; photos: ShootPhoto[]; cover: string; synthetic?: boolean}
export const shootPath = (s: Pick<Shoot, 'slug'>) => `/fotosessii/${s.slug}`;
export const photoPath = (s: Pick<Shoot, 'slug'>, p: ShootPhoto, width: number, format = 'webp') => `/shoots/${s.slug}/${p.id}-${width}w.${format}`;
export function validateShoot(s: Shoot): void {
  if (!s || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(s.slug) || s.slug.length > 64) throw Error('Invalid slug');
  if (typeof s.title !== 'string' || s.title.trim().length < 3 || s.title.length > 100) throw Error('Invalid title');
  if (!Array.isArray(s.concept) || s.concept.length < 2 || s.concept.length > 4 || s.concept.some(p => typeof p !== 'string' || !p.trim() || p.length > 2000)) throw Error('Concept needs 2–4 paragraphs');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(s.date) || !Number.isFinite(Date.parse(s.date)) || new Date(s.date).toISOString().slice(0,10) !== s.date) throw Error('Invalid date');
  if (!SHOOT_GENRES.includes(s.genre) || typeof s.consent !== 'boolean') throw Error('Invalid genre/consent');
  if (s.synthetic!==undefined && typeof s.synthetic!=='boolean') throw Error('Invalid synthetic flag');
  if (!Array.isArray(s.photos) || !s.photos.length || s.photos.length > 100) throw Error('Photos required');
  const ids = new Set<string>();
  for (const p of s.photos) {
    if (!/^\d{3}$/u.test(p.id) || ids.has(p.id) || typeof p.alt !== 'string' || !p.alt.trim() || p.alt.length > 300) throw Error('Invalid photo/alt');
    ids.add(p.id);
    if (![p.width,p.height].every(n => Number.isSafeInteger(n) && n > 0) || !Array.isArray(p.widths) || !p.widths.length || p.widths.some((w,i) => !Number.isSafeInteger(w) || w <= 0 || w > p.width || (i > 0 && w <= p.widths[i-1]))) throw Error('Invalid dimensions');
  }
  if (!ids.has(s.cover)) throw Error('Cover must be a listed photo');
}
export function publicShoots(raw: Shoot[]): Shoot[] {
  if (!Array.isArray(raw)) throw Error('Catalog must be an array');
  const result = raw.filter(s => s.consent === true);
  const slugs = new Set<string>();
  for (const s of result) {validateShoot(s); if (slugs.has(s.slug)) throw Error('Duplicate shoot'); slugs.add(s.slug);}
  return result;
}
export function shootSeo(s: Shoot) {
  return {title: `${s.title.slice(0,40)} — фотосессия | YELYGINN`, description: `${s.title.slice(0,40)}. Жанр: ${s.genre}. Галерея фотографий, дата и концепция съёмки. Посмотрите серию целиком и узнайте, как обсудить свою фотосессию.`.slice(0,160)};
}
