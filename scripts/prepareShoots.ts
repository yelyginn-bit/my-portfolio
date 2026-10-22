import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicShoots, type Shoot} from '../src/shoots/model';
export async function prepareShoots(root=process.cwd()) {
  const raw=JSON.parse(await readFile(path.join(root,'content/shoots/catalog.json'),'utf8')) as Shoot[];
  const approved=publicShoots(raw);
  // Serialize only approved records BEFORE Vite reads any browser module.
  await writeFile(path.join(root,'src/public/shoots.generated.json'),JSON.stringify(approved,null,2)+'\n');
  return approved;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await prepareShoots();
