#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  ALL_RUNTIME_PORTRAITS,
  EXPECTED_HEIGHT,
  EXPECTED_WIDTH,
  FIX_TARGETS,
  resolveRuntimePath,
} from "./config.mjs";
import { evaluateGate, inspectPortrait, processAllowlistedPortraits } from "./matte.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "../..");
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "supaluv-portrait-matte-"));
const reportArgumentIndex = process.argv.indexOf("--report");
const reportPath =
  reportArgumentIndex === -1
    ? null
    : path.resolve(workspaceRoot, process.argv[reportArgumentIndex + 1] ?? "");
if (reportArgumentIndex !== -1 && !process.argv[reportArgumentIndex + 1]) {
  throw new Error("--report requires a path");
}

try {
  const firstDirectory = path.join(temporaryRoot, "run-a");
  const secondDirectory = path.join(temporaryRoot, "run-b");
  await processAllowlistedPortraits({ workspaceRoot, outputDirectory: firstDirectory });
  await processAllowlistedPortraits({ workspaceRoot, outputDirectory: secondDirectory });

  const determinism = [];
  for (const target of FIX_TARGETS) {
    const first = await inspectPortrait(path.join(firstDirectory, target.output), target.id);
    const second = await inspectPortrait(path.join(secondDirectory, target.output), target.id);
    const runtime = await inspectPortrait(resolveRuntimePath(workspaceRoot, target), target.id);
    determinism.push({
      id: target.id,
      hashEqual: first.sha256 === second.sha256,
      bytesEqual: first.bytes === second.bytes,
      runtimeHashEqual: first.sha256 === runtime.sha256,
      runtimeBytesEqual: first.bytes === runtime.bytes,
      sha256: first.sha256,
      bytes: first.bytes,
    });
  }

  const official = [];
  for (const target of ALL_RUNTIME_PORTRAITS) {
    const metrics = await inspectPortrait(resolveRuntimePath(workspaceRoot, target), target.id);
    official.push({ id: target.id, gate: evaluateGate(metrics) });
  }

  const fixturePath = path.join(temporaryRoot, "opaque-magenta.png");
  await sharp({
    create: {
      width: EXPECTED_WIDTH,
      height: EXPECTED_HEIGHT,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 1 },
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(fixturePath);
  const fixtureMetrics = await inspectPortrait(fixturePath, "opaque-magenta-fixture");
  const fixtureGate = evaluateGate(fixtureMetrics);

  const report = {
    pass:
      determinism.every(
        (entry) =>
          entry.hashEqual && entry.bytesEqual && entry.runtimeHashEqual && entry.runtimeBytesEqual,
      ) &&
      official.every((entry) => entry.gate.pass) &&
      !fixtureGate.pass,
    determinism,
    official,
    badFixture: { rejected: !fixtureGate.pass, failures: fixtureGate.failures },
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (reportPath) {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, serialized);
  }
  process.stdout.write(serialized);
  if (!report.pass) process.exitCode = 1;
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}
