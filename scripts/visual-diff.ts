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

async function capture(label: string, only?: string) {
  const pw = await loadPlaywright();
  const { INDEXABLE_ROUTES } = await import("../src/public/routeManifest.ts");
  const routes = INDEXABLE_ROUTES.filter((r) => !only || r.path.includes(only));
  const { server, origin } = await startLocalServer();
  const dir = path.join(BASE, label);
  await mkdir(dir, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });
  const masks: Record<string, number[][]> = {};
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
        await page.screenshot({ path: path.join(dir, `${key}.png`), fullPage: true });
        await page.close();
        process.stdout.write(".");
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  await writeFile(path.join(dir, "masks.json"), JSON.stringify(masks));
  console.log(`\nкадры «${label}»: ${Object.keys(masks).length} страниц × ширин, папка ${path.relative(ROOT, dir)}`);
}

function grey(rects: number[][], png: PNG) {
  for (const [x, y, w, h] of rects) {
    for (let yy = Math.max(0, y); yy < Math.min(png.height, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(png.width, x + w); xx++) {
        const i = (png.width * yy + xx) << 2;
        png.data[i] = 40; png.data[i + 1] = 40; png.data[i + 2] = 44; png.data[i + 3] = 255;
      }
    }
  }
}

async function compare(a: string, b: string, tolerance: number) {
  const dirA = path.join(BASE, a), dirB = path.join(BASE, b);
  const masksA = JSON.parse(await readFile(path.join(dirA, "masks.json"), "utf8")) as Record<string, number[][]>;
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
    grey(rectsA, ia); grey(rectsB, ib);
    const diff = new PNG({ width: ia.width, height: ia.height });
    const changed = pixelmatch(ia.data, ib.data, diff.data, ia.width, ia.height, { threshold: 0.1, alpha: 0.4 });
    const masked = rectsA.reduce((s, r) => s + r[2] * r[3], 0);
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
} else if (args[0] === "compare") {
  const [a, b] = [flag("a"), flag("b")];
  if (!a || !b) { console.error("нужны --a <метка> --b <метка>"); process.exit(1); }
  await compare(a, b, Number(flag("tolerance", "0.05")));
} else {
  console.log("запуск: capture --label <метка> [--only <подстрока маршрута>] | compare --a <метка> --b <метка> [--tolerance 0.05]");
}
