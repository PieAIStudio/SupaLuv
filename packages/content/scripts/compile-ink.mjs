#!/usr/bin/env node
/**
 * Precompile Ink sources to pretty JSON for async runtime load.
 * Node-only; players never receive inkjs/full.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
const inkDir = join(packageRoot, "ink");
const outDir = join(packageRoot, "compiled");
const catalogPath = join(packageRoot, "catalog", "story-catalog.json");
const require = createRequire(resolve(packageRoot, "../../apps/web/package.json"));
const { Compiler } = require("inkjs/full");

/** Production + selectable-dev fixtures derived from the runtime catalog. */
function catalogInkTargets() {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const targets = [];
  for (const chapter of [...(catalog.productionChapters ?? []), ...(catalog.devChapters ?? [])]) {
    const base = chapter.inkFile ?? `${chapter.id}.ink`;
    if (!existsSync(join(inkDir, base))) {
      throw new Error(`Catalog chapter ${chapter.id} is missing Ink source ${base}`);
    }
    targets.push(base);
    const translated = base.replace(/\.ink$/u, ".en.ink");
    if (existsSync(join(inkDir, translated))) {
      targets.push(translated);
    }
  }
  return [...new Set(targets)];
}

function formatWithOxfmt(filePath) {
  const oxfmtBin = resolve(repoRoot, "node_modules/.bin/oxfmt");
  if (!existsSync(oxfmtBin)) {
    throw new Error(`oxfmt not found at ${oxfmtBin}; run pnpm install at repo root`);
  }
  execFileSync(oxfmtBin, [filePath, "--write"], { cwd: repoRoot, stdio: "inherit" });
}

mkdirSync(outDir, { recursive: true });

const targets = process.argv.includes("--all")
  ? readdirSync(inkDir).filter((name) => name.endsWith(".ink"))
  : catalogInkTargets();

const written = [];
let failed = 0;
for (const name of targets) {
  const srcPath = join(inkDir, name);
  const src = readFileSync(srcPath, "utf8");
  try {
    const story = new Compiler(src).Compile();
    const rawJson = story.ToJson();
    const pretty = `${JSON.stringify(JSON.parse(rawJson), null, 2)}\n`;
    const outPath = join(outDir, name.replace(/\.ink$/, ".json"));
    writeFileSync(outPath, pretty, "utf8");
    formatWithOxfmt(outPath);
    written.push(outPath);
    console.log(`compiled ${name} -> ${outPath}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}:`, error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  process.exit(1);
}
console.log(`formatted ${written.length} compiled JSON file(s) with oxfmt`);
