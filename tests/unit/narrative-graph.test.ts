import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertNarrativeGraphIntegrity,
  collectReachableNodeIds,
  isOpaqueNarrativeEdgeId,
  isOpaqueNarrativeNodeId,
  isTerminalSelfExitEdge,
  narrativeChoiceEdgeId,
  narrativeSceneNodeId,
  opaqueNarrativeChoiceEdgeId,
  opaqueNarrativeNodeId,
  projectPlayerPath,
  toPlayerSkeleton,
  type NarrativeGraphCreator,
  type NarrativeGraphPlayerSkeleton,
} from "@supaluv/shared/narrative-graph";

const ROOT = resolve(import.meta.dirname, "../..");
const GENERATED_DIR = resolve(ROOT, "packages/content/generated");
const CREATOR_PATH = resolve(GENERATED_DIR, "narrative-graph-creator.json");
const PLAYER_PATH = resolve(GENERATED_DIR, "narrative-graph-player.json");
const GENERATOR = resolve(ROOT, "packages/content/scripts/generate-narrative-graph.mjs");
const CATALOG_PATH = resolve(ROOT, "packages/content/catalog/story-catalog.json");

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function getInkKnotIds(source: string): string[] {
  return Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===/gm), (match) => match[1]).filter(
    (id): id is string => id !== undefined,
  );
}

/** Semantic fragments that must never appear in the production player artifact. */
const FORBIDDEN_PLAYER_FRAGMENTS = [
  "accept_crazy",
  "go_housing",
  "emotion_calibration",
  "chapter_end",
  "bones_accept",
  "robot",
  "shame",
  "packages/content/ink",
  "draft-ch01.ink",
  "draft-ch02.ink",
  "先看房",
  "骨头留着",
  "我不会评判你",
  "石家小楼",
  "按住手腕",
  "聊天记录测完就删",
] as const;

describe("NarrativeGraph catalog SSOT", () => {
  it("drives production catalog, package meta, and graph package/checkpoints from one JSON", async () => {
    const catalog = readJson<{
      defaultPackageId: string;
      packages: Array<{
        packageId: string;
        label: string;
        startChapterId: string;
        chapterIds: string[];
      }>;
      productionChapters: Array<{
        id: string;
        packageId: string;
        chapterIndex: number;
        checkpoint: { kind: string; nextChapterId?: string };
        inkFile: string;
        manifestFile: string;
      }>;
    }>(CATALOG_PATH);
    const content = await import("@supaluv/content");
    const creator = readJson<NarrativeGraphCreator>(CREATOR_PATH);
    const player = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);

    expect(content.DEFAULT_STORY_PACKAGE_ID).toBe(catalog.defaultPackageId);
    expect(content.draft2026Package).toEqual(
      catalog.packages.find((pkg) => pkg.packageId === catalog.defaultPackageId),
    );
    expect(content.productionStoryCatalog.map((entry) => entry.id)).toEqual(
      catalog.productionChapters.map((chapter) => chapter.id),
    );
    expect(content.productionStoryCatalog.map((entry) => entry.checkpoint)).toEqual(
      catalog.productionChapters.map((chapter) => chapter.checkpoint),
    );
    expect(creator.packageId).toBe(catalog.defaultPackageId);
    expect(player.packageId).toBe(catalog.defaultPackageId);

    const nextChapter = catalog.productionChapters.find(
      (c) => c.checkpoint.kind === "next_chapter",
    );
    expect(nextChapter?.checkpoint.nextChapterId).toBe("draft-ch02");
    const transition = creator.edges.find((edge) => edge.kind === "chapter_transition");
    expect(transition).toMatchObject({
      fromNodeId: narrativeSceneNodeId(nextChapter!.id, "d1_chapter_end"),
      toNodeId: narrativeSceneNodeId(nextChapter!.checkpoint.nextChapterId!, "dch02_s001"),
      stableChoiceId: null,
    });
    expect(player.edges.some((edge) => edge.kind === "chapter_transition")).toBe(true);
  });

  it("generator source no longer hard-codes CHAPTERS arrays or checkpoint literals", () => {
    const source = readFileSync(GENERATOR, "utf8");
    expect(source).toContain("catalog/story-catalog.json");
    expect(source).toContain("storyCatalog.productionChapters");
    expect(source).not.toMatch(/const\s+CHAPTERS\s*=\s*\[/);
    expect(source).not.toMatch(/const\s+PACKAGE_ID\s*=\s*["']draft-2026-07["']/);
    expect(source).not.toMatch(
      /checkpoint:\s*\{\s*kind:\s*["']next_chapter["']\s*,\s*nextChapterId:\s*["']draft-ch02["']/,
    );
    expect(source).not.toMatch(/checkpoint:\s*\{\s*kind:\s*["']draft_end["']\s*\}/);
    expect(source).not.toMatch(/inkFile:\s*["']draft-ch01\.ink["']/);
    expect(source).not.toMatch(/manifestFile:\s*["']draft-ch01-scenes\.ts["']/);
  });
});

describe("NarrativeGraph generated package", () => {
  it("ships creator + player artifacts with matching revision", () => {
    expect(existsSync(CREATOR_PATH)).toBe(true);
    expect(existsSync(PLAYER_PATH)).toBe(true);
    const creator = readJson<NarrativeGraphCreator>(CREATOR_PATH);
    const player = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);
    expect(creator.schemaVersion).toBe(1);
    expect(player.schemaVersion).toBe(1);
    expect(creator.packageId).toBe("draft-2026-07");
    expect(player.packageId).toBe(creator.packageId);
    expect(player.revision).toBe(creator.revision);
    expect(creator.revision).toMatch(/^[a-f0-9]{16}$/);
    expect(toPlayerSkeleton(creator)).toEqual(player);
  });

  it("covers both production chapters, all manifest scenes, and catalog transition", async () => {
    const creator = readJson<NarrativeGraphCreator>(CREATOR_PATH);
    const content = await import("@supaluv/content");
    const ch1 = await content.loadStoryChapter("draft-ch01");
    const ch2 = await content.loadStoryChapter("draft-ch02");
    const expected = {
      "draft-ch01": ch1.scenes.map((s) => s.id),
      "draft-ch02": ch2.scenes.map((s) => s.id),
    };

    assertNarrativeGraphIntegrity(creator, { expectedSceneIdsByStory: expected });
    assertNarrativeGraphIntegrity(readJson(PLAYER_PATH));

    const ch1Nodes = creator.nodes.filter((n) => n.storyId === "draft-ch01");
    const ch2Nodes = creator.nodes.filter((n) => n.storyId === "draft-ch02");
    expect(ch1Nodes).toHaveLength(52);
    expect(ch2Nodes).toHaveLength(41);
    expect(creator.nodes).toHaveLength(93);

    expect(creator.entryNodeIds).toEqual([
      narrativeSceneNodeId("draft-ch01", "dch01_s001"),
      narrativeSceneNodeId("draft-ch02", "dch02_s001"),
    ]);
    expect(creator.terminalNodeIds).toEqual([
      narrativeSceneNodeId("draft-ch01", "d1_chapter_end"),
      narrativeSceneNodeId("draft-ch02", "d2_chapter_end"),
    ]);

    const transition = creator.edges.find((e) => e.kind === "chapter_transition");
    expect(transition).toMatchObject({
      fromNodeId: narrativeSceneNodeId("draft-ch01", "d1_chapter_end"),
      toNodeId: narrativeSceneNodeId("draft-ch02", "dch02_s001"),
      stableChoiceId: null,
    });

    // Every Ink-authored edge has a stable choice id except chapter_transition.
    for (const edge of creator.edges) {
      if (edge.kind === "chapter_transition") {
        expect(edge.stableChoiceId).toBeNull();
      } else {
        expect(edge.stableChoiceId).toBeTruthy();
        expect(edge.id).toBe(
          narrativeChoiceEdgeId(edge.fromNodeId.split("#")[0]!, edge.stableChoiceId!),
        );
      }
    }
  });

  it("maps creator semantic ids to expected opaque player nodes/edges", () => {
    const creator = readJson<NarrativeGraphCreator>(CREATOR_PATH);
    const player = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);
    const playerNodeIds = new Set(player.nodes.map((node) => node.id));
    const playerEdgeIds = new Set(player.edges.map((edge) => edge.id));

    for (const node of creator.nodes) {
      const opaque = opaqueNarrativeNodeId(node.storyId, node.stableSceneId);
      expect(isOpaqueNarrativeNodeId(opaque)).toBe(true);
      expect(playerNodeIds.has(opaque)).toBe(true);
      expect(opaque).not.toContain(node.stableSceneId);
      expect(opaque).not.toContain("#scene:");
    }

    for (const edge of creator.edges) {
      if (edge.kind === "chapter_transition") {
        continue;
      }
      const storyId = edge.fromNodeId.split("#")[0]!;
      const opaque = opaqueNarrativeChoiceEdgeId(storyId, edge.stableChoiceId!);
      expect(isOpaqueNarrativeEdgeId(opaque)).toBe(true);
      expect(playerEdgeIds.has(opaque)).toBe(true);
      expect(opaque).not.toContain(edge.stableChoiceId!);
      expect(opaque).not.toContain("#choice:");
    }

    expect(player.entryNodeIds).toEqual([
      opaqueNarrativeNodeId("draft-ch01", "dch01_s001"),
      opaqueNarrativeNodeId("draft-ch02", "dch02_s001"),
    ]);
    expect(player.terminalNodeIds).toEqual([
      opaqueNarrativeNodeId("draft-ch01", "d1_chapter_end"),
      opaqueNarrativeNodeId("draft-ch02", "d2_chapter_end"),
    ]);
  });

  it("reaches chapter terminals and package ch2 via chapter_transition", () => {
    const player = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);
    const ch1Entry = opaqueNarrativeNodeId("draft-ch01", "dch01_s001");
    const ch1Terminal = opaqueNarrativeNodeId("draft-ch01", "d1_chapter_end");
    const ch2Entry = opaqueNarrativeNodeId("draft-ch02", "dch02_s001");
    const ch2Terminal = opaqueNarrativeNodeId("draft-ch02", "d2_chapter_end");

    const fromCh1 = collectReachableNodeIds([ch1Entry], player.edges);
    expect(fromCh1.has(ch1Terminal)).toBe(true);
    expect(fromCh1.has(ch2Entry)).toBe(true);
    expect(fromCh1.has(ch2Terminal)).toBe(true);

    const fromCh2 = collectReachableNodeIds([ch2Entry], player.edges);
    expect(fromCh2.has(ch2Terminal)).toBe(true);
    expect(fromCh2.has(ch1Entry)).toBe(false);
  });

  it("terminal endsChapter self-exits are markers, not ordinary traversable loops", () => {
    const creator = readJson<NarrativeGraphCreator>(CREATOR_PATH);
    const player = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);
    const terminalSelfExits = player.edges.filter((edge) => isTerminalSelfExitEdge(edge));
    expect(terminalSelfExits.length).toBeGreaterThan(0);

    for (const edge of terminalSelfExits) {
      expect(edge.endsChapter).toBe(true);
      expect(edge.fromNodeId).toBe(edge.toNodeId);
      expect(edge.fromNodeId).toBeTruthy();
    }

    // Reachability must not treat self-exit as a loop that invents extra nodes.
    const ch1Terminal = opaqueNarrativeNodeId("draft-ch01", "d1_chapter_end");
    const onlyTerminal = collectReachableNodeIds([ch1Terminal], terminalSelfExits);
    expect([...onlyTerminal]).toEqual([ch1Terminal]);

    // Creator still records the stable exit choice ids for Studio.
    const creatorTerminalExits = creator.edges.filter(
      (edge) => edge.endsChapter && edge.fromNodeId === edge.toNodeId,
    );
    expect(creatorTerminalExits.some((edge) => edge.stableChoiceId === "d1_go_housing")).toBe(true);
  });

  it("maps selected nodes/choices to valid ink source ranges", () => {
    const creator = readJson<NarrativeGraphCreator>(CREATOR_PATH);
    const inkCh1 = readFileSync(resolve(ROOT, "packages/content/ink/draft-ch01.ink"), "utf8");
    const lines = inkCh1.replace(/\r\n/g, "\n").split("\n");

    const s001 = creator.nodes.find((n) => n.stableSceneId === "dch01_s001");
    expect(s001).toBeTruthy();
    expect(s001!.sourceRange.file).toBe("packages/content/ink/draft-ch01.ink");
    expect(s001!.sourceRange.startLine).toBeGreaterThan(0);
    expect(s001!.sourceRange.endLine).toBeGreaterThanOrEqual(s001!.sourceRange.startLine);
    const slice = lines
      .slice(s001!.sourceRange.startLine - 1, s001!.sourceRange.endLine)
      .join("\n");
    expect(slice).toContain("# scene:dch01_s001");
    expect(slice).toContain("choice:dch01_s001_continue");

    const continueEdge = creator.edges.find((e) => e.stableChoiceId === "dch01_s001_continue");
    expect(continueEdge?.sourceRange?.startLine).toBeTruthy();
    const choiceLine = lines[continueEdge!.sourceRange!.startLine - 1] ?? "";
    expect(choiceLine).toContain("# choice:dch01_s001_continue");

    const multi = creator.edges.find((e) => e.stableChoiceId === "d2_catch_firm");
    const inkCh2 = readFileSync(resolve(ROOT, "packages/content/ink/draft-ch02.ink"), "utf8");
    const lines2 = inkCh2.replace(/\r\n/g, "\n").split("\n");
    expect(multi?.sourceRange?.file).toBe("packages/content/ink/draft-ch02.ink");
    const multiLine = lines2[multi!.sourceRange!.startLine - 1] ?? "";
    expect(multiLine).toContain("# choice:d2_catch_firm");
    expect(multiLine).toContain("按住手腕");
  });

  it("generation is byte-stable across two unchanged runs", () => {
    const beforeCreator = sha256File(CREATOR_PATH);
    const beforePlayer = sha256File(PLAYER_PATH);
    const revision = readJson<NarrativeGraphCreator>(CREATOR_PATH).revision;

    execFileSync(process.execPath, [GENERATOR], {
      cwd: ROOT,
      stdio: "pipe",
    });
    const midCreator = sha256File(CREATOR_PATH);
    const midPlayer = sha256File(PLAYER_PATH);

    execFileSync(process.execPath, [GENERATOR], {
      cwd: ROOT,
      stdio: "pipe",
    });

    expect(sha256File(CREATOR_PATH)).toBe(beforeCreator);
    expect(sha256File(PLAYER_PATH)).toBe(beforePlayer);
    expect(midCreator).toBe(beforeCreator);
    expect(midPlayer).toBe(beforePlayer);
    expect(readJson<NarrativeGraphCreator>(CREATOR_PATH).revision).toBe(revision);
  });

  it("opaque mapping remains stable across two generations", () => {
    const before = {
      node: opaqueNarrativeNodeId("draft-ch01", "dch01_s001"),
      choice: opaqueNarrativeChoiceEdgeId("draft-ch01", "d1_go_housing"),
      crazy: opaqueNarrativeChoiceEdgeId("draft-ch02", "d2_accept_crazy"),
    };
    const playerBefore = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);

    execFileSync(process.execPath, [GENERATOR], { cwd: ROOT, stdio: "pipe" });
    const playerAfter = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);

    expect(opaqueNarrativeNodeId("draft-ch01", "dch01_s001")).toBe(before.node);
    expect(opaqueNarrativeChoiceEdgeId("draft-ch01", "d1_go_housing")).toBe(before.choice);
    expect(opaqueNarrativeChoiceEdgeId("draft-ch02", "d2_accept_crazy")).toBe(before.crazy);
    expect(playerAfter.entryNodeIds).toEqual(playerBefore.entryNodeIds);
    expect(playerAfter.nodes.map((n) => n.id)).toEqual(playerBefore.nodes.map((n) => n.id));
    expect(playerAfter.edges.map((e) => e.id)).toEqual(playerBefore.edges.map((e) => e.id));
  });

  it("player skeleton recursively contains no creator-only spoilers or semantic ids", () => {
    const player = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);
    const playerText = JSON.stringify(player);
    for (const fragment of FORBIDDEN_PLAYER_FRAGMENTS) {
      expect(playerText.includes(fragment), `forbidden fragment present: ${fragment}`).toBe(false);
    }

    const forbiddenKeys = new Set([
      "title",
      "excerpt",
      "sourceRange",
      "dialogueLines",
      "label",
      "stableSceneId",
      "stableChoiceId",
      "file",
      "startLine",
      "endLine",
    ]);
    const forbiddenVariables = [
      "dignity",
      "impulse",
      "told_breakup_flat",
      "emotion_calibration_correct_count",
      "emotion_calibration_completed_at_version",
    ];

    const keyHits: string[] = [];
    const phraseHits: string[] = [];
    const varHits: string[] = [];
    const semanticIdHits: string[] = [];

    function walk(value: unknown, path: string): void {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const key of Object.keys(value)) {
          if (forbiddenKeys.has(key)) {
            keyHits.push(`${path}.${key}`);
          }
          walk((value as Record<string, unknown>)[key], `${path}.${key}`);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, i) => walk(item, `${path}[${i}]`));
        return;
      }
      if (typeof value === "string") {
        for (const phrase of FORBIDDEN_PLAYER_FRAGMENTS) {
          if (value.includes(phrase)) {
            phraseHits.push(`${path}:${phrase}`);
          }
        }
        for (const name of forbiddenVariables) {
          if (value === name || value.includes(`~ ${name}`) || value.includes(`${name} =`)) {
            varHits.push(`${path}:${name}`);
          }
        }
        if (
          value.includes("#scene:") ||
          value.includes("#choice:") ||
          value.includes("#chapter_transition:")
        ) {
          semanticIdHits.push(`${path}:${value}`);
        }
      }
    }

    walk(player, "$");
    expect(keyHits).toEqual([]);
    expect(phraseHits).toEqual([]);
    expect(varHits).toEqual([]);
    expect(semanticIdHits).toEqual([]);

    expect(player.nodes.every((node) => isOpaqueNarrativeNodeId(node.id))).toBe(true);
    expect(player.edges.every((edge) => isOpaqueNarrativeEdgeId(edge.id))).toBe(true);
    expect(player.edges.every((edge) => !("stableChoiceId" in edge))).toBe(true);
  });
});

describe("NarrativeGraph player projection", () => {
  const player = readJson<NarrativeGraphPlayerSkeleton>(PLAYER_PATH);

  it("hides unvisited future nodes at the data layer", () => {
    const entrySemantic = narrativeSceneNodeId("draft-ch01", "dch01_s001");
    const entryOpaque = opaqueNarrativeNodeId("draft-ch01", "dch01_s001");
    const futureOpaque = opaqueNarrativeNodeId("draft-ch01", "dch01_s050");
    const projected = projectPlayerPath(player, {
      visitedNodeIds: [entrySemantic],
      currentNodeId: entrySemantic,
      seenSceneLabels: { [entrySemantic]: "第一章 你有病吧" },
    });
    const entryNode = projected.nodes.find((n) => n.id === entryOpaque)!;
    const futureNode = projected.nodes.find((n) => n.id === futureOpaque)!;
    expect(entryNode.state).toBe("current");
    expect(entryNode.label).toBe("第一章 你有病吧");
    expect(futureNode.state).toBe("hidden");
    expect(futureNode.label).toBeNull();
    expect(futureNode.excerpt).toBeNull();
    expect(projected.nodes.every((n) => isOpaqueNarrativeNodeId(n.id))).toBe(true);
  });

  it("reveals visited nodes only from supplied observed data", () => {
    const aSemantic = narrativeSceneNodeId("draft-ch01", "dch01_s001");
    const bSemantic = narrativeSceneNodeId("draft-ch01", "dch01_emotion_calibration");
    const a = opaqueNarrativeNodeId("draft-ch01", "dch01_s001");
    const b = opaqueNarrativeNodeId("draft-ch01", "dch01_emotion_calibration");
    const projected = projectPlayerPath(player, {
      visitedNodeIds: [aSemantic, bSemantic],
      currentNodeId: bSemantic,
      seenSceneLabels: { [aSemantic]: "入口" },
      seenSceneExcerpts: { [bSemantic]: "校准台" },
    });
    expect(projected.nodes.find((n) => n.id === a)).toMatchObject({
      state: "visited",
      label: "入口",
      excerpt: null,
    });
    expect(projected.nodes.find((n) => n.id === b)).toMatchObject({
      state: "current",
      label: null,
      excerpt: "校准台",
    });
  });

  it("marks seen-unselected choices available and selected edges highlighted", () => {
    const firm = "d2_catch_firm";
    const soft = "d2_catch_soft";
    const firmOpaque = opaqueNarrativeChoiceEdgeId("draft-ch02", firm);
    const softOpaque = opaqueNarrativeChoiceEdgeId("draft-ch02", soft);
    const projected = projectPlayerPath(player, {
      visitedNodeIds: [narrativeSceneNodeId("draft-ch02", "dch02_s005")],
      currentNodeId: narrativeSceneNodeId("draft-ch02", "dch02_s005"),
      observedChoices: [
        { choiceId: firm, storyId: "draft-ch02", label: "按住手腕：拿出来" },
        { choiceId: soft, storyId: "draft-ch02", label: "声音放轻一点" },
      ],
      selectedChoiceIds: [{ choiceId: firm, storyId: "draft-ch02" }],
    });
    const firmEdge = projected.edges.find((e) => e.id === firmOpaque)!;
    const softEdge = projected.edges.find((e) => e.id === softOpaque)!;
    expect(firmEdge.state).toBe("selected");
    expect(firmEdge.label).toBe("按住手腕：拿出来");
    expect(softEdge.state).toBe("available_unselected");
    expect(softEdge.label).toBe("声音放轻一点");
    const hiddenEdge = projected.edges.find(
      (e) => e.id === opaqueNarrativeChoiceEdgeId("draft-ch02", "dch02_s001_continue"),
    )!;
    expect(hiddenEdge.state).toBe("hidden");
    expect(hiddenEdge.label).toBeNull();
    expect(projected.edges.every((e) => !("stableChoiceId" in e))).toBe(true);
  });

  it("soft-ignores unknown observed ids (documented rule)", () => {
    const entrySemantic = narrativeSceneNodeId("draft-ch01", "dch01_s001");
    const entryOpaque = opaqueNarrativeNodeId("draft-ch01", "dch01_s001");
    const projected = projectPlayerPath(player, {
      visitedNodeIds: [entrySemantic, "draft-ch01#scene:does_not_exist"],
      currentNodeId: "draft-ch99#scene:nope",
      observedChoices: [{ choiceId: "not_a_real_choice", label: "剧透" }],
      selectedChoiceIds: ["also_fake"],
      seenSceneLabels: { "draft-ch01#scene:does_not_exist": "不该出现" },
    });
    expect(projected.nodes.every((n) => n.id !== "draft-ch01#scene:does_not_exist")).toBe(true);
    expect(projected.nodes.find((n) => n.id === entryOpaque)?.state).toBe("visited");
    expect(projected.edges.every((e) => e.label !== "剧透")).toBe(true);
    expect(projected.nodes.filter((n) => n.state === "current")).toHaveLength(0);
  });
});

describe("NarrativeGraph creator/player bundle boundary", () => {
  it("production content entry exports player skeleton but not creator module", async () => {
    const content = await import("@supaluv/content");
    expect(content.getNarrativeGraphPlayerSkeleton().packageId).toBe("draft-2026-07");
    expect(content.narrativeGraphPlayerSkeleton.nodes.length).toBe(93);
    expect("loadNarrativeGraphCreator" in content).toBe(false);

    const playerMod = await import("../../packages/content/src/narrative-graph-player");
    expect(playerMod.getNarrativeGraphPlayerSkeleton().revision).toBe(
      content.getNarrativeGraphPlayerSkeleton().revision,
    );

    const creatorMod = await import("../../packages/content/src/narrative-graph-creator.node");
    const creator = creatorMod.loadNarrativeGraphCreator();
    expect(creator.nodes[0]).toHaveProperty("title");
    expect(creator.nodes[0]).toHaveProperty("sourceRange");
    expect(creator.nodes[0]).toHaveProperty("stableSceneId");
  });

  it("production source modules do not import creator artifact, raw ink, or inkjs/full", () => {
    const productionFiles = [
      "packages/content/src/index.ts",
      "packages/content/src/narrative-graph-player.ts",
      "packages/content/src/chapters/draft-ch01.ts",
      "packages/content/src/chapters/draft-ch02.ts",
      "apps/web/src/story/inkStoryRunner.ts",
      "apps/web/src/story/storyMapAdapter.ts",
      "apps/web/src/App.tsx",
    ];
    const importCreator = /(?:from|import)\s*\(?\s*["'][^"']*narrative-graph-creator/;
    const importCreatorJson = /narrative-graph-creator\.json/;
    for (const rel of productionFiles) {
      const source = readFileSync(resolve(ROOT, rel), "utf8");
      expect(source).not.toMatch(importCreator);
      expect(source).not.toMatch(importCreatorJson);
      expect(source).not.toMatch(/from\s+["']inkjs\/full["']/);
      expect(source).not.toMatch(/draft-ch0[12]\.ink\?raw/);
    }

    const index = readFileSync(resolve(ROOT, "packages/content/src/index.ts"), "utf8");
    expect(index).toMatch(/narrative-graph-player/);
    expect(index).toMatch(/story-catalog\.json/);
    expect(index).not.toMatch(importCreator);
  });

  it("legacy StoryMap APIs still work for prototype fixtures", async () => {
    const { prototypeScenes } = await import("@supaluv/content/prototype-scenes");
    const shared = await import("@supaluv/shared");
    const map = shared.buildStoryMapFromScenes(prototypeScenes);
    expect(map.nodes.length).toBeGreaterThan(0);
    expect(shared.toMermaidFlowchart(map)).toContain("flowchart TD");
  });
});

describe("NarrativeGraph ink knot alignment smoke", () => {
  it("creator stable scene ids match ink knots 1:1 per chapter", () => {
    const creator = readJson<NarrativeGraphCreator>(CREATOR_PATH);
    for (const storyId of ["draft-ch01", "draft-ch02"] as const) {
      const ink = readFileSync(resolve(ROOT, `packages/content/ink/${storyId}.ink`), "utf8");
      const knots = getInkKnotIds(ink).sort();
      const scenes = creator.nodes
        .filter((n) => n.storyId === storyId)
        .map((n) => n.stableSceneId)
        .sort();
      expect(scenes).toEqual(knots);
    }
  });
});

describe("NarrativeGraph production build gate (when dist exists)", () => {
  it("web dist does not embed creator graph or inkjs/full", () => {
    const distAssets = resolve(ROOT, "apps/web/dist/assets");
    if (!existsSync(distAssets)) {
      return;
    }
    const files = readdirSync(distAssets).filter((name) => name.endsWith(".js"));
    for (const name of files) {
      const body = readFileSync(resolve(distAssets, name), "utf8");
      expect(body.includes("inkjs/full")).toBe(false);
      expect(body.includes("sourceRange")).toBe(false);
      expect(body.includes("dialogueLines")).toBe(false);
    }
  });
});
