import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

test("Deployment refuses dirty or unexpected-branch checkouts before fetch/install/restart", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "yelyginn-deploy-test-"));
  try {
    const source = await fs.readFile(new URL("../deploy.sh", import.meta.url), "utf8");
    await fs.writeFile(path.join(temp, "deploy.sh"), source);
    const bin = path.join(temp, "bin"); await fs.mkdir(bin);
    const trace = path.join(temp, "trace");
    await fs.writeFile(path.join(bin, "git"), `#!/bin/sh
printf '%s\\n' "$*" >> "$YELYGINN_TEST_TRACE"
if [ "$1" = status ]; then
  if [ "$YELYGINN_TEST_MODE" = dirty ]; then printf ' M owner-file\\n'; fi
elif [ "$1" = branch ]; then printf 'codex/unrelated-owner-branch\\n'
else printf 'FORBIDDEN\\n'; exit 97
fi
`, { mode: 0o755 });
    for (const executable of ["npm", "pm2", "node"]) {
      await fs.writeFile(path.join(bin, executable), '#!/bin/sh\nprintf "FORBIDDEN\\n" >> "$YELYGINN_TEST_TRACE"\nexit 97\n', { mode: 0o755 });
    }
    for (const mode of ["dirty", "wrong-branch"]) {
      await fs.writeFile(trace, "");
      const result = spawnSync("bash", [path.join(temp, "deploy.sh")], { encoding: "utf8", env: {
        ...process.env, PATH: `${bin}:${process.env.PATH}`, YELYGINN_TEST_MODE: mode, YELYGINN_TEST_TRACE: trace,
      } });
      assert.equal(result.status, 1);
      assert.match(result.stderr, mode === "dirty" ? /dirty checkout/ : /expected the server main checkout/);
      assert.doesNotMatch(await fs.readFile(trace, "utf8"), /fetch|merge|switch|reset|FORBIDDEN/);
    }
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
