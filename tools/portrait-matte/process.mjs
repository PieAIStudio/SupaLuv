#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { PORTRAIT_ROOT } from "./config.mjs";
import { inspectPortrait, processAllowlistedPortraits } from "./matte.mjs";

function parseArguments(argv) {
  const result = { writeRuntime: false, outputDirectory: null, reportPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--write-runtime") result.writeRuntime = true;
    else if (argument === "--out-dir") result.outputDirectory = argv[++index];
    else if (argument === "--report") result.reportPath = argv[++index];
    else throw new Error(`unknown argument: ${argument}`);
  }
  if (result.writeRuntime === Boolean(result.outputDirectory)) {
    throw new Error("choose exactly one output: --write-runtime or --out-dir <directory>");
  }
  return result;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "../..");
const options = parseArguments(process.argv.slice(2));
const outputDirectory = options.writeRuntime
  ? path.join(workspaceRoot, PORTRAIT_ROOT)
  : path.resolve(workspaceRoot, options.outputDirectory);

const processing = await processAllowlistedPortraits({ workspaceRoot, outputDirectory });
const metrics = [];
for (const result of processing) {
  metrics.push({
    ...(await inspectPortrait(result.outputPath, result.id)),
    keyEvidence: result.keyEvidence,
  });
}
const report = { outputDirectory, parameters: processing[0]?.parameters, portraits: metrics };
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (options.reportPath) {
  const reportPath = path.resolve(workspaceRoot, options.reportPath);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, serialized);
}
process.stdout.write(serialized);
