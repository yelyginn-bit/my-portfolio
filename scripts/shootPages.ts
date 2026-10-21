import {mkdir,copyFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {SHOOTS} from '../src/public/shoots.data';
import {photoPath,shootPath,type Shoot,type ShootPhoto} from '../src/shoots/model';
import {inputFile} from './shootInput';
export const htmlEscape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const picture=(s:Shoot,p:ShootPhoto,eager=false)=>{
  const largest=p.widths.at(-1)!;const candidates=(format:string)=>p.widths.map(w=>`${photoPath(s,p,w,format)} ${w}w`).join(', ');
  return `<picture><source type="image/avif" srcset="${candidates('avif')}" sizes="(min-width: 900px) 46vw, 94vw"><img src="${photoPath(s,p,largest)}" srcset="${candidates('webp')}" sizes="(min-width: 900px) 46vw, 94vw" alt="${htmlEscape(p.alt)}" width="${p.width}" height="${p.height}" loading="${eager?'eager':'lazy'}" decoding="async"></picture>`;
};
export const shootStyles=`<style data-shoot-styles>
.shoot-page,.shoot-list{overflow-wrap:anywhere}.shoot-list{scroll-margin-top:96px}.shoot-page{padding-top:clamp(88px,8vw,120px)}.shoot-page .shoot-back{display:inline-flex;min-height:44px;align-items:center;margin-bottom:24px;text-decoration:underline}.shoot-page h1{max-width:20ch}.shoot-page .shoot-concept{max-width:65ch;margin:32px 0}.shoot-page .shoot-concept p+p{margin-top:20px}.shoot-grid,.shoot-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.shoot-grid figure{margin:0}.shoot-grid img{width:100%;height:auto;display:block}.shoot-grid figcaption{font-size:14px;margin-top:8px;color:var(--ds-text-secondary)}.shoot-cards a{display:block;min-width:0}.shoot-cards img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}.shoot-cards h3{font-family:var(--ds-font-display);font-size:clamp(20px,3vw,32px);margin-top:16px}.shoot-cards a:focus-visible,.shoot-grid a:focus-visible{outline:3px solid var(--ds-violet);outline-offset:4px}.shoot-meta{font-family:var(--ds-font-mono);margin:20px 0;color:var(--ds-orange)}@media(max-width:720px){.shoot-grid,.shoot-cards{grid-template-columns:1fr}.shoot-page h1{font-size:clamp(32px,10vw,60px)}}
</style>`;
export function shootCards(shoots:readonly Shoot[]=SHOOTS) {
  if (!shoots.length) return '';
  return `<section class="shoot-list" id="fotosessii"><div class="wrap"><h2>Фотосессии</h2><div class="shoot-cards">${shoots.map(s=>`<a href="${shootPath(s)}">${picture(s,s.photos.find(p=>p.id===s.cover)!)}<p class="shoot-meta">${htmlEscape(s.genre)} // ${s.date}</p><h3>${htmlEscape(s.title)}</h3>${s.synthetic?'<p>Тестовая синтетическая серия, не клиентская работа</p>':''}</a>`).join('')}</div></div></section>`;
}
export function shootPage(template:string,s:Shoot) {
  const main=`<main class="shoot-page"><div class="wrap"><a class="shoot-back" href="/photo#fotosessii">← Все фотосессии</a><p class="eyebrow">${htmlEscape(s.genre)}</p><h1>${htmlEscape(s.title)}</h1><p class="shoot-meta"><time datetime="${s.date}">${s.date}</time></p>${s.synthetic?'<p>Тестовая синтетическая серия. Изображения созданы программно; это не клиентская съёмка.</p>':''}<div class="shoot-concept">${s.concept.map(p=>`<p>${htmlEscape(p)}</p>`).join('')}</div><section aria-label="Фотографии серии" class="shoot-grid">${s.photos.map((p,i)=>`<figure><a href="${photoPath(s,p,p.widths.at(-1)!)}" aria-label="${htmlEscape(p.alt)} — открыть полный размер">${picture(s,p,i===0)}</a><figcaption>${htmlEscape(p.alt)}</figcaption></figure>`).join('')}</section><section><a class="cta-ghost" href="/contact">Обсудить съёмку</a></section></div></main>`;
  if (!/<main\b[^>]*>[\s\S]*?<\/main>/iu.test(template)) throw Error('Photo template has no main');
  return template.replace(/<main\b[^>]*>[\s\S]*?<\/main>/iu,main)
    .replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/giu,'')
    .replace('</head>',shootStyles+'</head>');
}
export async function copyShootAssets(root:string,dist:string) {
  for (const s of SHOOTS) {
    const base=path.join(root,'content/shoots/assets',s.slug);
    if (await realpath(base)!==base) throw Error('Shoot asset folder must not be a symlink');
    const target=path.join(dist,'shoots',s.slug);await mkdir(target,{recursive:true});
    for (const p of s.photos) for (const w of p.widths) for (const format of ['webp','avif']) {
      const file=`${p.id}-${w}w.${format}`;await copyFile(await inputFile(base,file),path.join(target,file));
    }
  }
}
