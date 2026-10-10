#!/usr/bin/env node
/**
 * Read-only release gate for novel snapshot -> Ink -> compiled runtime fidelity.
 *
 * Checks source registration/hashes, 1:1 coverage, adaptation receipts,
 * committed compile freshness, prose truncation, catalog alignment,
 * representative runtime traversal, and real displayed-text witnesses.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeCoverageMappingDigest,
  findExactSourceSceneIds,
  isSourceStructureBlock,
  listInkScenes,
  parseSourceBlocks,
  sha256Text,
  validateAdaptationReceipt,
  validateCoverageMappingDigest,
  validateExactOccurrenceMappings,
} from "./coverage-contract.mjs";
import { exploreRepresentativeChapter, hasRuntimeTextWitness } from "./runtime-fidelity.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
const sourcesDir = join(packageRoot, "sources", "draft-2026-07");
const inkDir = join(packageRoot, "ink");
const compiledDir = join(packageRoot, "compiled");
const manifestPath = join(sourcesDir, "SOURCE-MANIFEST.json");
const ledgerPath = join(packageRoot, "ledgers", "draft-2026-07-coverage.json");
const catalogPath = join(packageRoot, "catalog", "story-catalog.json");
const require = createRequire(resolve(repoRoot, "apps/web/package.json"));
const { Compiler } = require("inkjs/full");
const { Story } = require("inkjs");

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--json") || args.filter((arg) => arg === "--json").length > 1) {
  console.error("Usage: node verify-fidelity.mjs [--json]");
  process.exit(1);
}
const jsonOutput = args.includes("--json");

const MAX_EXPLORED_STATES = 50_000;
const NON_PROSE_PREFIXES = ["#", "+", "->", "VAR", "~", "*", "//", "{", "-", "=", "==="];
const TERMINAL_PUNCTUATION = /[.!?。！？…”"’）)】\]:：—*]$/u;
const MIN_PROSE_LENGTH = 40;
const ALLOWED_STATUSES = new Set([
  "verbatim-dialogue",
  "narrated",
  "visualized",
  "interactive",
  "approved-adaptation",
]);

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function findTruncatedProse(inkSource) {
  const offenders = [];
  let knot = "unknown";
  inkSource.split("\n").forEach((line, index) => {
    const knotMatch = /^=== (\S+) ===/.exec(line);
    if (knotMatch?.[1]) {
      knot = knotMatch[1];
      return;
    }
    const text = line.trim();
    if (!text || NON_PROSE_PREFIXES.some((prefix) => text.startsWith(prefix))) {
      return;
    }
    if (text.length >= MIN_PROSE_LENGTH && !TERMINAL_PUNCTUATION.test(text)) {
      offenders.push(`${knot} L${index + 1}: …${text.slice(-24)}`);
    }
  });
  return offenders;
}

const errors = [];
const summaries = [];

function addError(scope, message) {
  errors.push(`[${scope}] ${message}`);
}

function verifyRuntimeArtifact(scope, inkSource, compiledJson) {
  for (const offender of findTruncatedProse(inkSource)) {
    addError(scope, `possible truncated prose: ${offender}`);
  }

  let compiledFresh = false;
  try {
    const recompiled = JSON.stringify(JSON.parse(new Compiler(inkSource).Compile().ToJson()));
    const committed = JSON.stringify(JSON.parse(compiledJson));
    compiledFresh = recompiled === committed;
    if (!compiledFresh) {
      addError(scope, "compiled JSON is stale; run pnpm --filter @supaluv/content compile-ink");
    }
  } catch (error) {
    addError(
      scope,
      `Ink compile failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let exploration = {
    mode: "representative-visible-menu",
    reachableScenes: new Set(),
    displayedTextsByScene: new Map(),
    exploredStates: 0,
    expandedMenus: 0,
    terminalStates: 0,
    errors: [],
  };
  try {
    exploration = exploreRepresentativeChapter(Story, compiledJson, MAX_EXPLORED_STATES);
    for (const message of exploration.errors) {
      addError(scope, message);
    }
    for (const sceneId of listInkScenes(inkSource).map((scene) => scene.sceneId)) {
      if (!exploration.reachableScenes.has(sceneId)) {
        addError(scope, `declared scene is unreachable at runtime: ${sceneId}`);
      }
    }
  } catch (error) {
    addError(
      scope,
      `runtime exploration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return { compiledFresh, exploration };
}

let manifest;
let ledger;
let catalog;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonOutput) {
    console.log(
      JSON.stringify({ ok: false, summaries, errors: [`[package] ${message}`] }, null, 2),
    );
  } else {
    console.error(`FAIL content:fidelity\n[package] ${message}`);
  }
  process.exit(1);
}

const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
const actualSnapshots = readdirSync(sourcesDir)
  .filter((file) => /^draft\d+\.md$/u.test(file))
  .sort();
const registeredSnapshots = sources.map((source) => source.relativePath).sort();
if (JSON.stringify(actualSnapshots) !== JSON.stringify(registeredSnapshots)) {
  addError(
    "package",
    `source registration mismatch: manifest=[${registeredSnapshots.join(", ")}] disk=[${actualSnapshots.join(", ")}]`,
  );
}

const digestValidation = validateCoverageMappingDigest(
  ledger.entries ?? [],
  manifest.coverageMappingDigest,
);
for (const message of digestValidation.errors) {
  addError("package", message);
}
if (ledger.packageId !== manifest.id) {
  addError("package", `ledger packageId ${String(ledger.packageId)} != manifest id ${manifest.id}`);
}

const productionChapters = (catalog.productionChapters ?? []).filter(
  (chapter) => chapter.packageId === manifest.id,
);
const catalogChapterIds = productionChapters.map((chapter) => chapter.id).sort();
const sourceChapterIds = sources.map((source) => source.chapterId).sort();
if (JSON.stringify(catalogChapterIds) !== JSON.stringify(sourceChapterIds)) {
  addError(
    "catalog",
    `production/source chapter mismatch: catalog=[${catalogChapterIds.join(", ")}] sources=[${sourceChapterIds.join(", ")}]`,
  );
}
const packageRecord = (catalog.packages ?? []).find((entry) => entry.packageId === manifest.id);
if (!packageRecord) {
  addError("catalog", `missing package ${manifest.id}`);
} else if (
  JSON.stringify([...(packageRecord.chapterIds ?? [])].sort()) !== JSON.stringify(sourceChapterIds)
) {
  addError("catalog", `package ${manifest.id} chapterIds do not match registered sources`);
}

const seenEntryIds = new Set();
for (const entry of ledger.entries ?? []) {
  if (seenEntryIds.has(entry.id)) {
    addError("ledger", `duplicate entry id ${entry.id}`);
  }
  seenEntryIds.add(entry.id);
  if (!ALLOWED_STATUSES.has(entry.status)) {
    addError(entry.id, `unsupported status ${String(entry.status)}`);
  }
}

for (const source of sources) {
  const scope = source.chapterId ?? source.id ?? "unknown-source";
  const sourcePath = join(sourcesDir, source.relativePath ?? "");
  const inkPath = join(inkDir, source.inkFile ?? "");
  const compiledPath = join(compiledDir, `${source.chapterId}.json`);
  if (!existsSync(sourcePath) || !existsSync(inkPath) || !existsSync(compiledPath)) {
    addError(scope, "source, Ink, or compiled runtime file is missing");
    continue;
  }

  const sourceBuffer = readFileSync(sourcePath);
  const sourceText = sourceBuffer.toString("utf8");
  const inkSource = readFileSync(inkPath, "utf8");
  const compiledJson = readFileSync(compiledPath, "utf8");
  const blocks = parseSourceBlocks(sourceText);
  const body = blocks.filter((block) => !isSourceStructureBlock(block));
  const structure = blocks.filter((block) => isSourceStructureBlock(block));
  const chapterEntries = (ledger.entries ?? []).filter((entry) => entry.sourceId === source.id);
  const chapterStructure = (ledger.structure ?? []).filter((entry) => entry.sourceId === source.id);

  if (sha256Buffer(sourceBuffer) !== source.sha256) {
    addError(scope, "source sha256 does not match manifest");
  }
  if (body.length !== source.bodyParagraphCount) {
    addError(scope, `body count manifest=${source.bodyParagraphCount} actual=${body.length}`);
  }
  if (structure.length !== source.structureBlockCount) {
    addError(
      scope,
      `structure count manifest=${source.structureBlockCount} actual=${structure.length}`,
    );
  }
  if (chapterEntries.length !== body.length) {
    addError(scope, `coverage entries=${chapterEntries.length} source paragraphs=${body.length}`);
  }
  if (chapterStructure.length !== structure.length) {
    addError(
      scope,
      `coverage structure=${chapterStructure.length} source structure=${structure.length}`,
    );
  }

  const catalogEntry = productionChapters.find((chapter) => chapter.id === source.chapterId);
  if (!catalogEntry) {
    addError(scope, "chapter is absent from the production catalog");
  } else {
    if (catalogEntry.inkFile !== source.inkFile) {
      addError(scope, `catalog Ink file ${String(catalogEntry.inkFile)} != ${source.inkFile}`);
    }
    if (!catalogEntry.labels?.["zh-CN"] || !catalogEntry.labels?.en) {
      addError(scope, "catalog chapter is missing bilingual labels");
    }
    if (!Array.isArray(catalogEntry.voice?.languages)) {
      addError(scope, "catalog chapter is missing voice language configuration");
    }
  }

  let exact = 0;
  let adapted = 0;
  for (const [index, paragraph] of body.entries()) {
    const expectedId = `${source.id}_p${String(index + 1).padStart(3, "0")}`;
    const entry = chapterEntries[index];
    if (!entry) {
      addError(scope, `missing coverage entry ${expectedId}`);
      continue;
    }
    if (entry.id !== expectedId || entry.paragraphIndex !== index + 1) {
      addError(scope, `coverage order mismatch at ${expectedId}; found ${entry.id}`);
    }
    if (entry.textHash !== sha256Text(paragraph)) {
      addError(entry.id, "source paragraph hash mismatch");
    }
    if (entry.chapterId !== source.chapterId) {
      addError(entry.id, `chapterId ${entry.chapterId} != ${source.chapterId}`);
    }

    if (entry.status === "approved-adaptation") {
      adapted += 1;
      const validation = validateAdaptationReceipt({
        receipt: entry.adaptationReceipt,
        entry,
        sourceParagraph: paragraph,
        inkSource,
      });
      for (const message of validation.errors) {
        addError(entry.id, message);
      }
    } else {
      exact += 1;
      const sceneIds = findExactSourceSceneIds(inkSource, paragraph);
      if (!sceneIds.includes(entry.sceneId)) {
        addError(
          entry.id,
          `exact paragraph is not player-facing in mapped scene ${String(entry.sceneId)}; matches=[${sceneIds.join(", ")}]`,
        );
      }
      if (entry.adaptationReceipt !== undefined) {
        addError(entry.id, "non-adapted entry must not carry an adaptation receipt");
      }
    }
  }
  for (const [index, structuralBlock] of structure.entries()) {
    const entry = chapterStructure[index];
    if (!entry || entry.textHash !== sha256Text(structuralBlock)) {
      addError(scope, `structure hash/order mismatch at index ${index + 1}`);
    }
  }

  const occurrenceValidation = validateExactOccurrenceMappings({
    entries: chapterEntries,
    sourceParagraphs: body,
    inkSource,
  });
  for (const message of occurrenceValidation.errors) {
    addError(scope, message);
  }

  const { compiledFresh, exploration } = verifyRuntimeArtifact(scope, inkSource, compiledJson);
  try {
    for (const entry of chapterEntries) {
      if (entry.sceneId && !exploration.reachableScenes.has(entry.sceneId)) {
        addError(entry.id, `mapped scene is unreachable at runtime: ${entry.sceneId}`);
      }
    }
    for (const [index, paragraph] of body.entries()) {
      const entry = chapterEntries[index];
      if (
        entry &&
        entry.status !== "approved-adaptation" &&
        !hasRuntimeTextWitness(exploration, entry.sceneId, paragraph)
      ) {
        addError(
          entry.id,
          `no representative runtime display witness for exact paragraph in scene ${String(entry.sceneId)}`,
        );
      }
    }
    for (const entry of chapterEntries.filter(
      (candidate) => candidate.status === "approved-adaptation",
    )) {
      for (const mapping of entry.adaptationReceipt?.factMappings ?? []) {
        if (!hasRuntimeTextWitness(exploration, entry.sceneId, mapping.targetSnippet)) {
          addError(
            entry.id,
            `no representative runtime display witness for adaptation target in scene ${String(entry.sceneId)}: ${mapping.targetSnippet}`,
          );
        }
      }
    }
  } catch (error) {
    addError(
      scope,
      `runtime exploration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const localeSummaries = {
    "zh-CN": {
      compiledFresh,
      scenes: exploration.reachableScenes.size,
      menus: exploration.expandedMenus,
      terminals: exploration.terminalStates,
    },
  };
  for (const language of catalogEntry?.voice?.languages ?? []) {
    if (language === "zh-CN") {
      continue;
    }
    const localizedInkFile = source.inkFile.replace(/\.ink$/u, `.${language}.ink`);
    const localizedInkPath = join(inkDir, localizedInkFile);
    const localizedCompiledPath = join(compiledDir, `${source.chapterId}.${language}.json`);
    if (!existsSync(localizedInkPath) || !existsSync(localizedCompiledPath)) {
      addError(scope, `configured ${language} Ink or compiled runtime file is missing`);
      continue;
    }
    const localizedInk = readFileSync(localizedInkPath, "utf8");
    const localizedCompiled = readFileSync(localizedCompiledPath, "utf8");
    const localizedScope = `${scope}:${language}`;
    const localized = verifyRuntimeArtifact(localizedScope, localizedInk, localizedCompiled);
    const baseSceneIds = listInkScenes(inkSource)
      .map((scene) => scene.sceneId)
      .sort();
    const localizedSceneIds = listInkScenes(localizedInk)
      .map((scene) => scene.sceneId)
      .sort();
    if (JSON.stringify(localizedSceneIds) !== JSON.stringify(baseSceneIds)) {
      addError(localizedScope, "localized scene ids do not match the zh-CN authored topology");
    }
    localeSummaries[language] = {
      compiledFresh: localized.compiledFresh,
      scenes: localized.exploration.reachableScenes.size,
      menus: localized.exploration.expandedMenus,
      terminals: localized.exploration.terminalStates,
    };
  }

  summaries.push({
    sourceId: source.id,
    chapterId: source.chapterId,
    bodyParagraphs: body.length,
    exact,
    adapted,
    reachableScenes: exploration.reachableScenes.size,
    exploredStates: exploration.exploredStates,
    choiceMenus: exploration.expandedMenus,
    terminalStates: exploration.terminalStates,
    compiledFresh,
    locales: localeSummaries,
  });
}

for (const entry of ledger.entries ?? []) {
  if (!sources.some((source) => source.id === entry.sourceId)) {
    addError(entry.id, `coverage references unregistered source ${String(entry.sourceId)}`);
  }
}

const result = {
  ok: errors.length === 0,
  packageId: manifest.id,
  coverageDigest: computeCoverageMappingDigest(ledger.entries ?? []),
  totals: {
    chapters: summaries.length,
    bodyParagraphs: summaries.reduce((sum, summary) => sum + summary.bodyParagraphs, 0),
    exact: summaries.reduce((sum, summary) => sum + summary.exact, 0),
    adapted: summaries.reduce((sum, summary) => sum + summary.adapted, 0),
  },
  summaries,
  errors,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  for (const summary of summaries) {
    console.log(
      `PASS ${summary.chapterId} locales=${Object.keys(summary.locales).join(",")} paragraphs=${summary.bodyParagraphs} exact=${summary.exact} adapted=${summary.adapted} scenes=${summary.reachableScenes} menus=${summary.choiceMenus} terminals=${summary.terminalStates}`,
    );
  }
  console.log(
    `PASS content:fidelity chapters=${result.totals.chapters} paragraphs=${result.totals.bodyParagraphs} exact=${result.totals.exact} adapted=${result.totals.adapted} digest=${result.coverageDigest}`,
  );
} else {
  console.error(`FAIL content:fidelity errors=${errors.length}`);
  for (const message of errors) {
    console.error(message);
  }
}

if (!result.ok) {
  process.exit(1);
}
