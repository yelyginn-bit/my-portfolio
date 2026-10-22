import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { OG_IMAGES } from "../src/public/ogImages.data";
import { siteOrigin } from "./sitemap";

export async function generateOgImages(root: string, dist: string) {
  const unique = new Map(Object.values(OG_IMAGES).map((image) => [image.path, image]));
  await mkdir(path.join(dist, "og"), { recursive: true });
  let bytes = 0;
  for (const image of unique.values()) {
    const source = path.join(image.fromDist ? dist : path.join(root, "public"), image.source.slice(1));
    const output = path.join(dist, image.path.slice(1));
    await sharp(source).rotate().resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 82 }).toFile(output);
    bytes += (await stat(output)).size;
  }
  console.log(`OG previews: ${unique.size} JPEG files, ${bytes} bytes, 1200×630, quality 82.`);
}

export function applyOgImage(html: string, route: string) {
  const image = OG_IMAGES[route];
  if (!image) throw new Error(`Missing OG mapping: ${route}`);
  const url = siteOrigin + image.path;
  const meta = [
    `<meta property="og:image" content="${url}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${(image.alt || 'Кадр из опубликованной работы Юрия Елыгина').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}" />`,
    `<meta name="twitter:image" content="${url}" />`,
  ].join("\n");
  return html.replace(/<meta\b[^>]*(?:property|name)="(?:og:image(?::(?:width|height|alt))?|twitter:image)"[^>]*>/giu, "").replace("</head>", `${meta}\n</head>`);
}
