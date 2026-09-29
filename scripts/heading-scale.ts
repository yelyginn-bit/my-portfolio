/**
 * Замер типографической шкалы (PROMPT-36 §2): вычисленные стили каждого
 * видимого H1 и H2 на каждом маршруте, 1440 и 390. Не CSS, как он записан, а
 * как его посчитал браузер: в проекте объявленное не всегда доходит до
 * рендера (слои !important, порядок подключения).
 *
 *   npm run build
 *   npx tsx scripts/heading-scale.ts capture <метка>        — снять, .night-shots/headings/<метка>.json
 *   npx tsx scripts/heading-scale.ts table <метка>          — таблица «маршрут → H1»
 *   npx tsx scripts/heading-scale.ts diff <до> <после>      — таблица H1 до → после
 *
 * Данные в git не попадают.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startLocalServer } from "./computed-style-audit.ts";
import { INDEXABLE_ROUTES } from "../src/public/routeManifest.ts";

const STORE = path.join(process.cwd(), ".night-shots", "headings");
const WIDTHS = [1440, 390];

export interface HeadingSample {
  tag: "H1" | "H2";
  fs: number;
  lh: number;
  fw: string;
  ls: string;
  tt: string;
  ff: string;
  text: string;
}

const PROBE = `() => [...document.querySelectorAll("h1, h2")]
  .filter((el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && s.display !== "none" && s.visibility !== "hidden" && !el.closest("[aria-hidden='true']");
  })
  .map((el) => {
    const s = getComputedStyle(el);
    return {
      tag: el.tagName,
      fs: Math.round(parseFloat(s.fontSize) * 10) / 10,
      lh: s.lineHeight === "normal" ? 0 : Math.round(parseFloat(s.lineHeight) / parseFloat(s.fontSize) * 100) / 100,
      fw: s.fontWeight,
      ls: s.letterSpacing === "normal" ? "0" : (Math.round(parseFloat(s.letterSpacing) / parseFloat(s.fontSize) * 1000) / 1000) + "em",
      tt: s.textTransform,
      ff: s.fontFamily.split(",")[0].replace(/["']/g, ""),
      text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 60),
    };
  })`;

async function capture(label: string) {
  const browser = await chromium.launch({ headless: true });
  const { server, origin } = await startLocalServer();
  const out: Record<string, HeadingSample[]> = {};
  try {
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        isMobile: width === 390,
        hasTouch: width === 390,
        deviceScaleFactor: width === 390 ? 2 : 1,
      });
      const page = await context.newPage();
      for (const route of INDEXABLE_ROUTES) {
        await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
        await page.evaluate("document.fonts.ready");
        out[`${route.path}@${width}`] = await page.evaluate(`(${PROBE})()`) as HeadingSample[];
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  await mkdir(STORE, { recursive: true });
  await writeFile(path.join(STORE, `${label}.json`), JSON.stringify(out, null, 1));
  console.log(`снято: ${Object.keys(out).length} замеров → .night-shots/headings/${label}.json`);
}

const load = async (label: string) => JSON.parse(await readFile(path.join(STORE, `${label}.json`), "utf8")) as Record<string, HeadingSample[]>;
const h1 = (list: HeadingSample[] | undefined) => list?.find((x) => x.tag === "H1");
const fmt = (x?: HeadingSample) => x ? `${x.fs}/${x.lh || "–"}/${x.fw}/${x.tt === "uppercase" ? "КАПС" : "строчн."}/${x.ls}` : "нет H1";

async function table(label: string) {
  const data = await load(label);
  for (const route of INDEXABLE_ROUTES) {
    console.log(`${route.path.padEnd(52)} 1440: ${fmt(h1(data[`${route.path}@1440`])).padEnd(28)} 390: ${fmt(h1(data[`${route.path}@390`]))}`);
  }
}

async function diff(a: string, b: string) {
  const [da, db] = await Promise.all([load(a), load(b)]);
  for (const route of INDEXABLE_ROUTES) {
    for (const width of WIDTHS) {
      const key = `${route.path}@${width}`;
      const before = fmt(h1(da[key])), after = fmt(h1(db[key]));
      if (before !== after) console.log(`${key.padEnd(56)} ${before}  →  ${after}`);
    }
  }
}

const [cmd, x, y] = process.argv.slice(2);
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  if (cmd === "capture") await capture(x);
  else if (cmd === "table") await table(x);
  else if (cmd === "diff") await diff(x, y);
  else console.log("usage: heading-scale.ts capture <label> | table <label> | diff <a> <b>");
}
