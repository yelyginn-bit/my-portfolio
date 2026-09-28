/**
 * Е — скриншот-сравнение страниц (scripts/visual-diff.ts).
 *
 * Числовые проверки (контраст, геометрия, переполнение) не видят, «как
 * выглядит»: они ловят только то, что в них заложено. Этот инструмент
 * сравнивает картинку до и картинку после попиксельно — и показывает всё, что
 * изменилось, включая то, что никто не придумал как метрику.
 *
 *   npm run build
 *   npx tsx scripts/visual-diff.ts capture --label до
 *   # правка → npm run build
 *   npx tsx scripts/visual-diff.ts capture --label после
 *   npx tsx scripts/visual-diff.ts compare --a до --b после
 *
 * Кадр — вся страница целиком (fullPage), 1440 и 390. Перед съёмкой страница
 * прокручивается до конца и обратно: секции V3 раскрываются по скроллу, и без
 * этого два кадра одного и того же кода различались бы ниже вьюпорта.
 * Бегущая строка, видео и постеры закрашиваются константой в ОБОИХ кадрах
 * перед сравнением (иначе шум бесконечных анимаций выгладит как изменение) —
 * координаты маски сохраняются рядом с кадром.
 *
 * Данные: .night-shots/visual/<label>/ — в git не входит.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { startLocalServer } from "./computed-style-audit.ts";

const ROOT = process.cwd();
const BASE = path.join(ROOT, ".night-shots", "visual");
const WIDTHS = [1440, 390];
const MASK_SELECTOR = "[class*='marquee' i], [class*='ticker' i], video, iframe, [class*='poster' i], [class*='thumb' i], img";

async function loadPlaywright() {
  const name = "playwright";
  try {
    return await import(name) as { chromium: { launch(o: Record<string, unknown>): Promise<any> } };
  } catch {
    throw new Error("нужен Playwright с chromium: npx playwright install chromium");
  }
}

const slug = (route: string, width: number) => `${route.replace(/^\//, "").replace(/\//g, "__") || "root"}@${width}`;

async function capture(label: string, only?: string, skipShots = false) {
  const pw = await loadPlaywright();
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest.ts");
  const routes = INDEXABLE_ROUTES.filter((r) => !only || r.path.includes(only));
  const { server, origin } = await startLocalServer();
  const dir = path.join(BASE, label);
  await mkdir(dir, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });
  let masks: Record<string, number[][]> = {};
  let protects: Record<string, number[][]> = {};
  try {
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        isMobile: width === 390,
        hasTouch: width === 390,
        deviceScaleFactor: 1,
        reducedMotion: "no-preference",
      });
      for (const route of routes) {
        const page = await context.newPage();
        await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
        await page.waitForFunction(() => (document as any).fonts?.status === "loaded").catch(() => {});
        await page.waitForTimeout(400);
        // раскрыть всё, что появляется по скроллу, и вернуться наверх
        await page.evaluate(async () => {
          const h = document.body.scrollHeight;
          for (let y = 0; y < h; y += Math.round(innerHeight * 0.7)) {
            window.scrollTo(0, y);
            await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
          }
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 150));
        });
        await page.waitForTimeout(350);
        // ленивые картинки: кадр надо снимать после догрузки, иначе в
        // длинном прогоне одна и та же страница даёт два разных кадра
        // (проверено на /photo@1440: 0.17% и 0.40% между прогонами при
        // идентичном DOM). 63 из 64 картинок там loading=lazy.
        await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(200);
        const key = slug(route.path, width);
        masks[key] = await page.evaluate(`(function(sel){
          const out=[];
          for(const el of document.querySelectorAll(sel)){
            const r=el.getBoundingClientRect();
            if(r.width<2||r.height<2) continue;
            out.push([Math.round(r.left+scrollX),Math.round(r.top+scrollY),Math.round(r.width),Math.round(r.height)]);
          }
          return out.slice(0,400);
        })(${JSON.stringify(MASK_SELECTOR)})`) as number[][];
        // Непрозрачный хром, нарисованный ПОСЛЕ замазанного медиа: фиксированная
        // шапка/меню/баннер cookies. Его пиксели замазывать нельзя — иначе под
        // маской медиа пропадает всё, что в этой полосе изменилось.
        {
          protects[key] = await page.evaluate(`(function(){
            const out=[];
            for(const el of document.querySelectorAll('body *')){
              let n=el, fixed=false;
              while(n && n!==document.body){ const ps=getComputedStyle(n); if(ps.position==='fixed'||ps.position==='sticky'){fixed=true;break;} n=n.parentElement; }
              if(!fixed) continue;
              const c=getComputedStyle(el).backgroundColor.match(/rgba?\\(([^)]+)\\)/u);
              if(!c) continue;
              const parts=c[1].split(/[\\s,\\/]+/u).filter(Boolean).map(Number);
              if((parts.length>3?parts[3]:1)<0.5) continue;
              const r=el.getBoundingClientRect();
              if(r.width<2||r.height<2) continue;
              out.push([Math.round(r.left+scrollX),Math.round(r.top+scrollY),Math.round(r.width),Math.round(r.height)]);
            }
            return out.slice(0,200);
          })()`) as number[][];
        }
        if (!skipShots) await page.screenshot({ path: path.join(dir, `${key}.png`), fullPage: true });
        await page.close();
        process.stdout.write(".");
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  // Дописываем, а не перезаписываем: `capture --label X --only a` затем
  // `capture --label X --only b` иначе теряет маски первой выборки, и сравнение
  // начинает считать изменёнными пикселями картинки, которые должны быть
  // замазаны (проверено на 88 кадрах портфолио: ложные 40 % вместо 0).
  const masksFile = path.join(dir, "masks.json");
  if (existsSync(masksFile)) {
    try {
      const prev = JSON.parse(await readFile(masksFile, "utf8")) as Record<string, number[][]>;
      masks = { ...prev, ...masks };
    } catch { /* повреждённый файл маски — не повод ронять съёмку */ }
  }
  await writeFile(masksFile, JSON.stringify(masks));
  {
    const protectFile = path.join(dir, "protects.json");
    if (existsSync(protectFile)) {
      try {
        const prev = JSON.parse(await readFile(protectFile, "utf8")) as Record<string, number[][]>;
        protects = { ...prev, ...protects };
      } catch { /* повреждённый файл — перепишем с нуля */ }
    }
    await writeFile(protectFile, JSON.stringify(protects));
  }
  console.log(`\nкадры «${label}»: ${Object.keys(masks).length} страниц × ширин, папка ${path.relative(ROOT, dir)}${skipShots ? ' (обновлены только маски хрома)' : ''}`);
}

function grey(rects: number[][], png: PNG, protect: number[][] = []) {
  let painted = 0;
  const inside = (x: number, y: number) => protect.some(([px, py, pw, ph]) => x >= px && x < px + pw && y >= py && y < py + ph);
  for (const [x, y, w, h] of rects) {
    for (let yy = Math.max(0, y); yy < Math.min(png.height, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(png.width, x + w); xx++) {
        // Хром поверх замазанного кадра не замазываем: фиксированная шапка
        // рисуется ПОСЛЕ героя, и без этого исключения маска героя (1440×2092
        // на главной) съедала и шапку — правка цвета подписи кнопки
        // «Рассчитать стоимость» дала «0.000 % идентично» при 798 510
        // отличающихся пикселях кадра.
        if (inside(xx, yy)) continue;
        const i = (png.width * yy + xx) << 2;
        png.data[i] = 40; png.data[i + 1] = 40; png.data[i + 2] = 44; png.data[i + 3] = 255;
        painted++;
      }
    }
  }
  return painted;
}

async function compare(a: string, b: string, tolerance: number) {
  const dirA = path.join(BASE, a), dirB = path.join(BASE, b);
  const masksA = JSON.parse(await readFile(path.join(dirA, "masks.json"), "utf8")) as Record<string, number[][]>;
  const loadJson = async (p: string) => { try { return JSON.parse(await readFile(p, "utf8")) as Record<string, number[][]>; } catch { return {}; } };
  const protects = { ...(await loadJson(path.join(dirA, "protects.json"))), ...(await loadJson(path.join(dirB, "protects.json"))) };
  const files = (await readdir(dirA)).filter((f) => f.endsWith(".png")).sort();
  const rows: Array<{ key: string; pct: number; note: string }> = [];
  const outDir = path.join(BASE, `diff-${a}-${b}`);
  await mkdir(outDir, { recursive: true });
  for (const file of files) {
    const key = file.replace(/\.png$/, "");
    const pA = path.join(dirA, file), pB = path.join(dirB, file);
    if (!existsSync(pB)) { rows.push({ key, pct: 100, note: "нет кадра во второй съёмке" }); continue; }
    const [ia, ib] = [PNG.sync.read(await readFile(pA)), PNG.sync.read(await readFile(pB))];
    if (ia.width !== ib.width || ia.height !== ib.height) {
      rows.push({ key, pct: 100, note: `размер кадра ${ia.width}×${ia.height} → ${ib.width}×${ib.height}` });
      continue;
    }
    const rectsA = masksA[key] || [], rectsB = (JSON.parse(await readFile(path.join(dirB, "masks.json"), "utf8")) as Record<string, number[][]>)[key] || [];
    const protect = (protects[key] || []);
    const paintedA = grey(rectsA, ia, protect), paintedB = grey(rectsB, ib, protect);
    const diff = new PNG({ width: ia.width, height: ia.height });
    const changed = pixelmatch(ia.data, ib.data, diff.data, ia.width, ia.height, { threshold: 0.1, alpha: 0.4 });
    const masked = Math.max(paintedA, paintedB);
    const usable = Math.max(1, ia.width * ia.height - masked);
    const pct = Number(((changed / usable) * 100).toFixed(3));
    if (pct > tolerance) await writeFile(path.join(outDir, `${key}.png`), PNG.sync.write(diff));
    rows.push({ key, pct, note: changed ? `${changed}px из ${Math.round(usable)} (маски ${Math.round((masked / (ia.width * ia.height)) * 100)}%)` : "идентично" });
    process.stdout.write(".");
  }
  console.log("");
  rows.sort((x, y) => y.pct - x.pct);
  for (const r of rows) console.log(`${r.pct.toFixed(3).padStart(7)} %  ${r.key.padEnd(52)} ${r.note}`);
  const bad = rows.filter((r) => r.pct > tolerance);
  console.log(`\nотличий больше допуска (${tolerance}%): ${bad.length} из ${rows.length}; diff-кадры: ${path.relative(ROOT, outDir)}`);
  if (bad.length) process.exitCode = 1;
}

const args = process.argv.slice(2);
const flag = (name: string, dflt?: string) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : dflt;
};
if (args[0] === "capture") {
  const label = flag("label");
  if (!label) { console.error("нужен --label <имя>"); process.exit(1); }
  await capture(label, flag("only"));
} else if (args[0] === "chrome") {
  // Обновляет только protects.json существующей съёмки — пиксели кадров не
  // трогаются, поэтому его можно прогнать по «до»/«после» после починки
  // инструмента, не переснимая 140 страниц заново.
  const label = flag("label");
  if (!label) { console.error("нужен --label <имя>"); process.exit(1); }
  await capture(label, flag("only"), false);
} else if (args[0] === "compare") {
  const [a, b] = [flag("a"), flag("b")];
  if (!a || !b) { console.error("нужны --a <метка> --b <метка>"); process.exit(1); }
  await compare(a, b, Number(flag("tolerance", "0.05")));
} else {
  console.log("запуск: capture --label <метка> [--only <подстрока маршрута>] | compare --a <метка> --b <метка> [--tolerance 0.05]");
}
