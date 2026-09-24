import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

// PROMPT-30 §0/§5.4: docs/brandbook/ (33 PNG + JSON, ~4 МБ, скопирован из
// /Users/.../New_claude/site/brandbook/ первым коммитом задачи) не должен
// раздаваться сайтом. vite.config.ts не ссылается на docs/ ни из одного
// входа и не копирует его как public/, так что по построению он не попадает
// в dist/ — этот тест защищает от регресса, если кто-то позже переименует
// docs/ в public/docs/ или добавит его в rollupOptions.input по ошибке.
test("nothing from docs/ ships in the built dist/ output", () => {
  assert.ok(fs.existsSync(distDir), "dist/ не найден — сначала npm run build");
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
  const distFiles = walk(distDir);
  const leaked = distFiles.filter((file) => {
    const rel = path.relative(distDir, file);
    return /(^|[\\/])(brandbook|docs)([\\/]|$)/iu.test(rel) || /style-spec-v2\.json$/u.test(rel);
  });
  assert.deepEqual(leaked, [], `docs/brandbook просочился в dist/: ${leaked.join(", ")}`);
});
