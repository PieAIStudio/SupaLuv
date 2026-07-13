#!/usr/bin/env node
/**
 * Generate framework-neutral NarrativeGraph artifacts from production Ink.
 *
 * Topology comes from Ink runtime exploration (compiled semantics), not regex
 * topology parsing. A line-oriented source index only attaches source ranges.
 *
 * Node-only. Uses inkjs/full for compile+explore. Never import this from web.
 *
 * Outputs (byte-stable, oxfmt-pretty JSON):
 *   packages/content/generated/narrative-graph-creator.json
 *   packages/content/generated/narrative-graph-player.json
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
const inkDir = join(packageRoot, "ink");
const manifestsDir = join(packageRoot, "manifests");
const outDir = join(packageRoot, "generated");
const require = createRequire(resolve(packageRoot, "../../apps/web/package.json"));
const { Compiler, Story } = require("inkjs/full");

const SCHEMA_VERSION = 1;

/** Single data-only catalog SSOT shared with packages/content/src/index.ts. */
const CATALOG_PATH = join(packageRoot, "catalog/story-catalog.json");
const storyCatalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
const PACKAGE_ID = storyCatalog.defaultPackageId;

/**
 * Production chapters for graph generation — derived only from catalog SSOT.
 * Never hard-code package id / order / checkpoints / ink filenames here.
 */
const CHAPTERS = storyCatalog.productionChapters.map((chapter) => {
  if (!chapter.inkFile || !chapter.manifestFile) {
    throw new Error(
      `story-catalog.json production chapter ${chapter.id} missing inkFile/manifestFile`,
    );
  }
  if (chapter.packageId !== PACKAGE_ID) {
    throw new Error(
      `story-catalog.json production chapter ${chapter.id} packageId mismatch ` +
        `(${chapter.packageId} !== ${PACKAGE_ID})`,
    );
  }
  return {
    storyId: chapter.id,
    chapterId: chapter.id,
    chapterOrder: chapter.chapterIndex,
    inkFile: chapter.inkFile,
    manifestFile: chapter.manifestFile,
    checkpoint: chapter.checkpoint,
    label: chapter.label,
  };
});

function formatWithOxfmt(filePath) {
  const oxfmtBin = resolve(repoRoot, "node_modules/.bin/oxfmt");
  if (!existsSync(oxfmtBin)) {
    throw new Error(`oxfmt not found at ${oxfmtBin}; run pnpm install at repo root`);
  }
  execFileSync(oxfmtBin, [filePath, "--write"], { cwd: repoRoot, stdio: "inherit" });
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// Shared semantic + opaque id helpers (Node 24 TS strip / native import).
const sharedNg = await import(
  pathToFileURL(resolve(repoRoot, "packages/shared/src/narrative-graph.ts")).href
);
const {
  assertNarrativeGraphIntegrity,
  narrativeSceneNodeId,
  narrativeChoiceEdgeId,
  narrativeChapterTransitionEdgeId,
  toPlayerSkeleton,
} = sharedNg;

function sceneNodeId(storyId, stableSceneId) {
  return narrativeSceneNodeId(storyId, stableSceneId);
}

function choiceEdgeId(storyId, stableChoiceId) {
  return narrativeChoiceEdgeId(storyId, stableChoiceId);
}

function chapterTransitionEdgeId(packageId, fromStoryId, toStoryId) {
  return narrativeChapterTransitionEdgeId(packageId, fromStoryId, toStoryId);
}

function sceneFromTags(tags) {
  const tag = (tags ?? []).find((item) => String(item).startsWith("scene:"));
  return tag ? String(tag).slice("scene:".length) : null;
}

function choiceIdFromTags(tags) {
  const tag = (tags ?? []).find((item) => String(item).startsWith("choice:"));
  return tag ? String(tag).slice("choice:".length) : null;
}

/**
 * Line-oriented source index for ranges only — never decides topology.
 */
function buildSourceIndex(inkSource, inkRelPath) {
  const lines = inkSource.replace(/\r\n/g, "\n").split("\n");
  const sceneRanges = new Map();
  const choiceRanges = new Map();
  const knotStarts = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;
    const knotMatch = /^===\s+([A-Za-z0-9_]+)\s+===/.exec(line);
    if (knotMatch) {
      knotStarts.push({ knotId: knotMatch[1], line: lineNo });
    }
    const sceneMatch = /#\s*scene:([A-Za-z0-9_]+)/.exec(line);
    if (sceneMatch) {
      const sceneId = sceneMatch[1];
      if (!sceneRanges.has(sceneId)) {
        sceneRanges.set(sceneId, {
          file: inkRelPath,
          startLine: lineNo,
          endLine: lineNo,
          titleLine: null,
          textLines: [],
        });
      }
    }
    const choiceMatch = /#\s*choice:([A-Za-z0-9_]+)/.exec(line);
    if (choiceMatch) {
      choiceRanges.set(choiceMatch[1], {
        file: inkRelPath,
        startLine: lineNo,
        endLine: lineNo,
      });
    }
  }

  // Expand scene ranges to knot span (or last scene-tag block for multi-stitch scenes).
  for (let k = 0; k < knotStarts.length; k += 1) {
    const start = knotStarts[k];
    const endLine = k + 1 < knotStarts.length ? knotStarts[k + 1].line - 1 : lines.length;
    // Prefer # scene tag inside the knot if present; else knot id as scene id.
    let sceneId = start.knotId;
    for (let lineNo = start.line; lineNo <= endLine; lineNo += 1) {
      const sceneMatch = /#\s*scene:([A-Za-z0-9_]+)/.exec(lines[lineNo - 1] ?? "");
      if (sceneMatch) {
        sceneId = sceneMatch[1];
        break;
      }
    }
    const existing = sceneRanges.get(sceneId);
    if (existing) {
      existing.startLine = Math.min(existing.startLine, start.line);
      existing.endLine = Math.max(existing.endLine, endLine);
    } else {
      sceneRanges.set(sceneId, {
        file: inkRelPath,
        startLine: start.line,
        endLine,
        titleLine: null,
        textLines: [],
      });
    }
  }

  // Collect every non-empty non-structural prose line. Creator Studio uses
  // these exact one-line source ranges as its only editable surface.
  for (const [sceneId, range] of sceneRanges) {
    const prose = [];
    for (let lineNo = range.startLine; lineNo <= range.endLine; lineNo += 1) {
      const raw = lines[lineNo - 1] ?? "";
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("//")) continue;
      if (trimmed.startsWith("===")) continue;
      if (trimmed.startsWith("=")) continue;
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("+") || trimmed.startsWith("*")) continue;
      if (trimmed.startsWith("->")) continue;
      if (trimmed.startsWith("~")) continue;
      if (trimmed.startsWith("{") || trimmed.startsWith("}")) continue;
      if (trimmed.startsWith("- ")) continue;
      prose.push({ lineNo, text: trimmed });
    }
    range.textLines = prose;
    range.titleLine = prose[0]?.text ?? sceneId;
  }

  return { sceneRanges, choiceRanges, lines };
}

function extractManifestSceneIds(manifestSource) {
  const ids = [];
  for (const match of manifestSource.matchAll(/\bid:\s*"([A-Za-z0-9_]+)"/g)) {
    ids.push(match[1]);
  }
  return ids;
}

function extractManifestTitles(manifestSource) {
  // Pair sequential id + title fields in scene objects (id appears before title).
  const titles = new Map();
  const idMatches = [...manifestSource.matchAll(/\bid:\s*"([A-Za-z0-9_]+)"/g)];
  const titleMatches = [...manifestSource.matchAll(/\btitle:\s*"((?:\\.|[^"\\])*)"/g)];
  const count = Math.min(idMatches.length, titleMatches.length);
  for (let i = 0; i < count; i += 1) {
    const id = idMatches[i][1];
    const title = titleMatches[i][1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
    titles.set(id, title);
  }
  return titles;
}

function runToBoundary(story) {
  let sceneId = null;
  const texts = [];
  while (story.canContinue) {
    const line = story.Continue() ?? "";
    const sid = sceneFromTags(story.currentTags ?? []);
    if (sid) {
      sceneId = sid;
    }
    if (line.trim()) {
      texts.push(line.trim());
    }
  }
  return {
    sceneId,
    text: texts.join("\n\n"),
    choices: story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text,
      choiceId: choiceIdFromTags(choice.tags),
    })),
    ended: !story.canContinue && story.currentChoices.length === 0,
    stateJson: story.state.ToJson(),
  };
}

function menuKey(boundary) {
  const ids = boundary.choices.map((c) => c.choiceId || `idx:${c.index}`).join(",");
  return `${boundary.sceneId ?? "null"}::${ids}`;
}

/**
 * Explore all reachable choice menus via Ink runtime.
 * Dedupes by (sceneId + choice-id set) so multi-stitch scenes collapse.
 */
function exploreChapterTopology(compiledJson) {
  const story = new Story(compiledJson);
  const start = runToBoundary(story);
  if (!start.sceneId) {
    throw new Error("Chapter entry has no # scene: tag");
  }

  /** @type {Map<string, { sceneId: string, firstText: string, choiceIds: Set<string> }>} */
  const nodes = new Map();
  /** @type {Map<string, object>} */
  const edges = new Map();
  const expandedMenus = new Set();
  const queue = [start];
  let steps = 0;

  while (queue.length > 0 && steps < 50000) {
    steps += 1;
    const current = queue.shift();
    if (current.sceneId) {
      const existing = nodes.get(current.sceneId) ?? {
        sceneId: current.sceneId,
        firstText: current.text,
        choiceIds: new Set(),
      };
      if (!existing.firstText && current.text) {
        existing.firstText = current.text;
      }
      for (const choice of current.choices) {
        if (choice.choiceId) {
          existing.choiceIds.add(choice.choiceId);
        }
      }
      nodes.set(current.sceneId, existing);
    }

    if (current.ended || current.choices.length === 0) {
      continue;
    }

    const key = menuKey(current);
    if (expandedMenus.has(key)) {
      continue;
    }
    expandedMenus.add(key);

    const siblingCount = current.choices.length;
    for (const choice of current.choices) {
      if (!choice.choiceId) {
        throw new Error(
          `Missing # choice: tag at scene ${current.sceneId} label=${JSON.stringify(choice.text)}`,
        );
      }
      const branch = new Story(compiledJson);
      branch.state.LoadJson(current.stateJson);
      branch.ChooseChoiceIndex(choice.index);
      const next = runToBoundary(branch);

      const kind = siblingCount === 1 ? "continue" : "choice";
      const endsChapter = Boolean(next.ended && !next.sceneId);
      // END-bound choices keep a valid endpoint on the terminal scene (self).
      const toSceneId = next.sceneId ?? current.sceneId;
      const edgeKey = choice.choiceId;
      if (edges.has(edgeKey)) {
        const prior = edges.get(edgeKey);
        if (prior.fromSceneId !== current.sceneId || prior.toSceneId !== toSceneId) {
          throw new Error(
            `Duplicate choice id ${choice.choiceId} with conflicting endpoints: ` +
              `${prior.fromSceneId}->${prior.toSceneId} vs ${current.sceneId}->${toSceneId}`,
          );
        }
      } else {
        edges.set(edgeKey, {
          choiceId: choice.choiceId,
          fromSceneId: current.sceneId,
          toSceneId,
          label: choice.text,
          kind,
          endsChapter:
            endsChapter ||
            (next.ended &&
              next.sceneId === current.sceneId &&
              siblingCount === 1 &&
              !next.choices.length),
        });
      }

      // When the divert lands on another scene (or same multi-stitch scene), continue.
      if (next.sceneId) {
        const nextKey = menuKey(next);
        if (!expandedMenus.has(nextKey)) {
          queue.push(next);
        } else if (!nodes.has(next.sceneId)) {
          queue.push(next);
        }
      }
    }
  }

  if (steps >= 50000) {
    throw new Error("Topology exploration exceeded step budget (possible cycle explosion)");
  }

  return {
    entrySceneId: start.sceneId,
    nodes,
    edges,
    steps,
  };
}

function buildRevision(inputs) {
  const material = inputs.map((item) => `${item.path}\n${sha256Text(item.body)}\n`).join("");
  return sha256Text(material).slice(0, 16);
}

function sortById(items) {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeRepoPath(value) {
  return value.split("\\").join("/");
}

function readSourceWithOverrides(absolutePath, sourceOverrides) {
  const repoRelative = normalizeRepoPath(relative(repoRoot, absolutePath));
  if (sourceOverrides instanceof Map && sourceOverrides.has(repoRelative)) {
    return sourceOverrides.get(repoRelative);
  }
  if (
    sourceOverrides &&
    !(sourceOverrides instanceof Map) &&
    Object.prototype.hasOwnProperty.call(sourceOverrides, repoRelative)
  ) {
    return sourceOverrides[repoRelative];
  }
  return readFileSync(absolutePath, "utf8");
}

function buildPackageGraph(options = {}) {
  const sourceOverrides = options.sourceOverrides ?? new Map();
  const revisionInputs = [];
  const creatorNodes = [];
  const creatorEdges = [];
  const entryNodeIds = [];
  const terminalNodeIds = [];
  const chapterSummaries = [];

  for (const chapter of CHAPTERS) {
    const inkAbs = join(inkDir, chapter.inkFile);
    const manifestAbs = join(manifestsDir, chapter.manifestFile);
    const inkSource = readSourceWithOverrides(inkAbs, sourceOverrides);
    const manifestSource = readFileSync(manifestAbs, "utf8");
    const inkRelPath = relative(repoRoot, inkAbs).split("\\").join("/");

    revisionInputs.push({ path: inkRelPath, body: inkSource });
    revisionInputs.push({
      path: relative(repoRoot, manifestAbs).split("\\").join("/"),
      body: manifestSource,
    });

    const manifestSceneIds = extractManifestSceneIds(manifestSource);
    const manifestTitles = extractManifestTitles(manifestSource);
    if (manifestSceneIds.length === 0) {
      throw new Error(`No scene ids in manifest ${chapter.manifestFile}`);
    }

    const sourceIndex = buildSourceIndex(inkSource, inkRelPath);
    const compiled = new Compiler(inkSource).Compile();
    const compiledJson = compiled.ToJson();
    const topology = exploreChapterTopology(compiledJson);

    // Validate every manifest scene appears exactly once as a node.
    for (const sceneId of manifestSceneIds) {
      if (!topology.nodes.has(sceneId)) {
        throw new Error(
          `${chapter.storyId}: manifest scene ${sceneId} not reachable in Ink topology`,
        );
      }
    }
    for (const sceneId of topology.nodes.keys()) {
      if (!manifestSceneIds.includes(sceneId)) {
        throw new Error(`${chapter.storyId}: topology scene ${sceneId} missing from manifest`);
      }
    }

    // Choice id uniqueness within chapter already enforced; collect all.
    const choiceIds = [...topology.edges.keys()];
    const uniqueChoiceIds = new Set(choiceIds);
    if (uniqueChoiceIds.size !== choiceIds.length) {
      throw new Error(`${chapter.storyId}: duplicate choice ids in edge map`);
    }

    const entryId = sceneNodeId(chapter.storyId, topology.entrySceneId);
    entryNodeIds.push(entryId);

    // Terminal scenes: nodes with an endsChapter exit, or no non-self structural outs.
    const terminals = new Set();
    for (const edge of topology.edges.values()) {
      if (edge.endsChapter) {
        terminals.add(edge.fromSceneId);
      }
    }
    // Also: nodes with zero outgoing edges that are not endsChapter (hard stop).
    for (const sceneId of topology.nodes.keys()) {
      const outs = [...topology.edges.values()].filter((e) => e.fromSceneId === sceneId);
      if (outs.length === 0) {
        terminals.add(sceneId);
      }
    }
    if (terminals.size === 0) {
      throw new Error(`${chapter.storyId}: no terminal scenes detected`);
    }

    for (const sceneId of manifestSceneIds) {
      const range = sourceIndex.sceneRanges.get(sceneId);
      if (!range) {
        throw new Error(`${chapter.storyId}: missing source range for scene ${sceneId}`);
      }
      if (range.startLine < 1 || range.endLine < range.startLine) {
        throw new Error(`${chapter.storyId}: invalid source range for ${sceneId}`);
      }

      const nodeInfo = topology.nodes.get(sceneId);
      const title = manifestTitles.get(sceneId) ?? range.titleLine ?? sceneId;
      const excerpt =
        (nodeInfo?.firstText || range.textLines.map((t) => t.text).join("\n")).slice(0, 280) ||
        null;
      const dialogueLines = (range.textLines ?? []).map((line) => ({
        text: line.text,
        sourceRange: {
          file: inkRelPath,
          startLine: line.lineNo,
          endLine: line.lineNo,
        },
      }));

      let kind = "scene";
      if (sceneId === topology.entrySceneId) {
        kind = "entry";
      }
      if (terminals.has(sceneId)) {
        kind = "terminal";
      }

      const nodeId = sceneNodeId(chapter.storyId, sceneId);
      if (kind === "terminal") {
        terminalNodeIds.push(nodeId);
      }

      creatorNodes.push({
        id: nodeId,
        storyId: chapter.storyId,
        chapterId: chapter.chapterId,
        chapterOrder: chapter.chapterOrder,
        kind,
        stableSceneId: sceneId,
        title,
        excerpt,
        sourceRange: {
          file: inkRelPath,
          startLine: range.startLine,
          endLine: range.endLine,
        },
        dialogueLines,
      });
    }

    for (const edge of topology.edges.values()) {
      const fromNodeId = sceneNodeId(chapter.storyId, edge.fromSceneId);
      const toNodeId = sceneNodeId(chapter.storyId, edge.toSceneId);
      const sourceRange = sourceIndex.choiceRanges.get(edge.choiceId) ?? null;
      creatorEdges.push({
        id: choiceEdgeId(chapter.storyId, edge.choiceId),
        kind: edge.kind,
        fromNodeId,
        toNodeId,
        stableChoiceId: edge.choiceId,
        ...(edge.endsChapter ? { endsChapter: true } : {}),
        label: edge.label,
        sourceRange,
      });
    }

    chapterSummaries.push({
      storyId: chapter.storyId,
      nodeCount: manifestSceneIds.length,
      edgeCount: topology.edges.size,
      entrySceneId: topology.entrySceneId,
      terminalSceneIds: [...terminals].sort(),
      exploreSteps: topology.steps,
    });
  }

  // Catalog-driven chapter transitions (not inventing manifest topology).
  for (const chapter of CHAPTERS) {
    if (chapter.checkpoint.kind === "next_chapter" && chapter.checkpoint.nextChapterId) {
      const fromChapter = chapter;
      const toChapter = CHAPTERS.find((c) => c.storyId === chapter.checkpoint.nextChapterId);
      if (!toChapter) {
        throw new Error(
          `Checkpoint nextChapterId ${chapter.checkpoint.nextChapterId} not in package`,
        );
      }
      const fromTerminal = creatorNodes.find(
        (n) => n.storyId === fromChapter.storyId && n.kind === "terminal",
      );
      const toEntry = creatorNodes.find(
        (n) => n.storyId === toChapter.storyId && n.kind === "entry",
      );
      if (!fromTerminal || !toEntry) {
        throw new Error(
          `Cannot place chapter_transition ${fromChapter.storyId} -> ${toChapter.storyId}`,
        );
      }
      creatorEdges.push({
        id: chapterTransitionEdgeId(PACKAGE_ID, fromChapter.storyId, toChapter.storyId),
        kind: "chapter_transition",
        fromNodeId: fromTerminal.id,
        toNodeId: toEntry.id,
        stableChoiceId: null,
        label: null,
        sourceRange: null,
      });
    }
  }

  // Package-level revision input: catalog SSOT file + derived production checkpoints.
  const catalogSource = readFileSync(CATALOG_PATH, "utf8");
  revisionInputs.push({
    path: relative(repoRoot, CATALOG_PATH).split("\\").join("/"),
    body: catalogSource,
  });
  const catalogMaterial = JSON.stringify(
    CHAPTERS.map((c) => ({
      storyId: c.storyId,
      chapterOrder: c.chapterOrder,
      checkpoint: c.checkpoint,
    })),
  );
  revisionInputs.push({ path: `catalog:${PACKAGE_ID}:production-chapters`, body: catalogMaterial });
  revisionInputs.sort((a, b) => a.path.localeCompare(b.path));
  const revision = buildRevision(revisionInputs);

  const sortedNodes = sortById(creatorNodes);
  const sortedEdges = sortById(creatorEdges);

  // Cross-chapter choice id uniqueness for package edge ids.
  const choiceEdgeKeys = sortedEdges.filter((e) => e.stableChoiceId).map((e) => e.stableChoiceId);
  if (new Set(choiceEdgeKeys).size !== choiceEdgeKeys.length) {
    throw new Error("Duplicate stableChoiceId across package edges");
  }

  const creator = {
    schemaVersion: SCHEMA_VERSION,
    packageId: PACKAGE_ID,
    revision,
    nodes: sortedNodes,
    edges: sortedEdges,
    entryNodeIds: [...entryNodeIds].sort(),
    terminalNodeIds: [...terminalNodeIds].sort(),
  };

  // Player skeleton: opaque handles only (no semantic scene/choice ids).
  const player = toPlayerSkeleton(creator);

  assertNarrativeGraphIntegrity(creator);
  assertNarrativeGraphIntegrity(player);

  // Collision check on opaque handles (order-independent hash must stay unique).
  if (new Set(player.nodes.map((n) => n.id)).size !== player.nodes.length) {
    throw new Error("Opaque node handle collision");
  }
  if (new Set(player.edges.map((e) => e.id)).size !== player.edges.length) {
    throw new Error("Opaque edge handle collision");
  }
  for (const node of player.nodes) {
    if (!node.id.startsWith("n_")) {
      throw new Error(`Player node id not opaque: ${node.id}`);
    }
  }
  for (const edge of player.edges) {
    if (!edge.id.startsWith("e_")) {
      throw new Error(`Player edge id not opaque: ${edge.id}`);
    }
    if ("stableChoiceId" in edge) {
      throw new Error("Player edge must not include stableChoiceId");
    }
  }

  return { creator, player, chapterSummaries };
}

function writeStableJson(filePath, value) {
  const pretty = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(filePath, pretty, "utf8");
  formatWithOxfmt(filePath);
  return readFileSync(filePath);
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const { creator, player, chapterSummaries } = buildPackageGraph();

  const creatorPath = join(outDir, "narrative-graph-creator.json");
  const playerPath = join(outDir, "narrative-graph-player.json");
  const creatorBytes = writeStableJson(creatorPath, creator);
  const playerBytes = writeStableJson(playerPath, player);

  console.log(
    JSON.stringify(
      {
        packageId: creator.packageId,
        revision: creator.revision,
        schemaVersion: creator.schemaVersion,
        nodes: creator.nodes.length,
        edges: creator.edges.length,
        entries: creator.entryNodeIds,
        terminals: creator.terminalNodeIds,
        chapters: chapterSummaries,
        creatorBytes: creatorBytes.length,
        playerBytes: playerBytes.length,
        creatorPath: relative(repoRoot, creatorPath),
        playerPath: relative(repoRoot, playerPath),
      },
      null,
      2,
    ),
  );
}

// Allow import for tests without running main.
const isDirect =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirect) {
  try {
    main();
  } catch (error) {
    console.error(
      "generate-narrative-graph FAILED:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

export { buildPackageGraph, exploreChapterTopology, buildSourceIndex, readSourceWithOverrides };
