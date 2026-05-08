import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compile } from "tailwindcss";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const inputPath = path.join(root, "src", "index.css");
const outputPath = path.join(root, "src", "tailwind.generated.css");
const sourceRoots = [path.join(root, "src"), path.join(root, "index.html")];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  }));
  return files.flat();
}

async function findPackageJson(id, base) {
  const searchPaths = require.resolve.paths(id) ?? [path.join(base, "node_modules")];
  for (const searchPath of searchPaths) {
    const packageJsonPath = path.join(searchPath, id, "package.json");
    try {
      await fs.access(packageJsonPath);
      return packageJsonPath;
    } catch {
      // continue
    }
  }
  throw new Error(`Unable to locate package.json for package: ${id}`);
}

async function resolvePackageStylesheet(id, base) {
  const packageJsonPath = await findPackageJson(id, base);
  const packageDir = path.dirname(packageJsonPath);
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const stylePath = packageJson.exports?.["."]?.style ?? packageJson.style ?? packageJson.main;
  if (!stylePath) {
    throw new Error(`Unable to resolve stylesheet entry for package: ${id}`);
  }
  return path.resolve(packageDir, stylePath);
}

async function resolveFromBase(id, base, kind) {
  if (id.startsWith(".") || id.startsWith("/")) {
    return path.resolve(base, id);
  }

  if (kind === "style") {
    return resolvePackageStylesheet(id, base);
  }

  return require.resolve(id, { paths: [base] });
}

function extractCandidates(content) {
  const candidates = new Set();
  const regex = /[A-Za-z0-9_:\-\/\[\]%.(),!]+/g;
  const simpleAllowed = new Set(["flex", "grid", "block", "hidden", "table", "inline", "relative", "absolute", "sticky", "fixed"]);
  const blocked = new Set(["import", "from", "return", "const", "let", "function", "true", "false", "null", "undefined", "http", "https"]);

  for (const match of content.matchAll(regex)) {
    const token = match[0];
    if (token.length < 2) continue;
    if (!/[\-:[\]]/.test(token) && !simpleAllowed.has(token)) continue;
    if (blocked.has(token)) continue;
    candidates.add(token);
  }

  return candidates;
}

async function loadStylesheet(id, base) {
  const resolved = await resolveFromBase(id, base, "style");
  return {
    path: resolved,
    base: path.dirname(resolved),
    content: await fs.readFile(resolved, "utf8"),
  };
}

async function loadModule(id, base) {
  const resolved = await resolveFromBase(id, base, "module");
  const imported = await import(pathToFileURL(resolved).href);
  return {
    path: resolved,
    base: path.dirname(resolved),
    module: imported.default ?? imported,
  };
}

async function main() {
  const css = await fs.readFile(inputPath, "utf8");
  const files = [];

  for (const source of sourceRoots) {
    const stat = await fs.stat(source);
    if (stat.isDirectory()) files.push(...await walk(source));
    else files.push(source);
  }

  const candidates = new Set();
  for (const file of files) {
    if (!/\.(html|ts|tsx|js|jsx|css)$/.test(file)) continue;
    const content = await fs.readFile(file, "utf8");
    for (const candidate of extractCandidates(content)) candidates.add(candidate);
  }

  const compiler = await compile(css, {
    base: root,
    from: inputPath,
    loadStylesheet,
    loadModule,
  });

  const output = compiler.build([...candidates]);
  await fs.writeFile(outputPath, output, "utf8");
  console.log(`Generated ${path.relative(root, outputPath)} with ${candidates.size} candidates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

