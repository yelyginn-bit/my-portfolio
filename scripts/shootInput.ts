import {readFile, realpath, lstat} from 'node:fs/promises';
import path from 'node:path';
import {SHOOT_GENRES, type ShootGenre} from '../src/shoots/model';
export interface ShootInput {slug: string; title: string; concept: string[]; date: string; genre: ShootGenre; consent: boolean; cover: string; synthetic: boolean; photos: {file: string; alt: string}[]; pairs: {before: string; after: string; label: string}[]}
export async function inputFile(folder: string, file: string) {
  if (typeof file !== 'string' || !file || file !== path.basename(file) || file === '.' || file === '..' || file.includes('\\')) throw Error('File must be a plain filename');
  const base = await realpath(folder); const full = path.join(base,file);
  if ((await lstat(full)).isSymbolicLink() || await realpath(full) !== full) throw Error('Symlinks are not accepted');
  if (!(await lstat(full)).isFile()) throw Error('Expected a file');
  return full;
}
export async function readShootInput(folder: string): Promise<ShootInput> {
  const text = (await readFile(await inputFile(folder,'shoot.md'),'utf8')).replaceAll('\r\n','\n');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(text);if (!m) throw Error('shoot.md: JSON front matter between --- lines required');
  const d = JSON.parse(m[1]);const concept=m[2].trim().split(/\n\s*\n/u).map(p=>p.trim());
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(d.slug) || d.slug.length>64 || typeof d.title!=='string' || d.title.trim().length<3 || d.title.length>100) throw Error('Invalid slug/title');
  if (!SHOOT_GENRES.includes(d.genre) || !['да','нет'].includes(d.consent)) throw Error('Specify genre and consent: да/нет');
  if (typeof d.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/u.test(d.date) || !Number.isFinite(Date.parse(d.date)) || new Date(d.date).toISOString().slice(0,10)!==d.date) throw Error('Invalid date');
  if (concept.length<2 || concept.length>4 || concept.some(p=>!p || p.length>2000)) throw Error('Concept needs 2–4 paragraphs');
  if (!Array.isArray(d.photos) || !d.photos.length || d.photos.length>100) throw Error('Photos required');
  const files=new Set<string>();
  for (const p of d.photos) {if (!p || typeof p.file!=='string' || !/\.(?:jpe?g|png|webp|avif|tiff?)$/iu.test(p.file) || typeof p.alt!=='string' || !p.alt.trim() || p.alt.length>300 || files.has(p.file)) throw Error('Invalid/duplicate photo or missing alt');await inputFile(folder,p.file);files.add(p.file);}
  if (!files.has(d.cover)) throw Error('Cover must name a listed photo');
  const pairs=d.pairs??[];if (!Array.isArray(pairs)) throw Error('Pairs must be an array');
  for (const pair of pairs) if (!files.has(pair.before) || !files.has(pair.after) || pair.before===pair.after || typeof pair.label!=='string' || !pair.label.trim()) throw Error('Pair must name two listed photos and its label');
  return {...d,concept,consent:d.consent==='да',synthetic:d.synthetic===true,pairs};
}
