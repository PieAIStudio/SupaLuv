#!/usr/bin/env node
/**
 * Anti-bloat gate for known God-file hotspots.
 * Fail if a file grows past its budget — split modules instead of stacking.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const ROOT = resolve(import.meta.dirname, "..");

/** @type {readonly { path: string; maxLines: number }[]} */
const BUDGETS = [
  { path: "apps/web/src/views/VisualNovelPrototype.tsx", maxLines: 400 },
  { path: "apps/web/src/App.tsx", maxLines: 650 },
  { path: "apps/web/src/audio/gameAudio.ts", maxLines: 300 },
];

function countLines(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (text.length === 0) return 0;
  const lines = text.split(/\r?\n/);
  // Match `wc -l`: trailing newline does not add an extra empty line count.
  return text.endsWith("\n") ? lines.length - 1 : lines.length;
}

const failures = [];

for (const budget of BUDGETS) {
  const abs = resolve(ROOT, budget.path);
  let lines;
  try {
    lines = countLines(abs);
  } catch (error) {
    failures.push(`${budget.path}: cannot read file (${error instanceof Error ? error.message : error})`);
    continue;
  }
  if (lines > budget.maxLines) {
    failures.push(
      `${budget.path}: ${lines} lines > budget ${budget.maxLines} — 拆分而不是继续堆 (split modules instead of stacking)`,
    );
  } else {
    console.log(`ok  ${budget.path}: ${lines}/${budget.maxLines}`);
  }
}

if (failures.length > 0) {
  console.error("\nFile budget exceeded:");
  for (const line of failures) {
    console.error(`  ✗ ${line}`);
  }
  console.error("\nHint: 拆分而不是继续堆 — extract modules; do not keep stacking the hotspot file.");
  process.exit(1);
}

console.log("File budgets: all within limits.");
