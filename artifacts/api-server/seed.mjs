import { build as esbuild } from "esbuild";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

await esbuild({
  entryPoints: [path.resolve(here, "src/seed.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.resolve(here, "dist/seed.mjs"),
  external: ["bcrypt", "pg-native", "*.node"],
  banner: {
    js: `import { createRequire as __r } from 'node:module';
import __bp from 'node:path';
import __bu from 'node:url';
globalThis.require = __r(import.meta.url);
globalThis.__filename = __bu.fileURLToPath(import.meta.url);
globalThis.__dirname = __bp.dirname(globalThis.__filename);`,
  },
  logLevel: "warning",
});

const result = spawnSync("node", [path.resolve(here, "dist/seed.mjs")], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 0);
