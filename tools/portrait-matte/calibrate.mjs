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
  resolveRawPath,
  resolveRuntimePath,
} from "./config.mjs";
import {
  estimateKey,
  greenDominance,
  inspectPortrait,
  keyRayDistance,
  quantile,
} from "./matte.mjs";

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

const rawTargets = [...FIX_TARGETS];

async function loadRaw(target) {
  const inputPath = resolveRawPath(workspaceRoot, target);
  const result = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { inputPath, ...result };
}

function summarize(values) {
  if (values.length === 0) {
    return { p01: null, p05: null, p50: null, p95: null, p99: null, count: 0 };
  }
  return {
    p01: quantile(values, 0.01),
    p05: quantile(values, 0.05),
    p50: quantile(values, 0.5),
    p95: quantile(values, 0.95),
    p99: quantile(values, 0.99),
    count: values.length,
  };
}

const rawEvidence = [];
for (const target of rawTargets) {
  const { inputPath, data, info } = await loadRaw(target);
  const key = estimateKey(data, info.width, info.height, info.channels, MATTE_PARAMETERS);
  const sampleDominance = [];
  const sampleHeight = key.sampleHeight;
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      sampleDominance.push(greenDominance(data[index], data[index + 1], data[index + 2]));
    }
  }
  rawEvidence.push({
    id: target.id,
    input: path.relative(workspaceRoot, inputPath),
    dimensions: { width: info.width, height: info.height },
    key,
    topStripGreenDominance: summarize(sampleDominance),
  });
}

const baselineEvidence = [];
for (const target of ACCEPTED_BASELINES) {
  const rawTarget = rawTargets.find((candidate) => candidate.id === target.id);
  if (!rawTarget) continue;
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
  const opaqueGreenDominance = [];
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
      opaqueGreenDominance.push(greenDominance(red, green, blue));
    }
  }
  baselineEvidence.push({
    id: target.id,
    runtime: await inspectPortrait(runtimePath, target.id),
    rawClassification: {
      transparentKeyRayDistance: summarize(transparentDistance),
      opaqueKeyRayDistance: summarize(opaqueDistance),
      opaqueGreenDominance: summarize(opaqueGreenDominance),
    },
  });
}

const report = {
  keyColor: "#00B140",
  matteParameters: MATTE_PARAMETERS,
  gateParameters: GATE_PARAMETERS,
  rawEvidence,
  acceptedBaselineEvidence: baselineEvidence,
  calibrationRules: {
    innerRadius: "max(14, top-strip key-ray distance p99 + 4); flat #00B140 plates → 14",
    outerRadius: "48, soft transition band above pure-key noise floor",
    foregroundGreenDominanceCeiling: "12, force-opaque when G - max(R,B) ≤ 12 (non-green subject)",
    despill:
      "pull excess G toward max(R,B) when G - max(R,B) > despillNeutralMargin (12) inside 16px boundary",
    gateCoverage: "subject/partial/top ranges bracket the twelve CG plates with margin",
    edgeThreshold: "24 green-dominance on edge band; max green-edge ratio 0.005",
    cornerPolicy:
      "top canvas corners plus side background probes are transparent; bottom corners may be subject",
  },
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (reportPath) {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, serialized);
}
process.stdout.write(serialized);
