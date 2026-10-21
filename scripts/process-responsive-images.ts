/** Derive smaller WebP files from already published local images; never touch originals. */
import {createHash} from "node:crypto";
import {lstat, readFile, realpath, readdir, writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {projects, assetsForProject, posterUrl} from "../src/portfolio/v3PortfolioData";
import {RESOLVE_SESSION_STAGES} from "../src/public/v3Content";
import {COLOR_COMPARE_PAIRS} from "../src/lib/colorCompare.data";

const root = await realpath("public");
async function localFile(url: string) {
  const file = path.resolve(root, "." + url);
  if (!file.startsWith(root + path.sep) || !(await lstat(file)).isFile() || !(await realpath(file)).startsWith(root + path.sep)) throw new Error(`Not an ordinary public file: ${url}`);
  return file;
}
const converted = "/ai-logos/perplexity.webp";
await writeFile(path.join(root, converted), await sharp(await localFile("/ai-logos/perplexity.png")).webp({lossless: true}).toBuffer());
const sources = new Map<string, {widths: number[]; siblings?: string[]; lossless?: boolean}>();
for (const project of projects) for (const asset of assetsForProject(project.id)) {
  sources.set(posterUrl(asset.kinescopeId), {widths: [], siblings: [posterUrl(asset.kinescopeId, "sm")]});
}
for (const pair of COLOR_COMPARE_PAIRS) {
  if (pair.before.startsWith("/v3-assets/color/")) sources.set(pair.before, {widths: [640, 1280]});
  if (pair.after.startsWith("/v3-assets/color/")) sources.set(pair.after, {widths: [640, 1280]});
  if (pair.thumbnail?.startsWith("/v3-assets/color/")) sources.set(pair.thumbnail, {widths: [240]});
}
sources.set("/v3-assets/about/portrait.webp", {widths: [240, 640], siblings: ["/v3-assets/about/portrait-480w.webp"]});

for (const stage of RESOLVE_SESSION_STAGES) {
  sources.set(stage.clean, {widths: [640, 960, 1280]});
  sources.set(stage.resolve, {widths: [640, 960, 1280]});
}
// Native templates opt in explicitly, preserving their authored sizes and full-screen sources.
for (const file of (await readdir(".", {withFileTypes: true})).filter((entry) => entry.isFile() && entry.name.endsWith(".html"))) {
  const html = await readFile(file.name, "utf8");
  for (const match of html.matchAll(/<img\b[^>]*data-responsive-widths="([0-9, ]+)"[^>]*>/giu)) {
    const tag = match[0], src = /\bsrc="([^"]+)"/iu.exec(tag)?.[1];
    if (!src || !src.startsWith("/")) throw new Error(`Missing local responsive source: ${file.name}`);
    const widths = match[1].split(",").map(Number);
    if (widths.some((width) => !Number.isInteger(width) || width <= 0)) throw new Error("Invalid derivative width");
    const siblings = (/\bsrcset="([^"]+)"/iu.exec(tag)?.[1] ?? "").split(",").map((candidate) => candidate.trim().split(" ")[0]).filter((url) => url && url !== src);
    sources.set(src, {widths, siblings});
  }
}

const manifest: Record<string, {width: number; height: number; srcSet: string}> = {};
let addedBytes = 0, addedFiles = 0;
for (const [url, options] of sources) {
  const input = await localFile(url), original = await readFile(input), metadata = await sharp(original).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing image size: ${url}`);
  const candidates = new Map<number, string>();
  for (const sibling of options.siblings ?? []) {
    const siblingMetadata = await sharp(await localFile(sibling)).metadata();
    if (!siblingMetadata.width) throw new Error(`Missing image size: ${sibling}`);
    if (siblingMetadata.width <= metadata.width) candidates.set(siblingMetadata.width, sibling);
  }
  for (const width of options.widths.filter((value) => value < metadata.width!)) {
    const output = await sharp(original).resize({width, withoutEnlargement: true}).webp(options.lossless ? {lossless: true, effort: 6} : {quality: 86, effort: 6}).toBuffer();
    if (output.length >= original.length) continue;
    const hash = createHash("sha256").update(output).digest("hex").slice(0, 8);
    const targetUrl = url.replace(/\.webp$/u, `-${width}w-${hash}.webp`);
    if (targetUrl === url) throw new Error(`Unexpected source format: ${url}`);
    await writeFile(path.join(root, targetUrl), output);
    candidates.set(width, targetUrl); addedBytes += output.length; addedFiles++;
  }
  candidates.set(metadata.width, url);
  manifest[url] = {width: metadata.width, height: metadata.height, srcSet: [...candidates].sort(([a], [b]) => a - b).map(([width, src]) => `${src} ${width}w`).join(", ")};
}
await writeFile("src/lib/responsive-images.manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({sources: sources.size, derivativeFiles: addedFiles, derivativeBytes: addedBytes, convertedLogoBytes: (await readFile(path.join(root, converted))).length}));
