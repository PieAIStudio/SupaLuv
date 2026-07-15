#!/usr/bin/env node
/**
 * Rebuild draft-2026-07 coverage ledger from source snapshots.
 * Body paragraphs only (exclude Markdown titles and standalone —— separators).
 * Preserves approved-adaptation status + adaptationReceipt when still valid.
 * Writes oxfmt-stable pretty JSON.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
const sourcesDir = join(packageRoot, "sources", "draft-2026-07");
const ledgerPath = join(packageRoot, "ledgers", "draft-2026-07-coverage.json");
const inkDir = join(packageRoot, "ink");

function formatWithOxfmt(filePath) {
  const oxfmtBin = resolve(repoRoot, "node_modules/.bin/oxfmt");
  if (!existsSync(oxfmtBin)) {
    throw new Error(`oxfmt not found at ${oxfmtBin}; run pnpm install at repo root`);
  }
  execFileSync(oxfmtBin, [filePath, "--write"], { cwd: repoRoot, stdio: "inherit" });
}

const ALLOWED_STATUSES = [
  "verbatim-dialogue",
  "narrated",
  "visualized",
  "interactive",
  "approved-adaptation",
];

const SOURCE_CHAPTERS = [
  { sourceId: "draft01", file: "draft01.md", chapterId: "draft-ch01", inkFile: "draft-ch01.ink" },
  { sourceId: "draft02", file: "draft02.md", chapterId: "draft-ch02", inkFile: "draft-ch02.ink" },
];

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function parseBlocks(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  return normalized
    .split(/\n\s*\n+/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

function isStructureBlock(paragraph) {
  const lines = paragraph
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 1 && lines[0].startsWith("#")) {
    return true;
  }
  const trimmed = paragraph.trim();
  if (trimmed === "——" || trimmed === "---" || trimmed === "***") {
    return true;
  }
  return /^[—\-–]{2,}$/u.test(trimmed);
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

function stripInkComments(inkSource) {
  return inkSource
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

function isolateSceneKnot(playableInk, sceneId) {
  if (!sceneId || typeof sceneId !== "string") {
    return null;
  }
  const escaped = sceneId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `===\\s+([a-z0-9_]+)\\s+===\\n# scene:${escaped}\\n([\\s\\S]*?)(?=\\n===\\s+|$)`,
  );
  const match = playableInk.match(re);
  if (!match) {
    return null;
  }
  return { knotId: match[1], body: match[2] };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidAdaptationReceipt(receipt, entry, playableInk) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return false;
  }
  const sourceHash = receipt.sourceHash ?? receipt.textHash;
  if (!isNonEmptyString(sourceHash) || sourceHash !== entry.textHash) {
    return false;
  }
  if (!isNonEmptyString(receipt.sceneId) || receipt.sceneId !== entry.sceneId) {
    return false;
  }
  if (!isNonEmptyString(receipt.targetSnippet) || receipt.targetSnippet.trim().length < 8) {
    return false;
  }
  const retained = receipt.retainedFacts;
  if (!Array.isArray(retained) || retained.length < 1 || !retained.every(isNonEmptyString)) {
    return false;
  }
  if (!isNonEmptyString(receipt.pacingRationale)) {
    return false;
  }
  const knot = isolateSceneKnot(playableInk, receipt.sceneId);
  if (!knot || !knot.body.includes(receipt.targetSnippet)) {
    return false;
  }
  return true;
}

function loadPreviousMapping() {
  try {
    const previous = JSON.parse(readFileSync(ledgerPath, "utf8"));
    const byHash = new Map();
    for (const entry of previous.entries ?? []) {
      byHash.set(entry.textHash, entry);
    }
    return byHash;
  } catch {
    return new Map();
  }
}

const previousByHash = loadPreviousMapping();
const playableByChapter = new Map();
for (const source of SOURCE_CHAPTERS) {
  const inkPath = join(inkDir, source.inkFile);
  playableByChapter.set(source.chapterId, stripInkComments(readFileSync(inkPath, "utf8")));
}

const entries = [];
const structure = [];
let preservedAdaptations = 0;
let droppedInvalidAdaptations = 0;

for (const source of SOURCE_CHAPTERS) {
  const raw = readFileSync(join(sourcesDir, source.file), "utf8");
  const blocks = parseBlocks(raw);
  let bodyIndex = 0;
  let structureIndex = 0;
  const playableInk = playableByChapter.get(source.chapterId) ?? "";

  blocks.forEach((paragraph, offset) => {
    const blockIndex = offset + 1;
    const textHash = sha256Text(paragraph);

    if (isStructureBlock(paragraph)) {
      structureIndex += 1;
      structure.push({
        id: `${source.sourceId}_struct_${String(structureIndex).padStart(3, "0")}`,
        sourceId: source.sourceId,
        blockIndex,
        textHash,
        textPreview: paragraph.slice(0, 120),
        kind: paragraph.trimStart().startsWith("#") ? "title" : "separator",
      });
      return;
    }

    bodyIndex += 1;
    const previous = previousByHash.get(textHash) ?? {};
    const dialogueQuotes = extractQuotes(paragraph);
    const sceneId = previous.sceneId ?? null;
    const beatId = previous.beatId ?? previous.sceneId ?? null;

    let status;
    let adaptationReceipt;

    const previousIsValidAdaptation =
      previous.status === "approved-adaptation" &&
      isValidAdaptationReceipt(previous.adaptationReceipt, {
        textHash,
        sceneId: previous.sceneId,
      }, playableInk);

    if (previousIsValidAdaptation) {
      status = "approved-adaptation";
      adaptationReceipt = {
        sourceHash: previous.adaptationReceipt.sourceHash ?? previous.adaptationReceipt.textHash,
        sceneId: previous.adaptationReceipt.sceneId,
        targetSnippet: previous.adaptationReceipt.targetSnippet,
        retainedFacts: [...previous.adaptationReceipt.retainedFacts],
        pacingRationale: previous.adaptationReceipt.pacingRationale,
      };
      preservedAdaptations += 1;
    } else {
      if (previous.status === "approved-adaptation") {
        droppedInvalidAdaptations += 1;
      }
      status =
        previous.status === "verbatim-dialogue" ||
        previous.status === "covered_dialogue_verbatim" ||
        dialogueQuotes.length > 0
          ? "verbatim-dialogue"
          : previous.status === "narrated" ||
              previous.status === "covered_verbatim" ||
              previous.status === "visualized" ||
              previous.status === "interactive"
            ? previous.status === "covered_verbatim"
              ? "narrated"
              : previous.status
            : "narrated";
      // Never silently keep a broken receipt; never invent approved-adaptation.
      adaptationReceipt = undefined;
    }

    const entry = {
      id: `${source.sourceId}_p${String(bodyIndex).padStart(3, "0")}`,
      sourceId: source.sourceId,
      paragraphIndex: bodyIndex,
      blockIndex,
      textHash,
      textPreview: paragraph.slice(0, 120),
      chapterId: source.chapterId,
      sceneId,
      beatId,
      status,
      dialogueQuotes: dialogueQuotes.length > 0 ? dialogueQuotes : (previous.dialogueQuotes ?? []),
      notes: previous.notes ?? "",
    };
    if (adaptationReceipt) {
      entry.adaptationReceipt = adaptationReceipt;
    }
    entries.push(entry);
  });
}

const body01 = entries.filter((entry) => entry.sourceId === "draft01").length;
const body02 = entries.filter((entry) => entry.sourceId === "draft02").length;
if (body01 !== 93 || body02 !== 76 || entries.length !== 169 || structure.length !== 8) {
  console.error(
    `Unexpected parse counts: draft01=${body01} draft02=${body02} entries=${entries.length} structure=${structure.length}`,
  );
  process.exit(1);
}

const missingScene = entries.filter((entry) => !entry.sceneId);
if (missingScene.length > 0) {
  console.error(
    `Coverage entries missing sceneId: ${missingScene.map((entry) => entry.id).join(", ")}`,
  );
  process.exit(1);
}

const ledger = {
  id: "draft-2026-07-coverage",
  packageId: "draft-2026-07",
  generatedAt: "2026-07-13",
  allowedStatuses: ALLOWED_STATUSES,
  structure,
  entries,
};

writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
formatWithOxfmt(ledgerPath);
console.log(
  `coverage ledger -> ${ledgerPath} (entries=${entries.length}, structure=${structure.length}, preservedAdaptations=${preservedAdaptations}, droppedInvalidAdaptations=${droppedInvalidAdaptations})`,
);
