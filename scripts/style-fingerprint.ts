/**
 * Снимок вычисленных стилей всех узлов страницы — для проверки «правка CSS
 * ничего не изменила там, где не должна».
 *
 * Зачем отдельный инструмент, если есть computed-style-audit.ts: тот снимает
 * несколько ключевых элементов маршрута, а этот — **каждый** узел, и сразу в
 * двух темах. QWEN-04 §2 и QWEN-05 §2: светлой темы мало, расхождение
 * `!important`-слоя видно именно на тёмной.
 *
 * Ключ узла — путь в DOM (индекс среди соседей), а не «тег|класс|текст|ширина»:
 * по последнему несколько одинаковых `a.cta` на одной странице схлопывались в
 * одну запись, и различие терялось (реальная ошибка, из-за которой в QWEN-04
 * сняли не то `!important`).
 *
 * Запуск:
 *   npm run build
 *   npx tsx scripts/style-fingerprint.ts --label до
 *   # правка public/site-skin.css → npm run build
 *   npx tsx scripts/style-fingerprint.ts --label после
 *   npx tsx scripts/style-fingerprint.ts --diff до после
 * Тема включается на лету (documentElement[data-theme="dark"]), HTML не трогается.
 * Данные: .night-shots/fingerprints/<label>.json — в git не попадает.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { startLocalServer } from "./computed-style-audit.ts";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const STORE = path.join(ROOT, ".night-shots", "fingerprints");
const WIDTHS = [1440, 390];
const THEMES: Array<"light" | "dark"> = ["light", "dark"];
const PROPS = [
  "color", "backgroundColor", "backgroundImage", "borderTopColor", "borderRightColor",
  "borderBottomColor", "borderLeftColor", "borderTopWidth", "borderBottomWidth",
  "opacity", "outlineColor", "textDecorationLine", "boxShadow",
  // Ритм текста. Без них «снимок до/после» (§2 смены QWEN-05) ловил только
  // цвета: правка line-height на заголовке контактов прошла бы проверку молча —
  // доказано 25.09, когда временно возвращённый .86 не дал ни одного расхождения.
  "fontSize", "lineHeight", "letterSpacing",
];

/** Страницы, которые грузят site-skin.css: их и сравниваем. */
function skinPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix = "") => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, `${prefix}/${entry.name}`); continue; }
      if (!entry.name.endsWith(".html")) continue;
      if (!readFileSync(full, "utf8").includes("/site-skin.css")) continue;
      out.push(`${prefix}/${entry.name.replace(/\.html$/, "") || "index"}`);
    }
  };
  walk(DIST);
  return out.sort().map((p) => (p.endsWith("/index") ? p.slice(0, -6) : p)).map((p) => (p === "/index" ? "/" : p));
}

/** Путь узла от body: `DIV[2] > A[0] …`. Уникален и устойчив между сборками. */
const FP = `(function(props){
  const out={};
  const domPath = (el) => {
    const parts=[];
    for(let n=el; n && n!==document.body; n=n.parentElement){
      let i=0, sib=n;
      while((sib=sib.previousElementSibling)!==null) i++;
      parts.unshift(n.tagName+"["+i+"]");
    }
    return parts.join(">") || "BODY";
  };
  const seen=new Map();
  for(const el of document.body.querySelectorAll("*")){
    let key=domPath(el);
    const n=seen.get(key)||0; seen.set(key,n+1);
    if(n) key+="#"+n;
    const cs=getComputedStyle(el);
    let s="";
    for(const p of props) s+=cs[p]+"|";
    out[key]=s;
  }
  const bcs=getComputedStyle(document.body);
  out["BODY"]=props.map(p=>bcs[p]).join("|");
  return out;
})(${JSON.stringify(PROPS)})`;

async function loadPlaywright() {
  const name = "playwright";
  try {
    return await import(name) as { chromium: { launch(o: Record<string, unknown>): Promise<any> } };
  } catch {
    throw new Error("нужен Playwright (`npm i -D playwright && npx playwright install chromium`)");
  }
}

type Snap = Record<string, Record<string, string>>;

async function capture(): Promise<Snap> {
  const pw = await loadPlaywright();
  const { server, origin } = await startLocalServer();
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pages = skinPages();
  const snap: Snap = {};
  for (const route of pages) {
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}${route}`, { waitUntil: "load" });
        if (theme === "dark") await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
        await page.waitForTimeout(450);
        const key = `${route}@${width}×${theme}`;
        snap[key] = await page.evaluate(FP) as Record<string, string>;
        process.stdout.write(".");
      }
    }
  }
  console.log("");
  await browser.close();
  server.close();
  return snap;
}

function diff(a: Snap, b: Snap) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const report: string[] = [];
  let changedNodes = 0;
  for (const k of [...keys].sort()) {
    const [x, y] = [a[k], b[k]];
    if (!x || !y) { report.push(`${k}: есть только в одной из съёмок`); changedNodes++; continue; }
    const nodes = new Set([...Object.keys(x), ...Object.keys(y)]);
    const hits: string[] = [];
    for (const n of nodes) {
      if (x[n] === y[n]) continue;
      hits.push(`  ${n}\n    было: ${x[n] ?? "(нет)"}\n    стало: ${y[n] ?? "(нет)"}`);
    }
    if (hits.length) { changedNodes += hits.length; report.push(`${k} — узлов с расхождением: ${hits.length}\n${hits.slice(0, 12).join("\n")}${hits.length > 12 ? `\n  … ещё ${hits.length - 12}` : ""}`); }
  }
  return { changedNodes, report };
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("style-fingerprint.ts")) {
  await mkdir(STORE, { recursive: true });
  const labelAt = process.argv.indexOf("--label");
  const label = labelAt !== -1 ? process.argv[labelAt + 1] : null;
  const diffAt = process.argv.indexOf("--diff");

  if (diffAt !== -1) {
    const [aName, bName] = [process.argv[diffAt + 1], process.argv[diffAt + 2]];
    const a = JSON.parse(await readFile(path.join(STORE, `${aName}.json`), "utf8")) as Snap;
    const b = JSON.parse(await readFile(path.join(STORE, `${bName}.json`), "utf8")) as Snap;
    const { changedNodes, report } = diff(a, b);
    const text = `расхождений узлов: ${changedNodes}\n\n${report.join("\n\n")}\n`;
    await writeFile(path.join(STORE, `diff-${aName}-${bName}.md`), text);
    console.log(text.slice(0, 4000));
    console.log(`полный отчёт: .night-shots/fingerprints/diff-${aName}-${bName}.md`);
    process.exit(changedNodes ? 1 : 0);
  }

  if (!label) { console.log("нужен --label <имя> или --diff <до> <после>"); process.exit(1); }
  const snap = await capture();
  const file = path.join(STORE, `${label}.json`);
  await writeFile(file, JSON.stringify(snap));
  const nodes = Object.values(snap).reduce((s, m) => s + Object.keys(m).length, 0);
  console.log(`съёмка «${label}»: замеров ${Object.keys(snap).length}, узлов ${nodes}, файл ${path.relative(ROOT, file)}`);
  if (existsSync(file)) { /* файл записан */ }
}
