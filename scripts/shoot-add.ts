import {mkdir,mkdtemp,readFile,writeFile,rename,rm,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {readShootInput,inputFile} from './shootInput';
import {prepareShoots} from './prepareShoots';
import {validateShoot, type Shoot} from '../src/shoots/model';
export const SHOOT_WIDTHS=[480,960,1600,2400] as const;
export async function addShoot(folder: string, root=process.cwd()) {
  const input=await readShootInput(folder);
  if (!input.consent) throw Error('Publication refused: consent must explicitly be да; no public data or assets written');
  const catalogFile=path.join(root,'content/shoots/catalog.json');const catalog=JSON.parse(await readFile(catalogFile,'utf8')) as Shoot[];
  if (catalog.some(s=>s.slug===input.slug)) throw Error('Slug already exists; refusing overwrite');
  const assets=path.join(root,'content/shoots/assets');await mkdir(assets,{recursive:true});const target=path.join(assets,input.slug);
  if (await lstat(target).then(()=>true,()=>false)) throw Error('Asset folder already exists');
  const scratch=await mkdtemp(path.join(assets,'.import-'));let moved=false;
  try {
    const photos=[];
    for (const [index,p] of input.photos.entries()) {
      const id=String(index+1).padStart(3,'0');const original=await sharp(await inputFile(folder,p.file)).rotate().toBuffer({resolveWithObject:true});
      const width=original.info.width,height=original.info.height;const widths=[...SHOOT_WIDTHS.filter(w=>w<width),Math.min(width,2400)].filter((v,i,a)=>a.indexOf(v)===i);
      for (const w of widths) {const image=sharp(original.data).resize({width:w,withoutEnlargement:true});await image.clone().webp({quality:82}).toFile(path.join(scratch,`${id}-${w}w.webp`));await image.clone().avif({quality:50}).toFile(path.join(scratch,`${id}-${w}w.avif`));}
      const canonical=await sharp(path.join(scratch,`${id}-${widths.at(-1)}w.webp`)).metadata();
      photos.push({id,alt:p.alt,width:canonical.width!,height:canonical.height!,widths});
    }
    const shoot:Shoot={slug:input.slug,title:input.title,concept:input.concept,date:input.date,genre:input.genre,consent:true,cover:photos[input.photos.findIndex(p=>p.file===input.cover)].id,photos,...(input.synthetic?{synthetic:true}:{})};validateShoot(shoot);
    await rename(scratch,target);moved=true;
    await writeFile(catalogFile,JSON.stringify([...catalog,shoot],null,2)+'\n');await prepareShoots(root);return shoot;
  } finally {if (!moved) await rm(scratch,{recursive:true,force:true});}
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw Error('Usage: npm run shoot:add -- <folder>');
  const folder=path.resolve(process.argv[2]);console.log('Imported', (await addShoot(folder)).slug);
  if(process.argv.includes('--avito')) {const {makeAvito}=await import('./shoot-avito');console.log('Local Avito drafts',JSON.stringify(await makeAvito(folder)));}
}
