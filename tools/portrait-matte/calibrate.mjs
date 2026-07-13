#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  ACCEPTED_BASELINES,
  FIX_TARGETS,
  GATE_PARAMETERS,
  MATTE_PARAMETERS,
  RAW_ROOT,
  resolveRawPath,
  resolveRuntimePath,
} from "./config.mjs";
import { estimateKey, inspectPortrait, keyRayDistance, quantile } from "./matte.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "../..");
const reportArgumentIndex = process.argv.indexOf("--report");
const reportPath =
  reportArgumentIndex === -1
    ? null
    : path.resolve(workspaceRoot, process.argv[reportArgumentIndex + 1] ?? "");
if (reportArgumentIndex !== -1 && !process.argv[reportArgumentIndex + 1]) {
  throw new Error("--report requires a path");
}

const rawTargets = [
  ...FIX_TARGETS,
  { id: "suming-committed", raw: "committed-raw.jpg" },
  { id: "suming-restless", raw: "restless-raw.jpg" },
];

async function loadRaw(target) {
  const inputPath = resolveRawPath(workspaceRoot, target);
  const result = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { inputPath, ...result };
}

function summarize(values) {
  return {
    p01: quantile(values, 0.01),
    p05: quantile(values, 0.05),
    p50: quantile(values, 0.5),
    p95: quantile(values, 0.95),
    p99: quantile(values, 0.99),
  };
}

const rawEvidence = [];
for (const target of rawTargets) {
  const { inputPath, data, info } = await loadRaw(target);
  rawEvidence.push({
    id: target.id,
    input: path.relative(workspaceRoot, inputPath),
    dimensions: { width: info.width, height: info.height },
    key: estimateKey(data, info.width, info.height, info.channels, MATTE_PARAMETERS),
  });
}

const baselineEvidence = [];
for (const target of ACCEPTED_BASELINES) {
  const rawTarget = rawTargets.find((candidate) => candidate.id === target.id);
  const { data: rawData, info: rawInfo } = await loadRaw(rawTarget);
  const runtimePath = resolveRuntimePath(workspaceRoot, target);
  const { data: runtimeData, info: runtimeInfo } = await sharp(runtimePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const key = estimateKey(
    rawData,
    rawInfo.width,
    rawInfo.height,
    rawInfo.channels,
    MATTE_PARAMETERS,
  );
  const transparentDistance = [];
  const opaqueDistance = [];
  const opaqueMagentaDominance = [];
  for (let pixel = 0; pixel < rawInfo.width * rawInfo.height; pixel += 1) {
    const rawIndex = pixel * rawInfo.channels;
    const runtimeIndex = pixel * runtimeInfo.channels;
    const alpha = runtimeData[runtimeIndex + 3];
    const red = rawData[rawIndex];
    const green = rawData[rawIndex + 1];
    const blue = rawData[rawIndex + 2];
    const distance = keyRayDistance(red, green, blue, key.rgb, MATTE_PARAMETERS);
    if (alpha === 0) transparentDistance.push(distance);
    if (alpha === 255) {
      opaqueDistance.push(distance);
      opaqueMagentaDominance.push(Math.min(red, blue) - green);
    }
  }
  baselineEvidence.push({
    id: target.id,
    runtime: await inspectPortrait(runtimePath, target.id),
    rawClassification: {
      transparentKeyRayDistance: summarize(transparentDistance),
      opaqueKeyRayDistance: summarize(opaqueDistance),
      opaqueMagentaDominance: summarize(opaqueMagentaDominance),
    },
  });
}

const report = {
  rawRoot: RAW_ROOT,
  matteParameters: MATTE_PARAMETERS,
  gateParameters: GATE_PARAMETERS,
  rawEvidence,
  acceptedBaselineEvidence: baselineEvidence,
  calibrationRules: {
    innerRadius: "max(14, top-strip key-ray distance p99 + 4)",
    outerRadius:
      "48, above both accepted controls' opaque-subject key-ray distance p01 and below broad subject color distances",
    foregroundMagentaDominanceCeiling:
      "12, above accepted controls' opaque-subject magenta-dominance p99 (6)",
    gateCoverage: "subject and partial-alpha ranges bracket both accepted controls with margin",
    edgeThreshold: "24, four times the accepted controls' opaque-subject magenta-dominance p99",
    cornerPolicy:
      "top canvas corners plus side background probes are transparent; bottom canvas corners are occupied by the locked hoodie composition in both accepted controls",
  },
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (reportPath) {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, serialized);
}
process.stdout.write(serialized);
