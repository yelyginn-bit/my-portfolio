import fs from "node:fs";
import path from "node:path";

const assetsDir = path.resolve("dist/assets");
const files = fs.readdirSync(assetsDir);
const largest = (extension) => files
  .filter((file) => file.endsWith(extension))
  .map((file) => ({ file, bytes: fs.statSync(path.join(assetsDir, file)).size }))
  .sort((a, b) => b.bytes - a.bytes)[0];

const css = largest(".css");
const js = largest(".js");
const desktopFile = files.find((file) => /^desktop-design-[a-f0-9]+\.css$/u.test(file));
if (!desktopFile) throw new Error("Desktop stylesheet missing from build");
const desktopBytes = fs.statSync(path.join(assetsDir, desktopFile)).size;
const limits = { css: 120 * 1024, js: 320 * 1024 };

console.log(`Largest CSS: ${css.file} (${Math.round(css.bytes / 1024)} KiB)`);
console.log(`Largest JS: ${js.file} (${Math.round(js.bytes / 1024)} KiB)`);
console.log(`Desktop CSS: ${desktopFile} (${Math.round(desktopBytes / 1024)} KiB, limit 20 KiB)`);

if (css.bytes > limits.css || js.bytes > limits.js || desktopBytes > 20 * 1024) {
  console.error("Build asset budget exceeded");
  process.exitCode = 1;
}
