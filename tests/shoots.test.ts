import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,symlink,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {publicShoots,validateShoot,type Shoot,shootSeo} from '../src/shoots/model';
import {readShootInput} from '../scripts/shootInput';
import {addShoot} from '../scripts/shoot-add';
import {prepareShoots} from '../scripts/prepareShoots';
import {shootPage,shootCards} from '../scripts/shootPages';
import {avitoPrice} from '../scripts/shoot-avito';
import {PUBLIC_PRICE_BY_ID} from '../src/lib/pricing.data';
const sample:Shoot={slug:'test-shapes',title:'Форма и свет',date:'2026-10-21',genre:'предметка',consent:true,concept:['Первый нейтральный абзац концепции.','Второй абзац о свете и форме.'],cover:'001',photos:[{id:'001',alt:'Учебная геометрическая фигура',width:600,height:400,widths:[480,600]}],synthetic:true};
test('shoot privacy: only explicit boolean consent projects metadata, and malformed approved records fail closed',()=>{
 assert.deepEqual(publicShoots([{...sample,consent:false}]),[]);assert.deepEqual(publicShoots([{...sample,consent:undefined}]),[]);
 assert.equal(publicShoots([sample]).length,1);assert.throws(()=>publicShoots([sample,sample]),/Duplicate/);
 for(const value of [{...sample,slug:'../escape'},{...sample,date:'2026-02-30'},{...sample,cover:'999'},{...sample,photos:[{...sample.photos[0],widths:[960]}]}]) assert.throws(()=>validateShoot(value));
});
test('shoot page escapes owner text, has one H1 and uncropped responsive formats; public catalog prices remain exact',()=>{
 const s={...sample,title:'<script>alert(1)</script>',concept:['</script><script>bad()</script>','Описание & <тест>']};
 const html=shootPage('<html><head><script type="application/ld+json">{}</script></head><body><main>old</main><footer></footer></body></html>',s);
 assert.equal((html.match(/<h1>/g)||[]).length,1);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/image\/avif/);assert.match(html,/600w/);assert.match(html,/width="600" height="400"/);assert.match(shootCards([sample]),/\/fotosessii\/test-shapes/);
 assert.deepEqual(avitoPrice('предметка'),PUBLIC_PRICE_BY_ID['photo-product']);assert.deepEqual(avitoPrice('репортаж'),PUBLIC_PRICE_BY_ID.photo);assert.deepEqual(avitoPrice('портрет'),PUBLIC_PRICE_BY_ID['photo-studio']);
 assert.ok(shootSeo(sample).description.length>=110&&shootSeo(sample).description.length<=165);
});
test('shoot importer refuses missing consent before writing, prevents traversal/symlinks/overwrite, strips EXIF and exports real widths',async()=>{
 await mkdir(path.join(process.cwd(),'_agent-reports'),{recursive:true});
 const temp=await mkdtemp(path.join(process.cwd(),'_agent-reports/test-shoot-'));const root=path.join(temp,'project'),input=path.join(temp,'input');
 await mkdir(path.join(root,'content/shoots'),{recursive:true});await mkdir(path.join(root,'src/public'),{recursive:true});await mkdir(input);await writeFile(path.join(root,'content/shoots/catalog.json'),'[]\n');
 const meta={slug:sample.slug,title:sample.title,date:sample.date,genre:sample.genre,consent:'нет',cover:'fixture.png',photos:[{file:'fixture.png',alt:'Нейтральная тестовая фигура'}]};
 const save=async(d:unknown)=>writeFile(path.join(input,'shoot.md'),'---\n'+JSON.stringify(d)+'\n---\nПервый абзац концепции.\n\nВторой абзац концепции.\n');
 try {
  await sharp({create:{width:600,height:400,channels:3,background:{r:128,g:128,b:128}}}).png().toFile(path.join(input,'fixture.png'));await save(meta);
  await assert.rejects(()=>addShoot(input,root),/consent/);assert.equal(await readFile(path.join(root,'content/shoots/catalog.json'),'utf8'),'[]\n');assert.deepEqual(await readdir(path.join(root,'content/shoots')),['catalog.json']);
  await save({...meta,consent:'да',photos:[{file:'../escape.png',alt:'x'}]});await assert.rejects(()=>readShootInput(input),/filename/);
  await symlink(path.join(input,'fixture.png'),path.join(input,'link.png'));await save({...meta,consent:'да',cover:'link.png',photos:[{file:'link.png',alt:'x'}]});await assert.rejects(()=>readShootInput(input),/Symlink/);
  await save({...meta,consent:'да'});const s=await addShoot(input,root);assert.deepEqual(s.photos[0].widths,[480,600]);
  for(const format of ['avif','webp']) for(const width of s.photos[0].widths) {const m=await sharp(path.join(root,`content/shoots/assets/${s.slug}/001-${width}w.${format}`)).metadata();assert.equal(m.width,width);assert.equal(m.height,Math.round(width*400/600));assert.equal(m.exif,undefined);}
  await assert.rejects(()=>addShoot(input,root),/already exists/);
  await writeFile(path.join(root,'content/shoots/catalog.json'),JSON.stringify([{...s,consent:false}]));await prepareShoots(root);assert.deepEqual(JSON.parse(await readFile(path.join(root,'src/public/shoots.generated.json'),'utf8')),[]);
 } finally {await rm(temp,{recursive:true,force:true});}
});
