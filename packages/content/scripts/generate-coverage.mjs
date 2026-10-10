#!/usr/bin/env node
/**
 * Rebuild the draft-2026-07 coverage ledger from its registered source snapshots.
 *
 * Default mode is fail-closed: a mapping change must match the digest pinned in
 * SOURCE-MANIFEST.json. Use `--accept-mapping` only after reviewing an intended
 * source-to-scene change; that updates the digest anchor and ledger together.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeCoverageMappingDigest,
  findExactSourceSceneIds,
  isSourceStructureBlock,
  parseSourceBlocks,
  sha256Text,
  validateAdaptationReceipt,
  validateCoverageMappingDigest,
  validateExactOccurrenceMappings,
} from "./coverage-contract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
const sourcesDir = join(packageRoot, "sources", "draft-2026-07");
const sourceManifestPath = join(sourcesDir, "SOURCE-MANIFEST.json");
const ledgerPath = join(packageRoot, "ledgers", "draft-2026-07-coverage.json");
const overridesPath = join(packageRoot, "ledgers", "draft-2026-07-coverage-overrides.json");
const inkDir = join(packageRoot, "ink");

const args = process.argv.slice(2);
const unknownArgs = args.filter((arg) => arg !== "--accept-mapping");
if (unknownArgs.length > 0 || args.filter((arg) => arg === "--accept-mapping").length > 1) {
  console.error("Usage: node generate-coverage.mjs [--accept-mapping]");
  process.exit(1);
}
const acceptMapping = args.includes("--accept-mapping");

const ALLOWED_STATUSES = [
  "verbatim-dialogue",
  "narrated",
  "visualized",
  "interactive",
  "approved-adaptation",
];

function fail(messages) {
  const values = Array.isArray(messages) ? messages : [messages];
  console.error(values.join("\n"));
  process.exit(1);
}

function formatWithOxfmt(filePath) {
  const oxfmtBin = resolve(repoRoot, "node_modules/.bin/oxfmt");
  if (!existsSync(oxfmtBin)) {
    throw new Error(`oxfmt not found at ${oxfmtBin}; run pnpm install at repo root`);
  }
  execFileSync(oxfmtBin, [filePath, "--write"], { cwd: repoRoot, stdio: "inherit" });
}

/** Stage every JSON file before replacing any target; rollback ordinary write failures. */
function writeJsonTransaction(updates) {
  const staged = [];
  const previous = new Map();
  try {
    for (const [index, update] of updates.entries()) {
      previous.set(update.path, readFileSync(update.path));
      const temporaryPath = `${update.path}.tmp-${process.pid}-${index}.json`;
      staged.push({ ...update, temporaryPath });
      writeFileSync(temporaryPath, `${JSON.stringify(update.value, null, 2)}\n`, "utf8");
      formatWithOxfmt(temporaryPath);
      JSON.parse(readFileSync(temporaryPath, "utf8"));
    }
  } catch (error) {
    for (const item of staged) {
      rmSync(item.temporaryPath, { force: true });
    }
    throw error;
  }

  const committed = [];
  try {
    for (const item of staged) {
      renameSync(item.temporaryPath, item.path);
      committed.push(item.path);
    }
  } catch (error) {
    for (const targetPath of committed.reverse()) {
      const rollbackPath = `${targetPath}.rollback-${process.pid}.json`;
      writeFileSync(rollbackPath, previous.get(targetPath));
      renameSync(rollbackPath, targetPath);
    }
    throw error;
  } finally {
    for (const item of staged) {
      rmSync(item.temporaryPath, { force: true });
    }
  }
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function extractQuotes(text) {
  const quotes = [];
  for (const match of text.matchAll(/[“"]([^”"]+)[”"]/gu)) {
    if (match[1]) {
      quotes.push(match[1]);
    }
  }
  return quotes;
}

function assertUnique(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`duplicate ${label}: ${String(value)}`);
    }
    seen.add(value);
  }
}

const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, "utf8"));
const previousLedger = JSON.parse(readFileSync(ledgerPath, "utf8"));
const overrides = JSON.parse(readFileSync(overridesPath, "utf8"));

const previousDigestCheck = validateCoverageMappingDigest(
  previousLedger.entries ?? [],
  sourceManifest.coverageMappingDigest,
);
if (!previousDigestCheck.ok) {
  fail(previousDigestCheck.errors);
}

const manifestErrors = [];
if (!sourceManifest.id || !Array.isArray(sourceManifest.sources)) {
  manifestErrors.push("source manifest must define id and sources[]");
}
if (overrides.schemaVersion !== 2 || overrides.packageId !== sourceManifest.id) {
  manifestErrors.push("coverage overrides schemaVersion/packageId does not match source manifest");
}
if (!/^\d{4}-\d{2}-\d{2}$/u.test(overrides.reviewedAt ?? "")) {
  manifestErrors.push("coverage overrides must define reviewedAt as YYYY-MM-DD");
}
if (
  !overrides.entries ||
  typeof overrides.entries !== "object" ||
  Array.isArray(overrides.entries)
) {
  manifestErrors.push("coverage overrides must define an entries object");
}

const registeredSnapshots = (sourceManifest.sources ?? []).map((source) => source.relativePath);
const actualSnapshots = readdirSync(sourcesDir)
  .filter((file) => /^draft\d+\.md$/u.test(file))
  .sort();
if (JSON.stringify([...registeredSnapshots].sort()) !== JSON.stringify(actualSnapshots)) {
  manifestErrors.push(
    `source snapshot registration mismatch: manifest=[${[...registeredSnapshots].sort().join(", ")}] disk=[${actualSnapshots.join(", ")}]`,
  );
}

assertUnique(
  (sourceManifest.sources ?? []).map((source) => source.id),
  "source id",
  manifestErrors,
);
assertUnique(
  (sourceManifest.sources ?? []).map((source) => source.relativePath),
  "source relativePath",
  manifestErrors,
);
assertUnique(
  (sourceManifest.sources ?? []).map((source) => source.chapterId),
  "source chapterId",
  manifestErrors,
);

for (const source of sourceManifest.sources ?? []) {
  for (const field of [
    "id",
    "relativePath",
    "chapterId",
    "inkFile",
    "sha256",
    "bodyParagraphCount",
    "structureBlockCount",
  ]) {
    if (source[field] === undefined || source[field] === null || source[field] === "") {
      manifestErrors.push(`${source.id ?? "<unknown source>"} is missing ${field}`);
    }
  }
  const snapshotPath = join(sourcesDir, source.relativePath ?? "");
  const inkPath = join(inkDir, source.inkFile ?? "");
  if (!existsSync(snapshotPath)) {
    manifestErrors.push(`${source.id}: source snapshot is missing: ${snapshotPath}`);
  } else if (sha256Buffer(readFileSync(snapshotPath)) !== source.sha256) {
    manifestErrors.push(`${source.id}: source snapshot sha256 does not match manifest`);
  }
  if (!existsSync(inkPath)) {
    manifestErrors.push(`${source.id}: Ink source is missing: ${inkPath}`);
  }
}
for (const [entryId, override] of Object.entries(overrides.entries ?? {})) {
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    manifestErrors.push(`${entryId}: override must be an object`);
  } else if (!/^[a-f0-9]{64}$/u.test(override.sourceHash ?? "")) {
    manifestErrors.push(`${entryId}: override must pin a sha256 sourceHash`);
  }
}
if (manifestErrors.length > 0) {
  fail(["Invalid source manifest:", ...manifestErrors]);
}

const inkByChapter = new Map(
  sourceManifest.sources.map((source) => [
    source.chapterId,
    readFileSync(join(inkDir, source.inkFile), "utf8"),
  ]),
);

const entries = [];
const structure = [];
const generationErrors = [];
const usedOverrides = new Set();
let reviewedAdaptations = 0;
let inferredMappings = 0;

for (const source of sourceManifest.sources) {
  const raw = readFileSync(join(sourcesDir, source.relativePath), "utf8");
  const blocks = parseSourceBlocks(raw);
  const bodyCount = blocks.filter((block) => !isSourceStructureBlock(block)).length;
  const structureCount = blocks.length - bodyCount;
  if (bodyCount !== source.bodyParagraphCount || structureCount !== source.structureBlockCount) {
    generationErrors.push(
      `${source.id}: parse count mismatch; manifest body/structure=${source.bodyParagraphCount}/${source.structureBlockCount}, actual=${bodyCount}/${structureCount}`,
    );
  }

  let bodyIndex = 0;
  let structureIndex = 0;
  const inkSource = inkByChapter.get(source.chapterId) ?? "";

  blocks.forEach((paragraph, offset) => {
    const blockIndex = offset + 1;
    const textHash = sha256Text(paragraph);

    if (isSourceStructureBlock(paragraph)) {
      structureIndex += 1;
      structure.push({
        id: `${source.id}_struct_${String(structureIndex).padStart(3, "0")}`,
        sourceId: source.id,
        blockIndex,
        textHash,
        textPreview: paragraph.slice(0, 120),
        kind: paragraph.trimStart().startsWith("#") ? "title" : "separator",
      });
      return;
    }

    bodyIndex += 1;
    const entryId = `${source.id}_p${String(bodyIndex).padStart(3, "0")}`;
    const override = overrides.entries[entryId];
    if (override) {
      usedOverrides.add(entryId);
      if (override.sourceHash !== textHash) {
        generationErrors.push(
          `${entryId}: override sourceHash ${String(override.sourceHash)} does not match source paragraph ${textHash}`,
        );
      }
    }
    const dialogueQuotes = extractQuotes(paragraph);

    let sceneId = override?.sceneId ?? null;
    let status;
    let adaptationReceipt;

    const candidateReceipt = override?.adaptationReceipt;
    const wantsAdaptation = override?.status === "approved-adaptation";

    if (wantsAdaptation) {
      if (!sceneId) {
        generationErrors.push(`${entryId}: approved adaptation is missing sceneId`);
      }
      const validation = validateAdaptationReceipt({
        receipt: candidateReceipt,
        entry: { textHash, sceneId },
        sourceParagraph: paragraph,
        inkSource,
      });
      if (!validation.ok) {
        generationErrors.push(
          `${entryId}: invalid approved-adaptation receipt: ${validation.errors.join("; ")}`,
        );
      } else {
        status = "approved-adaptation";
        adaptationReceipt = {
          sourceHash: candidateReceipt.sourceHash ?? candidateReceipt.textHash,
          sceneId: candidateReceipt.sceneId,
          factMappings: candidateReceipt.factMappings.map((mapping) => ({ ...mapping })),
          pacingRationale: candidateReceipt.pacingRationale,
        };
        reviewedAdaptations += 1;
      }
    } else {
      if (override?.status && override.status !== "approved-adaptation") {
        generationErrors.push(
          `${entryId}: overrides may only set status to approved-adaptation; exact entries derive their status`,
        );
      }
      const exactSceneIds = findExactSourceSceneIds(inkSource, paragraph);
      if (override?.sceneId) {
        if (!exactSceneIds.includes(override.sceneId)) {
          generationErrors.push(
            `${entryId}: override scene ${override.sceneId} does not contain the exact player-facing source paragraph`,
          );
        }
        sceneId = override.sceneId;
      } else if (exactSceneIds.length === 1) {
        inferredMappings += 1;
        sceneId = exactSceneIds[0];
      } else if (exactSceneIds.length === 0) {
        generationErrors.push(
          `${entryId}: no exact player-facing scene match; add a reviewed approved-adaptation override`,
        );
      } else {
        generationErrors.push(
          `${entryId}: exact paragraph occurs in multiple scenes (${exactSceneIds.join(", ")}); add a reviewed scene override`,
        );
      }

      status = dialogueQuotes.length > 0 ? "verbatim-dialogue" : "narrated";
    }

    entries.push({
      id: entryId,
      sourceId: source.id,
      paragraphIndex: bodyIndex,
      blockIndex,
      textHash,
      textPreview: paragraph.slice(0, 120),
      chapterId: source.chapterId,
      sceneId,
      beatId: sceneId,
      status,
      dialogueQuotes,
      notes: override?.notes ?? "",
      ...(adaptationReceipt ? { adaptationReceipt } : {}),
    });
  });

  const sourceBody = blocks.filter((block) => !isSourceStructureBlock(block));
  const sourceEntries = entries.filter((entry) => entry.sourceId === source.id);
  const occurrenceValidation = validateExactOccurrenceMappings({
    entries: sourceEntries,
    sourceParagraphs: sourceBody,
    inkSource,
  });
  generationErrors.push(...occurrenceValidation.errors);
}

for (const overrideId of Object.keys(overrides.entries)) {
  if (!usedOverrides.has(overrideId)) {
    generationErrors.push(
      `${overrideId}: stale coverage override does not match a source paragraph`,
    );
  }
}
if (generationErrors.length > 0) {
  fail(["Coverage generation failed:", ...generationErrors]);
}

const generatedDigest = computeCoverageMappingDigest(entries);
if (!acceptMapping && generatedDigest !== sourceManifest.coverageMappingDigest.value) {
  fail(
    `Generated coverage mapping digest mismatch: manifest=${sourceManifest.coverageMappingDigest.value} generated=${generatedDigest}. Review the mapping diff, then rerun with --accept-mapping.`,
  );
}

const ledger = {
  id: `${sourceManifest.id}-coverage`,
  packageId: sourceManifest.id,
  generatedAt: sourceManifest.coverageUpdatedAt ?? sourceManifest.importedAt,
  allowedStatuses: ALLOWED_STATUSES,
  structure,
  entries,
};

if (acceptMapping) {
  sourceManifest.coverageMappingDigest = {
    algorithm: "sha256",
    contractVersion: 2,
    entryCount: entries.length,
    value: generatedDigest,
  };
}

const finalDigestCheck = validateCoverageMappingDigest(
  entries,
  sourceManifest.coverageMappingDigest,
);
if (!finalDigestCheck.ok) {
  fail(finalDigestCheck.errors);
}
writeJsonTransaction([
  { path: ledgerPath, value: ledger },
  ...(acceptMapping ? [{ path: sourceManifestPath, value: sourceManifest }] : []),
]);
console.log(
  [
    `coverage ledger -> ${ledgerPath}`,
    `entries=${entries.length}`,
    `structure=${structure.length}`,
    `reviewedAdaptations=${reviewedAdaptations}`,
    `inferredMappings=${inferredMappings}`,
    `digest=${generatedDigest}`,
  ].join(" "),
);
