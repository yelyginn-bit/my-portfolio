import { createHash } from "node:crypto";
import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export const ORIGIN = "https://yelyginn.ru";
export const KEY_LOCATION = `${ORIGIN}/indexnow-key.txt`;
export const ENDPOINT = "https://api.indexnow.org/indexnow";
const PRIVATE = /^\/(?:api|account|admin|gallery|g|journal|_kit)(?:\/|$)|^\/photo\/|^\/portfolio\/photo(?:\/|$)/;

export function publicUrl(value) {
  const url = new URL(value);
  if (url.origin !== ORIGIN || url.username || url.password || url.search || url.hash
    || /%|\/\//.test(url.pathname) || PRIVATE.test(url.pathname)
    || (url.pathname !== "/" && url.pathname.endsWith("/"))) {
    throw new Error("IndexNow accepts only public canonical URLs of yelyginn.ru");
  }
  return url.href;
}

function attr(tag, name) {
  return new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag)?.[2] || "";
}

function semanticMain(html) {
  // Layout, CSS classes, controls' IDs and build hashes do not refresh content.
  // Preserve visible text, media, links and accessibility labels.
  return html.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<([a-z][a-z0-9:-]*)\b[^>]*>/gi, (tag, name) => {
      const attributes = ["href", "src", "srcset", "alt", "title", "poster", "aria-label", "data-video-id"]
        .map((key) => attr(tag, key)).filter(Boolean);
      return `<${name.toLowerCase()} ${JSON.stringify(attributes)}>`;
    }).replace(/\s+/g, " ").trim();
}

export function documentRecord(value, html) {
  const url = publicUrl(value);
  const links = html.match(/<link\b[^>]*>/gi) || [];
  const canonicals = links.filter((tag) => attr(tag, "rel").toLowerCase() === "canonical");
  if (canonicals.length !== 1 || attr(canonicals[0], "href") !== url) throw new Error(`Canonical mismatch: ${url}`);
  const meta = html.match(/<meta\b[^>]*>/gi) || [];
  const robots = meta.filter((tag) => attr(tag, "name").toLowerCase() === "robots").map((tag) => attr(tag, "content")).join(",");
  if (/noindex|none/i.test(robots)) throw new Error(`Noindex page: ${url}`);
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  if (!title || !main || !/<h1\b/i.test(main)) throw new Error(`Missing public page content: ${url}`);
  const description = meta.filter((tag) => attr(tag, "name").toLowerCase() === "description").map((tag) => attr(tag, "content"));
  const structured = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => attr(`<script ${match[1]}>`, "type") === "application/ld+json")
    .map((match) => JSON.parse(match[2]));
  // Ignore build hashes, analytics scripts and shared navigation/footer chrome.
  // Keep the rendered main content and structured facts that search engines see.
  const content = semanticMain(main);
  const hash = createHash("sha256").update(JSON.stringify({ title, description, content, structured })).digest("hex");
  return { url, hash, title };
}

function validateSnapshot(snapshot) {
  if (snapshot.schema !== 1 || snapshot.origin !== ORIGIN || !Array.isArray(snapshot.routes)) throw new Error("Invalid public snapshot");
  const urls = new Set();
  for (const item of snapshot.routes) {
    publicUrl(item.url);
    if (!/^[a-f0-9]{64}$/.test(item.hash) || urls.has(item.url)) throw new Error("Invalid or duplicate snapshot record");
    urls.add(item.url);
  }
}

export function changedUrls(before, after) {
  validateSnapshot(before); validateSnapshot(after);
  const old = new Map(before.routes.map((item) => [item.url, item.hash]));
  const next = new Map(after.routes.map((item) => [item.url, item.hash]));
  return [...new Set([...old.keys(), ...next.keys()])].filter((url) => old.get(url) !== next.get(url)).sort();
}

function validDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function contentHistory(before, after, history, releaseDate) {
  validateSnapshot(before); validateSnapshot(after);
  if (!validDay(releaseDate)) throw new Error("Invalid source release date");
  if (history && (history.schema !== 1 || history.origin !== ORIGIN || !Array.isArray(history.routes))) throw new Error("Invalid content history");
  const previous = new Map((history?.routes || []).map((record) => {
    publicUrl(record.url);
    if (!/^[a-f0-9]{64}$/.test(record.hash) || (record.lastmod != null && (!validDay(record.lastmod) || record.lastmod > releaseDate))) throw new Error("Invalid content history record");
    return [record.url, record];
  }));
  if (previous.size !== (history?.routes.length || 0)) throw new Error("Duplicate content history record");
  const old = new Map(before.routes.map((record) => [record.url, record.hash]));
  return { schema: 1, origin: ORIGIN, routes: after.routes.map((record) => {
    const known = previous.get(record.url);
    const lastmod = known?.hash === record.hash ? known.lastmod
      : old.get(record.url) !== record.hash ? releaseDate : null;
    return { url: record.url, hash: record.hash, lastmod: lastmod ?? null };
  }) };
}

export function sitemapWithHistory(xml, history) {
  const dates = new Map(history.routes.map((record) => [record.url, record.lastmod]));
  const seen = new Set();
  const result = xml.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const url = /<loc>([^<]+)<\/loc>/.exec(entry)?.[1];
    if (!dates.has(url) || seen.has(url)) throw new Error("Sitemap and content history differ");
    seen.add(url);
    const clean = entry.replace(/\s*<lastmod>[^<]*<\/lastmod>/g, "");
    return dates.get(url) ? clean.replace(/<\/loc>/, `</loc>\n    <lastmod>${dates.get(url)}</lastmod>`) : clean;
  });
  if (seen.size !== dates.size) throw new Error("Sitemap misses content history routes");
  return result;
}

export async function snapshotBuild(dist) {
  const { routes } = JSON.parse(await readFile(path.join(dist, "indexable-routes.json"), "utf8"));
  if (!Array.isArray(routes) || !routes.length) throw new Error("Missing indexable route manifest");
  const records = [];
  for (const route of routes) {
    publicUrl(ORIGIN + route);
    const prerender = path.join(dist, "prerender", route === "/" ? "index.html" : route.slice(1) + "/index.html");
    const file = existsSync(prerender) ? prerender : path.join(dist, route.slice(1) + ".html");
    records.push(documentRecord(ORIGIN + route, await readFile(file, "utf8")));
  }
  const snapshot = { schema: 1, origin: ORIGIN, recordedAt: new Date().toISOString(), source: "built-html", routes: records };
  validateSnapshot(snapshot);
  return snapshot;
}

export async function notifyPublished({ before, after, key, submit = false, fetcher = fetch }) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error("Invalid IndexNow verification key");
  const urlList = changedUrls(before, after);
  if (urlList.length > 10_000) throw new Error("IndexNow URL limit exceeded");
  if (!submit) return { mode: "dry-run", urlList, received: false, indexed: "not verified" };
  if (!urlList.length) return { mode: "unchanged", urlList, received: false, indexed: "not verified" };
  const get = (url) => fetcher(url, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "YELYGINN-IndexNow-Verification/1.0" } });
  const verification = await get(KEY_LOCATION);
  if (verification.status !== 200 || (await verification.text()).trim() !== key) throw new Error("Published key verification failed; nothing submitted");
  const next = new Map(after.routes.map((item) => [item.url, item]));
  // Refuse to announce unpublished or partial builds. Deleted URLs must really be gone.
  for (const url of urlList) {
    const response = await get(url);
    if (!next.has(url)) {
      if (![404, 410].includes(response.status)) throw new Error(`Deletion not published: ${url}`);
      continue;
    }
    if (response.status !== 200 || /noindex|none/i.test(response.headers.get("x-robots-tag") || "")) throw new Error(`Public page unavailable: ${url}`);
    if (documentRecord(url, await response.text()).hash !== next.get(url).hash) throw new Error(`Published content differs from candidate: ${url}`);
  }
  const response = await fetcher(ENDPOINT, { method: "POST", redirect: "manual", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: "yelyginn.ru", key, keyLocation: KEY_LOCATION, urlList }) });
  return { mode: "submitted", urlList, httpStatus: response.status, received: [200, 202].includes(response.status),
    keyValidation: response.status === 202 ? "pending" : response.status === 200 ? "accepted" : "not accepted", indexed: "not verified" };
}

async function cli() {
  const args = process.argv.slice(2);
  const command = args.shift();
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (key === "--submit") options.submit = true;
    else if (["--dist", "--output", "--before", "--after", "--journal", "--history"].includes(key)) {
      const value = args.shift(); if (!value || value.startsWith("--")) throw new Error(`Missing ${key}`); options[key.slice(2)] = value;
    } else throw new Error(`Unknown option ${key}`);
  }
  if (command === "snapshot") {
    if (!options.dist || !options.output) throw new Error("snapshot needs --dist and --output");
    const snapshot = await snapshotBuild(options.dist);
    await mkdir(path.dirname(options.output), { recursive: true });
    await writeFile(options.output, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(`IndexNow snapshot: ${snapshot.routes.length} public URLs`);
    return;
  }
  if (command === "sitemap") {
    if (!options.dist || !options.before || !options.after || !options.history || !options.output) throw new Error("sitemap needs --dist, --before, --after, --history and --output");
    const before = JSON.parse(await readFile(options.before, "utf8"));
    const after = JSON.parse(await readFile(options.after, "utf8"));
    const history = existsSync(options.history) ? JSON.parse(await readFile(options.history, "utf8")) : null;
    const releaseDate = execFileSync("git", ["show", "-s", "--format=%cI", "HEAD"], { encoding: "utf8" }).trim().slice(0, 10);
    const next = contentHistory(before, after, history, releaseDate);
    const filename = path.join(options.dist, "sitemap.xml");
    const sitemap = sitemapWithHistory(await readFile(filename, "utf8"), next);
    await mkdir(path.dirname(options.output), { recursive: true });
    await writeFile(options.output, JSON.stringify(next, null, 2) + "\n");
    await writeFile(filename, sitemap);
    console.log(`Sitemap content dates: ${next.routes.filter((item) => item.lastmod).length}/${next.routes.length}`);
    return;
  }
  if (command !== "notify" || !options.before || !options.after || !options.journal) throw new Error("notify needs --before, --after and --journal; default is dry-run");
  const entry = { recordedAt: new Date().toISOString() };
  try {
    entry.sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const before = JSON.parse(await readFile(options.before, "utf8"));
    const after = JSON.parse(await readFile(options.after, "utf8"));
    const key = (await readFile(new URL("../public/indexnow-key.txt", import.meta.url), "utf8")).trim();
    Object.assign(entry, await notifyPublished({ before, after, key, submit: Boolean(options.submit) }));
    if (entry.mode === "submitted" && !entry.received) process.exitCode = 1;
  } catch (error) {
    entry.mode = "failed"; entry.received = false; entry.error = error.message; process.exitCode = 1;
  }
  await mkdir(path.dirname(options.journal), { recursive: true });
  await appendFile(options.journal, JSON.stringify(entry) + "\n");
  console.log(JSON.stringify({ mode: entry.mode, count: entry.urlList?.length ?? 0, httpStatus: entry.httpStatus ?? null, received: entry.received, error: entry.error ?? null }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
