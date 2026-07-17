#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { ALL_RUNTIME_PORTRAITS, GATE_PARAMETERS, resolveRuntimePath } from "./config.mjs";
import { evaluateGate, inspectPortrait } from "./matte.mjs";

function parseArguments(argv) {
  const result = { reportPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--report") result.reportPath = argv[++index];
    else throw new Error(`unknown argument: ${argument}`);
  }
  return result;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "../..");
const options = parseArguments(process.argv.slice(2));
const portraits = [];
for (const target of ALL_RUNTIME_PORTRAITS) {
  const metrics = await inspectPortrait(resolveRuntimePath(workspaceRoot, target), target.id);
  const gateParameters = target.gateOverrides
    ? { ...GATE_PARAMETERS, ...target.gateOverrides }
    : GATE_PARAMETERS;
  portraits.push({ ...metrics, gate: evaluateGate(metrics, gateParameters) });
}
const pass = portraits.every((portrait) => portrait.gate.pass);
const report = { pass, gateParameters: GATE_PARAMETERS, portraits };
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (options.reportPath) {
  const reportPath = path.resolve(workspaceRoot, options.reportPath);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, serialized);
}
process.stdout.write(serialized);
if (!pass) process.exitCode = 1;
