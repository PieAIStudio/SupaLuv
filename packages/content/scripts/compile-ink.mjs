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
const require = createRequire(resolve(packageRoot, "../../apps/web/package.json"));
const { Compiler } = require("inkjs/full");

/** Production + selectable-dev fixtures that ship as precompiled JSON. */
const DEFAULT_INK = [
  "draft-ch01.ink",
  "draft-ch01.en.ink",
  "draft-ch02.ink",
  "draft-ch02.en.ink",
  "draft-ch03.ink",
  "draft-ch03.en.ink",
  "prototype-act1.ink",
  "chapter-01-trial.ink",
];

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
  : DEFAULT_INK;

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
