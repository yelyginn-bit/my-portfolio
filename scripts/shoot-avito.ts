/** Offline draft images only. Platform requirements were not accessible; size is provisional. */
import {mkdir,readFile,writeFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {readShootInput,inputFile} from './shootInput';
import {PUBLIC_PRICE_BY_ID} from '../src/lib/pricing.data';
import {htmlEscape} from './shootPages';
import type {ShootGenre} from '../src/shoots/model';
const priceIds:Record<ShootGenre,string>={'портрет':'photo-studio','студия':'photo-studio','репортаж':'photo','предметка':'photo-product'};
export const avitoPrice=(genre:ShootGenre)=>PUBLIC_PRICE_BY_ID[priceIds[genre]];
export const AVITO_DRAFT_SIZE={width:1280,height:960,verified:false};
export async function makeAvito(folder:string,output?:string,root=process.cwd()) {
  const s=await readShootInput(folder);const item=avitoPrice(s.genre);if (!item) throw Error('Public photo price missing');
  const out=output||path.join(root,'_agent-reports/avito-52',s.slug);
  if (await lstat(out).then(()=>true,()=>false)) throw Error('Output already exists; refusing overwrite');
  await mkdir(out,{recursive:true});
  const tokens=await readFile(path.join(root,'src/design-system.css'),'utf8');
  const token=(name:string)=>{const value=tokens.match(new RegExp(`--ds-${name}:\\s*(#[a-f0-9]+)`,'iu'))?.[1];if(!value)throw Error('Missing site token '+name);return value;};
  const ink=token('on-accent'),paper=token('bg'),orange=token('orange'),fog=token('fog');
  let fonts='';
  for (const family of ['inter','roboto-mono']) for (const weight of [400,700]) for(const subset of ['latin','cyrillic']) {
    const b64=(await readFile(path.join(root,`public/fonts/${family}/${family}-${weight}-${subset}.woff2`))).toString('base64');
    fonts+=`@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${subset==='latin'?'U+0000-024F':'U+0400-052F'}}`;
  }
  const images=await Promise.all(s.photos.map(async p=>'data:image/webp;base64,'+(await sharp(await inputFile(folder,p.file)).rotate().resize({width:1600,withoutEnlargement:true}).webp({quality:90}).toBuffer()).toString('base64')));
  const cover=s.photos.findIndex(p=>p.file===s.cover);const styles=['minimal','editorial',...(s.pairs.length?['before-after']:[])];
  const manifest:any={size:AVITO_DRAFT_SIZE,source:'https://support.avito.ru/articles/4351',sourceStatus:'browser security policy blocked; no workaround; size is provisional, not verified Avito requirements',synthetic:s.synthetic,price:{id:item.id,text:item.price,limitations:item.limitations},styles:[],skipped:s.pairs.length?[]:['before-after: no explicit pairs supplied'],publishing:'local drafts only; no upload',conceptExcerpts:'up to 180 characters per slide; full text remains on the site' };
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:AVITO_DRAFT_SIZE,deviceScaleFactor:1});await page.route('**/*',r=>r.abort());
    for (const style of styles) {
      const dir=path.join(out,style);await mkdir(dir);
      const files=[];
      for (let i=0;i<6;i++) {
        const image=images[i===0?cover:(i-1)%images.length];const fullParagraph=i===0?s.title:i===1?s.concept[0]:i===2?s.concept[1]:i===3?s.photos[(i-1)%s.photos.length].alt:i===4?item.limitations:`${s.genre} // ${s.date}`;
        const paragraph=fullParagraph.length>180?fullParagraph.slice(0,177)+'…':fullParagraph;
        let media=`<img src="${image}" alt="">`;
        if(style==='before-after') {const pair=s.pairs[i%s.pairs.length];media=`<div class="pair"><figure><img src="${images[s.photos.findIndex(p=>p.file===pair.before)]}" alt=""><figcaption>ДО</figcaption></figure><figure><img src="${images[s.photos.findIndex(p=>p.file===pair.after)]}" alt=""><figcaption>ПОСЛЕ</figcaption></figure><p>${htmlEscape(pair.label)}</p></div>`;}
        const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src data:;font-src data:;style-src 'unsafe-inline'"><style>${fonts}
*{box-sizing:border-box}body{margin:0;background:${paper};color:${ink};font:32px/1.24 inter,sans-serif;width:1280px;height:960px;overflow:hidden}header,footer{position:absolute;left:48px;right:48px;display:flex;justify-content:space-between;gap:24px;font:22px/1.2 roboto-mono,monospace}header{top:32px}footer{bottom:32px;border-top:2px solid ${ink};padding-top:18px}main{position:absolute;top:104px;bottom:112px;left:48px;right:48px;display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:center}.media{height:100%;min-width:0;background:${fog};overflow:hidden}.media>img{display:block;width:100%;height:100%;object-fit:contain}h1{font-size:${Math.max(36,64-Math.max(0,s.title.length-22)*0.5)}px;line-height:1;letter-spacing:-2px;margin:0 0 24px;overflow-wrap:anywhere}p{margin:0 0 22px}.copy>p:not(.genre):not(.price):not(.notice){font-size:28px}.copy{min-width:0}.genre{font:22px roboto-mono,monospace;text-transform:uppercase}.price{font-weight:700;font-size:36px;border-left:6px solid ${orange};padding-left:18px}.notice{font:18px/1.3 roboto-mono,monospace}body.minimal main{grid-template-columns:1.25fr 1fr}body.editorial h1{font-size:${Math.max(36,70-Math.max(0,s.title.length-22)*0.55)}px}body.editorial .media{transform:rotate(-2deg)}body.before-after main{grid-template-columns:1.3fr 1fr}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;height:100%;align-content:center}.pair figure{margin:0;min-width:0}.pair img{width:100%;height:400px;object-fit:contain}.pair figcaption{font:20px roboto-mono,monospace;padding:12px 0}.pair p{grid-column:1/-1;font-size:20px}.price small{font-weight:400;font-size:22px;display:block;margin-top:12px}
</style></head><body class="${style}"><header><span>YELYGINN // ФОТОСЪЁМКА</span><span>${String(i+1).padStart(2,'0')} / 06</span></header><main><div class="media">${media}</div><div class="copy"><p class="genre">${htmlEscape(s.genre)}</p><h1>${htmlEscape(s.title)}</h1>${i>0?`<p>${htmlEscape(paragraph)}</p>`:''}<p class="price">${htmlEscape(item.price)}<small>${htmlEscape(item.title)}</small></p>${s.synthetic?'<p class="notice">ТЕСТОВАЯ СИНТЕТИЧЕСКАЯ СЕРИЯ // НЕ КЛИЕНТСКАЯ РАБОТА</p>':''}</div></main><footer><span>yelyginn.ru</span><span>Локальный макет · ${s.date}</span></footer></body></html>`;
        await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
        const fits=await page.evaluate(()=>[...document.querySelectorAll('.copy,header,footer')].every(e=>{const r=e.getBoundingClientRect();const box=document.querySelector('main')!.getBoundingClientRect();if(e.classList.contains('copy')&&(r.top<box.top||r.bottom>box.bottom))return false;return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollHeight<=e.clientHeight+1}));
        if(!fits) throw Error(`Text overflow: ${style}/${i}`);
        const name=i===0?'00-cover':`${String(i).padStart(2,'0')}-slide`;await writeFile(path.join(dir,name+'.html'),html);await page.screenshot({path:path.join(dir,name+'.jpg'),type:'jpeg',quality:88});files.push(name+'.jpg');
      }
      manifest.styles.push({style,files});
    }
  } finally {await browser.close();}
  await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {if(!process.argv[2])throw Error('Usage: npm run shoot:avito -- <folder> [output]');console.log(JSON.stringify(await makeAvito(path.resolve(process.argv[2]),process.argv[3]?path.resolve(process.argv[3]):undefined)));}
