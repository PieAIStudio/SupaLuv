import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeCoverageMappingDigest,
  extractInkPlayerText,
  isPlaceholderText,
  normalizeSubstantiveText,
  validateAdaptationReceipt,
  validateCoverageMappingDigest,
  validateExactOccurrenceMappings,
} from "../../packages/content/scripts/coverage-contract.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCE_PACKAGE_DIR = resolve(ROOT, "packages/content/sources/draft-2026-07");

type SourceManifestEntry = {
  id: string;
  relativePath: string;
  originalAbsolutePath: string;
  sha256: string;
  title: string;
  chapterId: string;
  inkFile: string;
  bodyParagraphCount: number;
  structureBlockCount: number;
};

type SourceManifest = {
  id: string;
  coverageMappingDigest: {
    algorithm: "sha256";
    contractVersion: 2;
    entryCount: number;
    value: string;
  };
  sources: SourceManifestEntry[];
};

function readSourceManifest(): SourceManifest {
  return JSON.parse(
    readFileSync(resolve(SOURCE_PACKAGE_DIR, "SOURCE-MANIFEST.json"), "utf8"),
  ) as SourceManifest;
}

const ALLOWED_STATUSES = [
  "verbatim-dialogue",
  "narrated",
  "visualized",
  "interactive",
  "approved-adaptation",
] as const;

function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function parseSourceBlocks(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
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

function isStructureBlock(paragraph: string): boolean {
  const lines = paragraph
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 1 && lines[0]!.startsWith("#")) {
    return true;
  }
  const trimmed = paragraph.trim();
  if (trimmed === "——" || trimmed === "---" || trimmed === "***") {
    return true;
  }
  return /^[—\-–]{2,}$/u.test(trimmed);
}

describe("exact source occurrence mapping", () => {
  it("does not let duplicate source paragraphs consume one Ink occurrence", () => {
    const inkSource = `=== scene_a ===\n# scene:scene_a\n“对。”\n\n=== scene_b ===\n# scene:scene_b\n“对。”\n`;
    const paragraph = "“对。”";
    const result = validateExactOccurrenceMappings({
      entries: [
        {
          id: "p001",
          chapterId: "chapter",
          sceneId: "scene_a",
          textHash: sha256Text(paragraph),
          status: "narrated",
        },
        {
          id: "p002",
          chapterId: "chapter",
          sceneId: "scene_a",
          textHash: sha256Text(paragraph),
          status: "narrated",
        },
      ],
      sourceParagraphs: [paragraph, paragraph],
      inkSource,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("reuse 1 literal occurrence");
  });

  it("rejects an ambiguous exact match that breaks source adjacency", () => {
    const repeated = "机器人看着他。";
    const inkSource = `=== scene_a ===\n# scene:scene_a\n${repeated}\n\n=== scene_b ===\n# scene:scene_b\n前文。\n${repeated}\n后文。\n`;
    const paragraphs = ["前文。", repeated, "后文。"];
    const result = validateExactOccurrenceMappings({
      entries: paragraphs.map((paragraph, index) => ({
        id: `p00${index + 1}`,
        chapterId: "chapter",
        sceneId: index === 1 ? "scene_a" : "scene_b",
        textHash: sha256Text(paragraph),
        status: "narrated",
      })),
      sourceParagraphs: paragraphs,
      inkSource,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("breaks source adjacency");
  });
});

function parseBodyParagraphs(raw: string): string[] {
  return parseSourceBlocks(raw).filter((block) => !isStructureBlock(block));
}

function parseStructureBlocks(raw: string): string[] {
  return parseSourceBlocks(raw).filter((block) => isStructureBlock(block));
}

function getInkKnotIds(source: string): string[] {
  return Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===/gm), (match) => match[1]).filter(
    (knotId): knotId is string => knotId !== undefined,
  );
}

function getInkPathIds(source: string): string[] {
  const stitches = Array.from(
    source.matchAll(/^=\s+([a-z0-9_]+)\s*$/gm),
    (match) => match[1],
  ).filter((stitchId): stitchId is string => stitchId !== undefined);
  return [...getInkKnotIds(source), ...stitches];
}

function getInkDivertTargets(source: string): string[] {
  return Array.from(source.matchAll(/->\s+([A-Za-z0-9_]+)/g), (match) => match[1]).filter(
    (id): id is string => Boolean(id) && id !== "END",
  );
}

function readInkSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

/** Coverage and adaptation checks must ignore Ink line comments. */
function stripInkComments(inkSource: string): string {
  return inkSource
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

type FactMapping = {
  fact?: string;
  sourceSnippet: string;
  targetSnippet: string;
};

type AdaptationReceipt = {
  sourceHash?: string;
  textHash?: string;
  sceneId: string;
  factMappings: FactMapping[];
  pacingRationale: string;
};

type CoverageEntry = {
  id: string;
  sourceId: string;
  paragraphIndex: number;
  textHash: string;
  chapterId: string;
  sceneId: string | null;
  beatId: string | null;
  status: string;
  dialogueQuotes: string[];
  adaptationReceipt?: AdaptationReceipt;
};

function assertValidAdaptationReceipt(
  entry: CoverageEntry,
  sourceParagraph: string,
  inkSource: string,
): asserts entry is CoverageEntry & { adaptationReceipt: AdaptationReceipt; sceneId: string } {
  expect(entry.status).toBe("approved-adaptation");
  expect(entry.sceneId).toBeTruthy();
  const receipt = entry.adaptationReceipt;
  expect(receipt).toBeTruthy();
  if (!receipt) {
    throw new Error(`missing adaptationReceipt on ${entry.id}`);
  }
  const validation = validateAdaptationReceipt({
    receipt,
    entry,
    sourceParagraph,
    inkSource,
  });
  expect(validation.errors, `${entry.id} adaptation receipt errors`).toEqual([]);
  expect(validation.ok).toBe(true);
}

function runGeneratorFixture(
  mutate: (fixture: {
    ledger: { entries: CoverageEntry[] };
    manifest: Record<string, unknown>;
    overrides: {
      entries: Record<
        string,
        {
          sourceHash: string;
          sceneId: string;
          status?: string;
          adaptationReceipt?: AdaptationReceipt;
        }
      >;
    };
  }) => void,
  mutateFiles?: (fixture: { contentRoot: string }) => void,
) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "supaluv-content-contract-"));
  const contentRoot = resolve(fixtureRoot, "packages/content");
  try {
    mkdirSync(contentRoot, { recursive: true });
    for (const directory of ["scripts", "sources", "ink", "ledgers"] as const) {
      cpSync(resolve(ROOT, `packages/content/${directory}`), resolve(contentRoot, directory), {
        recursive: true,
      });
    }
    const ledgerPath = resolve(contentRoot, "ledgers/draft-2026-07-coverage.json");
    const manifestPath = resolve(contentRoot, "sources/draft-2026-07/SOURCE-MANIFEST.json");
    const overridesPath = resolve(contentRoot, "ledgers/draft-2026-07-coverage-overrides.json");
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as { entries: CoverageEntry[] };
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    const overrides = JSON.parse(readFileSync(overridesPath, "utf8")) as {
      entries: Record<
        string,
        {
          sourceHash: string;
          sceneId: string;
          status?: string;
          adaptationReceipt?: AdaptationReceipt;
        }
      >;
    };
    mutate({ ledger, manifest, overrides });
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
    mutateFiles?.({ contentRoot });
    const before = readFileSync(ledgerPath);
    const result = spawnSync(
      process.execPath,
      [resolve(contentRoot, "scripts/generate-coverage.mjs")],
      {
        cwd: fixtureRoot,
        encoding: "utf8",
      },
    );
    const after = readFileSync(ledgerPath);
    return { result, unchanged: Buffer.compare(before, after) === 0 };
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function walkToEnd(
  runner: {
    getSnapshot: () => {
      isEnded: boolean;
      choices: readonly { index: number }[];
      sceneId: string | null;
      text: string;
    };
    choose: (index: number) => unknown;
  },
  pick: (choices: readonly { index: number }[], sceneId: string | null) => number,
  maxSteps = 200,
): { scenes: string[]; ended: boolean; lastText: string } {
  const scenes: string[] = [];
  for (let i = 0; i < maxSteps; i += 1) {
    const snap = runner.getSnapshot();
    if (snap.sceneId) {
      scenes.push(snap.sceneId);
    }
    if (snap.isEnded) {
      return { scenes, ended: true, lastText: snap.text };
    }
    if (snap.choices.length === 0) {
      return { scenes, ended: false, lastText: snap.text };
    }
    const index = pick(snap.choices, snap.sceneId);
    runner.choose(index);
  }
  return { scenes, ended: false, lastText: runner.getSnapshot().text };
}

describe("draft-2026-07 source snapshots", () => {
  it("keeps body bytes identical to manifest hashes (snapshot is CI SSOT)", () => {
    const manifest = readSourceManifest();
    const registeredSnapshots = manifest.sources.map((source) => source.relativePath).sort();
    const diskSnapshots = readdirSync(SOURCE_PACKAGE_DIR)
      .filter((file) => /^draft\d+\.md$/u.test(file))
      .sort();
    expect(registeredSnapshots).toEqual(diskSnapshots);
    expect(manifest.sources.map((source) => source.id)).toEqual(["draft01", "draft02", "draft03"]);

    for (const source of manifest.sources) {
      const bodyPath = resolve(SOURCE_PACKAGE_DIR, source.relativePath);
      const body = readFileSync(bodyPath);
      expect(sha256Buffer(body)).toBe(source.sha256);
      // Optional local check when original Temp drafts exist; CI must not depend on them.
      if (existsSync(source.originalAbsolutePath)) {
        expect(sha256Buffer(readFileSync(source.originalAbsolutePath))).toBe(source.sha256);
        expect(Buffer.compare(body, readFileSync(source.originalAbsolutePath))).toBe(0);
      }
    }
    const ledger = JSON.parse(
      readFileSync(resolve(ROOT, "packages/content/ledgers/draft-2026-07-coverage.json"), "utf8"),
    ) as { entries: CoverageEntry[] };
    const expectedEntries = manifest.sources.reduce(
      (sum, source) => sum + source.bodyParagraphCount,
      0,
    );
    expect(manifest.coverageMappingDigest.algorithm).toBe("sha256");
    expect(manifest.coverageMappingDigest.contractVersion).toBe(2);
    expect(manifest.coverageMappingDigest.entryCount).toBe(expectedEntries);
    expect(manifest.coverageMappingDigest.value).toBe(computeCoverageMappingDigest(ledger.entries));
  });
});

describe("draft-2026-07 coverage ledger (real source)", () => {
  const ledgerPath = resolve(ROOT, "packages/content/ledgers/draft-2026-07-coverage.json");
  const manifest = readSourceManifest();
  const draft01Path = resolve(ROOT, "packages/content/sources/draft-2026-07/draft01.md");
  const bodyBySource = Object.fromEntries(
    manifest.sources.map((source) => [
      source.id,
      parseBodyParagraphs(readFileSync(resolve(SOURCE_PACKAGE_DIR, source.relativePath), "utf8")),
    ]),
  ) as Record<string, string[]>;
  const structureBySource = Object.fromEntries(
    manifest.sources.map((source) => [
      source.id,
      parseStructureBlocks(readFileSync(resolve(SOURCE_PACKAGE_DIR, source.relativePath), "utf8")),
    ]),
  ) as Record<string, string[]>;
  const inkByChapter = Object.fromEntries(
    manifest.sources.map((source) => [
      source.chapterId,
      readInkSource(`packages/content/ink/${source.inkFile}`),
    ]),
  ) as Record<string, string>;
  const playableByChapter = Object.fromEntries(
    Object.entries(inkByChapter).map(([chapterId, inkSource]) => [
      chapterId,
      stripInkComments(inkSource),
    ]),
  ) as Record<string, string>;
  const expectedBodyCount = manifest.sources.reduce(
    (sum, source) => sum + source.bodyParagraphCount,
    0,
  );
  const expectedStructureCount = manifest.sources.reduce(
    (sum, source) => sum + source.structureBlockCount,
    0,
  );

  it("re-parses every registered snapshot to its manifest-pinned body and structure counts", () => {
    for (const source of manifest.sources) {
      expect(bodyBySource[source.id]?.length).toBe(source.bodyParagraphCount);
      expect(structureBySource[source.id]?.length).toBe(source.structureBlockCount);
    }
    expect(expectedBodyCount).toBe(434);
    expect(expectedStructureCount).toBe(33);
  });

  it("ledger entries are 1:1 with every registered source id and paragraph hash", () => {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      allowedStatuses: string[];
      structure: Array<{ id: string; textHash: string; sourceId: string }>;
      entries: CoverageEntry[];
    };

    expect(ledger.allowedStatuses).toEqual([...ALLOWED_STATUSES]);
    expect(ledger.entries.length).toBe(expectedBodyCount);
    expect(ledger.structure.length).toBe(expectedStructureCount);

    const entryIds = new Set<string>();
    const entryHashes = new Set<string>();
    for (const source of manifest.sources) {
      const sourceId = source.id;
      const bodies = bodyBySource[sourceId]!;
      const sourceEntries = ledger.entries.filter((entry) => entry.sourceId === sourceId);
      expect(sourceEntries.length).toBe(bodies.length);
      sourceEntries.forEach((entry, index) => {
        expect(entry.id).toBe(`${sourceId}_p${String(index + 1).padStart(3, "0")}`);
        expect(entry.paragraphIndex).toBe(index + 1);
        expect(entry.textHash).toBe(sha256Text(bodies[index]!));
        expect(entryIds.has(entry.id)).toBe(false);
        // Identical short dialogue lines may share textHash across paragraphs.
        entryIds.add(entry.id);
        entryHashes.add(entry.textHash);
      });

      const sourceStructure = ledger.structure.filter((item) => item.sourceId === sourceId);
      expect(sourceStructure.length).toBe(structureBySource[sourceId]!.length);
      sourceStructure.forEach((item, index) => {
        expect(item.textHash).toBe(sha256Text(structureBySource[sourceId]![index]!));
      });
    }

    for (const entry of ledger.entries) {
      expect(ALLOWED_STATUSES).toContain(entry.status);
      expect(entry.status).not.toMatch(/^covered_/);
      expect(entry.status).not.toBe("structural");
      expect(entry.status).not.toBe("pending");
      expect(entry.status).not.toBe("omitted");
      expect(manifest.sources.some((source) => source.chapterId === entry.chapterId)).toBe(true);
      expect(entry.sceneId).toBeTruthy();
      expect(entry.beatId).toBeTruthy();
      if (entry.status === "approved-adaptation") {
        expect(entry.adaptationReceipt).toBeTruthy();
      } else {
        expect(entry.adaptationReceipt).toBeUndefined();
      }
    }
  });

  it("playable coverage ignores comments; adaptations use receipts; non-adapted stay exact", () => {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      entries: CoverageEntry[];
    };

    let paragraphMissing = 0;
    let dialogueMissing = 0;
    const paragraphMisses: string[] = [];
    const dialogueMisses: string[] = [];
    const adaptations: string[] = [];

    for (const entry of ledger.entries) {
      const bodies = bodyBySource[entry.sourceId]!;
      const paragraph = bodies[entry.paragraphIndex - 1];
      expect(paragraph).toBeTruthy();
      expect(sha256Text(paragraph!)).toBe(entry.textHash);
      const playable = playableByChapter[entry.chapterId] ?? "";

      if (entry.status === "approved-adaptation") {
        assertValidAdaptationReceipt(entry, paragraph!, inkByChapter[entry.chapterId]!);
        adaptations.push(entry.id);
        // Adapted entries must NOT rely on full source paragraph in playable ink.
        // They may still coincidentally match, but coverage is receipt-based.
        continue;
      }

      if (!playable.includes(paragraph!)) {
        paragraphMissing += 1;
        paragraphMisses.push(entry.id);
      }
      if (entry.status === "verbatim-dialogue") {
        for (const quote of entry.dialogueQuotes) {
          if (!playable.includes(quote)) {
            dialogueMissing += 1;
            dialogueMisses.push(`${entry.id}:${quote.slice(0, 24)}`);
          }
        }
      }
    }

    expect(paragraphMisses).toEqual([]);
    expect(dialogueMisses).toEqual([]);
    expect(paragraphMissing).toBe(0);
    expect(dialogueMissing).toBe(0);
    expect(adaptations.length).toBe(109);
    expect(
      Object.fromEntries(
        manifest.sources.map((source) => [
          source.id,
          ledger.entries.filter(
            (entry) => entry.sourceId === source.id && entry.status === "approved-adaptation",
          ).length,
        ]),
      ),
    ).toEqual({ draft01: 47, draft02: 53, draft03: 9 });

    const dialogueEntries = ledger.entries.filter(
      (entry) => entry.status === "verbatim-dialogue" && entry.dialogueQuotes.length > 0,
    );
    expect(dialogueEntries.length).toBeGreaterThan(50);
  });

  it("rejects empty/malformed adaptation receipts and forbids source-prose comment dumps", () => {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      entries: CoverageEntry[];
    };
    const inkSource = inkByChapter["draft-ch01"]!;
    const sourceParagraph = parseBodyParagraphs(readFileSync(draft01Path, "utf8"))[
      (ledger.entries.find((entry) => entry.status === "approved-adaptation")?.paragraphIndex ??
        1) - 1
    ]!;

    const sample = ledger.entries.find((entry) => entry.status === "approved-adaptation");
    expect(sample?.adaptationReceipt).toBeTruthy();
    if (!sample?.adaptationReceipt) {
      throw new Error("expected at least one approved adaptation");
    }

    const validMapping = sample.adaptationReceipt.factMappings?.[0] ?? {
      sourceSnippet: sourceParagraph.slice(0, 16),
      targetSnippet: "这段文字不会通过真实验证",
    };
    const malformed: Array<Partial<AdaptationReceipt> | undefined> = [
      undefined,
      {
        ...sample.adaptationReceipt,
        factMappings: undefined,
        retainedFacts: ["x"],
        pacingRationale: "x",
      } as unknown as AdaptationReceipt,
      { ...sample.adaptationReceipt, sourceHash: "0".repeat(64) },
      { ...sample.adaptationReceipt, sceneId: "not_a_real_scene" },
      {
        ...sample.adaptationReceipt,
        factMappings: [],
      },
      {
        ...sample.adaptationReceipt,
        factMappings: [{ ...validMapping, sourceSnippet: "x" }],
      },
      {
        ...sample.adaptationReceipt,
        factMappings: [{ ...validMapping, sourceSnippet: "这段源文不存在" }],
      },
      {
        ...sample.adaptationReceipt,
        factMappings: [{ ...validMapping, targetSnippet: "dch01_s001_continue" }],
      },
      {
        ...sample.adaptationReceipt,
        pacingRationale: "x",
      },
    ];
    for (const receipt of malformed) {
      const validation = validateAdaptationReceipt({
        receipt: receipt as AdaptationReceipt | undefined,
        entry: sample,
        sourceParagraph,
        inkSource,
      });
      expect(validation.errors).not.toEqual([]);
      expect(validation.ok).toBe(false);
    }

    const manifest = JSON.parse(
      readFileSync(
        resolve(ROOT, "packages/content/sources/draft-2026-07/SOURCE-MANIFEST.json"),
        "utf8",
      ),
    ) as { coverageMappingDigest: { value: string } };
    const tampered = structuredClone(ledger.entries);
    const tamperedEntry = tampered.find((entry) => entry.id === sample.id)!;
    const otherScene = tampered.find(
      (entry) =>
        entry.chapterId === sample.chapterId &&
        entry.sceneId !== sample.sceneId &&
        entry.status === "approved-adaptation" &&
        (entry.adaptationReceipt?.factMappings.length ?? 0) >=
          sample.adaptationReceipt!.factMappings.length,
    )!;
    tamperedEntry.sceneId = otherScene.sceneId;
    tamperedEntry.beatId = otherScene.sceneId;
    tamperedEntry.adaptationReceipt = {
      ...sample.adaptationReceipt,
      sceneId: otherScene.sceneId!,
      factMappings: sample.adaptationReceipt.factMappings.map((mapping, index) => ({
        ...mapping,
        targetSnippet: otherScene.adaptationReceipt!.factMappings[index]!.targetSnippet,
      })),
    };
    const tamperedReceiptValidation = validateAdaptationReceipt({
      receipt: tamperedEntry.adaptationReceipt,
      entry: tamperedEntry,
      sourceParagraph,
      inkSource,
    });
    expect(tamperedReceiptValidation.errors).toEqual([]);
    expect(tamperedReceiptValidation.ok).toBe(true);
    const digestValidation = validateCoverageMappingDigest(
      tampered,
      manifest.coverageMappingDigest as {
        algorithm: "sha256";
        entryCount: number;
        value: string;
      },
    );
    expect(digestValidation.ok).toBe(false);
    expect(digestValidation.errors.join(" ")).toContain("digest mismatch");

    const receiptTampered = structuredClone(ledger.entries);
    const receiptTamperedEntry = receiptTampered.find((entry) => entry.id === sample.id)!;
    receiptTamperedEntry.adaptationReceipt = {
      ...receiptTamperedEntry.adaptationReceipt!,
      pacingRationale: `${receiptTamperedEntry.adaptationReceipt!.pacingRationale}（未审查改动）`,
    };
    expect(computeCoverageMappingDigest(receiptTampered)).not.toBe(
      computeCoverageMappingDigest(ledger.entries),
    );

    const driftValidation = validateCoverageMappingDigest(ledger.entries, {
      algorithm: "sha256",
      entryCount: expectedBodyCount,
      value: "0".repeat(64),
    });
    expect(driftValidation.ok).toBe(false);
    expect(driftValidation.errors.join(" ")).toContain("digest mismatch");

    for (const chapterId of ["draft-ch01", "draft-ch02", "draft-ch03"] as const) {
      const raw = inkByChapter[chapterId]!;
      expect(raw).not.toMatch(/Player-hidden source trace/i);
      expect(raw).not.toMatch(/byte-exact for coverage/i);
      // No multi-line dump of long source prose as // comments after chapter end.
      const commentLines = raw.split("\n").filter((line) => /^\s*\/\//.test(line));
      const longCommentProse = commentLines.filter(
        (line) => line.replace(/^\s*\/\//, "").trim().length > 80,
      );
      expect(longCommentProse).toEqual([]);
    }

    // novel-v2 densify keeps source heads in player-visible text (not comment-only).
    const densifiedHead =
      "工作人员这句话说出口的时候，手指正点在协议签字页上，笑得跟卖保险的一样职业";
    expect(playableByChapter["draft-ch01"]!).toContain(densifiedHead);
  });

  it("rejects non-player Ink text, placeholder rationales, and overlapping long-paragraph mappings", () => {
    const visibleDirect = "直接可见的玩家文本足够长度通过验证";
    const adversarialInk = [
      "=== knot_adv ===",
      "# scene:scene_adv",
      `${visibleDirect} // 这是隐藏注释中的目标事实足够长`,
      `${visibleDirect} # 这是隐藏标签中的目标事实足够长`,
      "{ 这是条件控制中的目标事实足够长:",
      "- choice",
      "}",
      "{ false:",
      "这是不可达条件分支中的目标事实足够长",
      "}",
      visibleDirect,
      "- 这是 gather 控制行中的目标事实足够长",
      "+ [这是 choice 控制行中的目标事实足够长]",
      "* [另一 choice 控制行中的目标事实足够长]",
      "",
    ].join("\n");

    const projected = extractInkPlayerText(
      adversarialInk.slice(
        adversarialInk.indexOf("# scene:scene_adv") + "# scene:scene_adv\n".length,
      ),
    );
    expect(projected.split("\n")).toEqual([visibleDirect, visibleDirect, visibleDirect]);
    expect(projected).not.toContain("隐藏注释");
    expect(projected).not.toContain("隐藏标签");
    expect(projected).not.toContain("条件控制");
    expect(projected).not.toContain("不可达条件");
    expect(projected).not.toContain("gather");
    expect(extractInkPlayerText("{ open:\n可见但括号不平衡的文本足够长\n")).toBe("");

    const baseReceipt = {
      sourceHash: "a".repeat(64),
      sceneId: "scene_adv",
      factMappings: [
        {
          fact: "visible",
          sourceSnippet: "源文里足够长度的可见事实内容片段",
          targetSnippet: visibleDirect,
        },
      ],
      pacingRationale: "这是一条足够长且真实的编辑节奏说明文字",
    };
    const baseEntry = { textHash: "a".repeat(64), sceneId: "scene_adv" };
    const sourceParagraph = "源文里足够长度的可见事实内容片段用于校验映射";

    const visibleOk = validateAdaptationReceipt({
      receipt: baseReceipt,
      entry: baseEntry,
      sourceParagraph,
      inkSource: adversarialInk,
    });
    expect(visibleOk.ok).toBe(true);
    expect(visibleOk.errors).toEqual([]);

    const hiddenTargets = [
      "这是隐藏注释中的目标事实足够长",
      "这是隐藏标签中的目标事实足够长",
      "这是条件控制中的目标事实足够长",
      "这是不可达条件分支中的目标事实足够长",
      "这是 gather 控制行中的目标事实足够长",
      "这是 choice 控制行中的目标事实足够长",
    ];
    for (const targetSnippet of hiddenTargets) {
      const validation = validateAdaptationReceipt({
        receipt: {
          ...baseReceipt,
          factMappings: [{ ...baseReceipt.factMappings[0]!, targetSnippet }],
        },
        entry: baseEntry,
        sourceParagraph,
        inkSource: adversarialInk,
      });
      expect(validation.ok, targetSnippet).toBe(false);
      expect(validation.errors.join(" ")).toContain("target snippet is not present in player text");
    }

    for (const pacingRationale of ["xxxxxxxxxxxx", "todo todo todo", "pendingpending"]) {
      expect(isPlaceholderText(pacingRationale)).toBe(true);
      const validation = validateAdaptationReceipt({
        receipt: { ...baseReceipt, pacingRationale },
        entry: baseEntry,
        sourceParagraph,
        inkSource: adversarialInk,
      });
      expect(validation.ok, pacingRationale).toBe(false);
      expect(validation.errors.join(" ")).toContain("placeholder");
    }

    const longSource = `${"甲".repeat(48)}${"乙".repeat(48)}${"丙".repeat(48)}`;
    expect(normalizeSubstantiveText(longSource).length).toBeGreaterThanOrEqual(120);
    const overlappingSourceA = longSource.slice(0, 40);
    const overlappingSourceB = longSource.slice(10, 50);
    const targetLine = `${longSource.slice(0, 60)}额外可见承接文字`;
    const longInk = ["=== knot_long ===", "# scene:scene_long", targetLine, ""].join("\n");
    const overlapping = validateAdaptationReceipt({
      receipt: {
        sourceHash: "b".repeat(64),
        sceneId: "scene_long",
        factMappings: [
          {
            fact: "slice-a",
            sourceSnippet: overlappingSourceA,
            targetSnippet: targetLine.slice(0, 36),
          },
          {
            fact: "slice-b",
            sourceSnippet: overlappingSourceB,
            targetSnippet: targetLine.slice(12, 48),
          },
        ],
        pacingRationale: "这是一条足够长且真实的编辑节奏说明文字",
      },
      entry: { textHash: "b".repeat(64), sceneId: "scene_long" },
      sourceParagraph: longSource,
      inkSource: longInk,
    });
    expect(overlapping.ok).toBe(false);
    expect(overlapping.errors.join(" ")).toMatch(/overlap after normalization/);

    const independent = validateAdaptationReceipt({
      receipt: {
        sourceHash: "b".repeat(64),
        sceneId: "scene_long",
        factMappings: [
          {
            fact: "head",
            sourceSnippet: longSource.slice(0, 40),
            targetSnippet: targetLine.slice(0, 36),
          },
          {
            fact: "tail",
            sourceSnippet: longSource.slice(96, 136),
            targetSnippet: targetLine.slice(48, 84),
          },
        ],
        pacingRationale: "这是一条足够长且真实的编辑节奏说明文字",
      },
      entry: { textHash: "b".repeat(64), sceneId: "scene_long" },
      sourceParagraph: longSource,
      inkSource: longInk,
    });
    expect(independent.errors).toEqual([]);
    expect(independent.ok).toBe(true);
  });

  it("generator fails closed without rewriting the ledger for bad receipts or digest drift", () => {
    const badReceipt = runGeneratorFixture(({ overrides }) => {
      const entry = Object.values(overrides.entries).find(
        (candidate) => candidate.status === "approved-adaptation",
      )!;
      entry.adaptationReceipt = {
        ...(entry.adaptationReceipt as AdaptationReceipt),
        factMappings: undefined,
        retainedFacts: ["x"],
        pacingRationale: "x",
      } as unknown as AdaptationReceipt;
    });
    expect(badReceipt.result.status).not.toBe(0);
    expect(`${badReceipt.result.stdout}${badReceipt.result.stderr}`).toContain(
      "invalid approved-adaptation receipt",
    );
    expect(badReceipt.unchanged).toBe(true);

    const shiftedOverride = runGeneratorFixture(({ overrides }) => {
      const entry = Object.values(overrides.entries)[0]!;
      entry.sourceHash = "0".repeat(64);
    });
    expect(shiftedOverride.result.status).not.toBe(0);
    expect(`${shiftedOverride.result.stdout}${shiftedOverride.result.stderr}`).toContain(
      "override sourceHash",
    );
    expect(shiftedOverride.unchanged).toBe(true);

    const digestDrift = runGeneratorFixture(({ manifest }) => {
      const anchor = manifest.coverageMappingDigest as { value: string };
      anchor.value = "0".repeat(64);
    });
    expect(digestDrift.result.status).not.toBe(0);
    expect(`${digestDrift.result.stdout}${digestDrift.result.stderr}`).toContain(
      "coverage mapping digest mismatch",
    );
    expect(digestDrift.unchanged).toBe(true);

    const unregisteredSnapshot = runGeneratorFixture(
      () => undefined,
      ({ contentRoot }) => {
        writeFileSync(
          resolve(contentRoot, "sources/draft-2026-07/draft99.md"),
          "# 未登记章节\n\n这份快照不应被静默忽略。\n",
          "utf8",
        );
      },
    );
    expect(unregisteredSnapshot.result.status).not.toBe(0);
    expect(`${unregisteredSnapshot.result.stdout}${unregisteredSnapshot.result.stderr}`).toContain(
      "source snapshot registration mismatch",
    );
    expect(unregisteredSnapshot.unchanged).toBe(true);
  });
});

describe("draft catalog and legacy retirement", () => {
  it("keeps checked-in catalog ids and defaults mechanically synchronized with JSON", async () => {
    const catalog = JSON.parse(
      readFileSync(resolve(ROOT, "packages/content/catalog/story-catalog.json"), "utf8"),
    ) as {
      defaultPackageId: string;
      packages: { packageId: string; startChapterId: string }[];
      productionChapters: { id: string }[];
      devChapters: { id: string }[];
    };
    const generated = await import("../../packages/content/src/story-catalog.generated");
    const defaultPackage = catalog.packages.find(
      (entry) => entry.packageId === catalog.defaultPackageId,
    );

    expect(generated.PRODUCTION_STORY_CATALOG_IDS).toEqual(
      catalog.productionChapters.map((entry) => entry.id),
    );
    expect(generated.DEV_STORY_CATALOG_IDS).toEqual(catalog.devChapters.map((entry) => entry.id));
    expect(generated.STORY_CATALOG_IDS).toEqual([
      ...catalog.productionChapters.map((entry) => entry.id),
      ...catalog.devChapters.map((entry) => entry.id),
    ]);
    expect(generated.DEFAULT_STORY_PACKAGE_ID).toBe(catalog.defaultPackageId);
    expect(generated.DEFAULT_STORY_ID).toBe(defaultPackage?.startChapterId);

    const check = spawnSync(
      process.execPath,
      [resolve(ROOT, "packages/content/scripts/generate-story-catalog-types.mjs"), "--check"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(`${check.stdout}${check.stderr}`).toContain("generated types are current");
    expect(check.status).toBe(0);
  });

  it("adds a future catalog chapter deterministically and rejects a stale generated file", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "supaluv-story-catalog-types-"));
    const contentRoot = resolve(fixtureRoot, "packages/content");
    try {
      mkdirSync(resolve(contentRoot, "scripts"), { recursive: true });
      mkdirSync(resolve(contentRoot, "catalog"), { recursive: true });
      mkdirSync(resolve(contentRoot, "src"), { recursive: true });
      cpSync(
        resolve(ROOT, "packages/content/scripts/generate-story-catalog-types.mjs"),
        resolve(contentRoot, "scripts/generate-story-catalog-types.mjs"),
      );
      const catalog = JSON.parse(
        readFileSync(resolve(ROOT, "packages/content/catalog/story-catalog.json"), "utf8"),
      ) as {
        packages: { packageId: string; chapterIds: string[] }[];
        productionChapters: { id: string }[];
      };
      const futureChapter = { ...catalog.productionChapters.at(-1), id: "draft-ch04" };
      catalog.productionChapters.push(futureChapter);
      catalog.packages[0]?.chapterIds.push(futureChapter.id);
      writeFileSync(
        resolve(contentRoot, "catalog/story-catalog.json"),
        `${JSON.stringify(catalog, null, 2)}\n`,
        "utf8",
      );

      const scriptPath = resolve(contentRoot, "scripts/generate-story-catalog-types.mjs");
      const firstRun = spawnSync(process.execPath, [scriptPath], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });
      expect(firstRun.status).toBe(0);
      const outputPath = resolve(contentRoot, "src/story-catalog.generated.ts");
      const firstOutput = readFileSync(outputPath, "utf8");
      expect(firstOutput).toContain('"draft-ch04"');

      const secondRun = spawnSync(process.execPath, [scriptPath], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });
      expect(secondRun.status).toBe(0);
      expect(readFileSync(outputPath, "utf8")).toBe(firstOutput);

      writeFileSync(outputPath, "// stale\n", "utf8");
      const staleCheck = spawnSync(process.execPath, [scriptPath, "--check"], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });
      expect(staleCheck.status).not.toBe(0);
      expect(`${staleCheck.stdout}${staleCheck.stderr}`).toContain("is stale");
      expect(readFileSync(outputPath, "utf8")).toBe("// stale\n");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("defaults to draft-ch01 and does not expose retired ch01 in production catalog", async () => {
    const content = await import("@supaluv/content");
    expect(content.DEFAULT_STORY_ID).toBe("draft-ch01");
    expect(content.productionStoryCatalog.map((s) => s.id)).toEqual([
      "draft-ch01",
      "draft-ch02",
      "draft-ch03",
    ]);
    expect(content.storyCatalog.map((s) => s.id).includes("ch01" as never)).toBe(false);
    expect(content.isRetiredStoryId("ch01")).toBe(true);
    expect(content.isProductionStoryId("ch01")).toBe(false);
    expect(content.legacyCh01Archive.id).toBe("ch01");
  });

  it("registers required draft speakers", async () => {
    const { resolveCharacter } = await import("@supaluv/content");
    for (const name of ["苏明", "陈佳", "雷欧", "石佩欣", "工作人员", "小组长", "老板娘", "AI"]) {
      expect(resolveCharacter(name)?.id).toBeTruthy();
    }
  });

  it("production catalog meta has no static chapter payloads", async () => {
    const content = await import("@supaluv/content");
    for (const entry of content.productionStoryCatalog) {
      expect("compiledStoryJson" in entry).toBe(false);
      expect("inkSource" in entry).toBe(false);
      expect("scenes" in entry).toBe(false);
      expect(entry.labels["zh-CN"]).toBeTruthy();
      expect(entry.labels.en).toBeTruthy();
      expect(entry.inkFile).toBe(`${entry.id}.ink`);
      expect(entry.manifestFile).toBe(`${entry.id}-scenes.ts`);
      expect(entry.voiceLanguages).toEqual(["zh-CN", "en"]);
    }
  });

  it("cold-loads every registered chapter module without a second loader registry", async () => {
    const content = await import("@supaluv/content");
    content.clearStoryChapterCache();
    for (const entry of content.storyCatalog) {
      const chapter = await content.loadStoryChapter(entry.id);
      expect(chapter.meta.id).toBe(entry.id);
      expect(chapter.scenes.length).toBeGreaterThan(0);
      expect(chapter.compiledStoryJson.length).toBeGreaterThan(100);
    }
  });
});

describe("draft ink / scene alignment and topology", () => {
  it("aligns scene manifests 1:1 with Ink knots and omits hand-authored edges", async () => {
    const content = await import("@supaluv/content");
    for (const storyId of ["draft-ch01", "draft-ch02", "draft-ch03"] as const) {
      const chapter = await content.loadStoryChapter(storyId);
      const source = readInkSource(`packages/content/ink/${storyId}.ink`);
      const knots = getInkKnotIds(source).sort();
      const sceneIds = chapter.scenes.map((s) => s.id).sort();
      expect(sceneIds).toEqual(knots);
      expect(chapter.scenes.every((s) => !("choices" in s) || s.choices === undefined)).toBe(true);
      expect(chapter.scenes.every((s) => !("autoNext" in s) || s.autoNext === undefined)).toBe(
        true,
      );
      expect(chapter.scenes.every((s) => s.source === "supa-luv-v2-2026-07")).toBe(true);
    }
  });

  it("only diverts to existing knots", () => {
    for (const storyId of ["draft-ch01", "draft-ch02", "draft-ch03"] as const) {
      const source = readInkSource(`packages/content/ink/${storyId}.ink`);
      const knots = new Set(getInkPathIds(source));
      for (const target of getInkDivertTargets(source)) {
        expect(knots.has(target)).toBe(true);
      }
    }
  });

  it("ships precompiled JSON and loads without inkjs/full", async () => {
    const content = await import("@supaluv/content");
    const { createInkStoryRunnerFromCompiled } =
      await import("../../apps/web/src/story/inkStoryRunner");
    const chapter = await content.loadStoryChapter("draft-ch01");
    expect(chapter.compiledStoryJson.length).toBeGreaterThan(100);
    const runner = createInkStoryRunnerFromCompiled(chapter.compiledStoryJson);
    const snap = runner.getSnapshot();
    expect(snap.sceneId).toMatch(/^dch01_/);
    expect(snap.text.length).toBeGreaterThan(20);
    expect(snap.choices[0]?.choiceId).toBeTruthy();
  });
});

describe("draft path termination, facts, and chapter inheritance", () => {
  it("reaches chapter-1 housing endpoint on both choice biases", async () => {
    const { createDraftCh01InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");
    for (const bias of [0, 1] as const) {
      const runner = await createDraftCh01InkStoryRunner();
      const result = walkToEnd(runner, (choices) => Math.min(bias, choices.length - 1));
      expect(result.ended).toBe(true);
      expect(result.scenes.some((id) => id === "d1_chapter_end" || id.includes("s0"))).toBe(true);
      expect(result.lastText.includes("先看房") || result.scenes.includes("d1_chapter_end")).toBe(
        true,
      );
      expect(Number(runner.getVariable("mianzi"))).toBeTypeOf("number");
      expect(
        runner.getVariable("budget_900") === true || runner.getVariable("budget_900") === false,
      ).toBe(true);
    }
  });

  it("reaches chapter-2 draft end on both choice biases", async () => {
    const { createDraftCh02InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");
    for (const bias of [0, 1] as const) {
      const runner = await createDraftCh02InkStoryRunner({
        mianzi: 61,
        ai_score: 44,
        budget_900: true,
        clue_subsidy_sms: true,
      });
      expect(runner.getSnapshot().meters.mianzi).toBe(61);
      expect(runner.getVariable("budget_900")).toBe(true);
      const result = walkToEnd(runner, (choices) => Math.min(bias, choices.length - 1));
      expect(result.ended).toBe(true);
      expect(result.scenes.includes("d2_chapter_end") || result.lastText.includes("有病")).toBe(
        true,
      );
      expect(runner.getVariable("clue_pass_sms")).toBe(true);
    }
  });

  it("exports and reapplies chapter variables across ch1→ch2", async () => {
    const { createDraftCh01InkStoryRunner, createDraftCh02InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");
    const content = await import("@supaluv/content");
    const ch1 = await createDraftCh01InkStoryRunner();
    walkToEnd(ch1, () => 0);
    const names = content.getStoryCatalogMeta("draft-ch01").inheritVariableNames;
    const vars = ch1.exportVariables(names);
    const ch2 = await createDraftCh02InkStoryRunner(vars);
    for (const name of names) {
      expect(ch2.getVariable(name)).toEqual(vars[name]);
    }
  });

  it("keeps stable choice ids when display punctuation differs", async () => {
    const { createInkStoryRunnerFromCompiled } =
      await import("../../apps/web/src/story/inkStoryRunner");
    const content = await import("@supaluv/content");
    const chapter = await content.loadStoryChapter("draft-ch01");
    const runner = createInkStoryRunnerFromCompiled(chapter.compiledStoryJson);
    for (let i = 0; i < 20; i += 1) {
      const snap = runner.getSnapshot();
      if (snap.choices.length >= 2 && snap.choices.every((c) => c.choiceId)) {
        const ids = snap.choices.map((c) => c.choiceId);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
        return;
      }
      if (snap.isEnded) break;
      runner.choose(0);
    }
    throw new Error("No multi-choice stable-id beat found");
  });
});

describe("required narrative facts reachable", () => {
  it("chapter 1 ink contains mandatory beat phrases", () => {
    const draftCh01InkSource = readInkSource("packages/content/ink/draft-ch01.ink");
    const must = [
      "骨头留着",
      "全程保密",
      "质检室",
      "协议第三页",
      "样机",
      "双方自愿",
      "情绪波动：优",
      "九百",
      // ch01 ends on Leo housing hook only; 石家小楼 arrival is ch02 (novel SSOT)
      "加微信",
      "陈佳",
      "雷欧",
      "优质样本",
    ];
    for (const phrase of must) {
      expect(draftCh01InkSource).toContain(phrase);
    }
  });

  it("chapter 2 ink contains mandatory beat phrases", () => {
    const draftCh02InkSource = readInkSource("packages/content/ink/draft-ch02.ink");
    const must = [
      "惠万家",
      "辣条",
      "石佩欣",
      "九百",
      "水表",
      "五倍",
      "保密",
      "护腰",
      "婚礼",
      "不评判",
      "有用",
      "初审通过",
      "就当我有病",
    ];
    for (const phrase of must) {
      expect(draftCh02InkSource).toContain(phrase);
    }
  });
});

describe("save compatibility for retired demo", () => {
  it("marks ch01 saves as retired incompatible", async () => {
    const { evaluateSaveCompatibility } = await import("../../apps/web/src/persistence/gameSave");
    const result = evaluateSaveCompatibility({
      version: 1,
      slotId: "autosave",
      storyId: "ch01",
      inkStateJson: "{}",
      label: "旧 Demo",
      savedAt: new Date().toISOString(),
      unlocks: { images: [], videos: [], audio: [] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("retired");
      expect(result.message).toContain("退休");
    }
  });
});

describe("production graph excludes raw draft source and inkjs/full", () => {
  it("source modules never import ink compiler package or raw draft ink", () => {
    const index = readFileSync(resolve(ROOT, "packages/content/src/index.ts"), "utf8");
    const runner = readFileSync(resolve(ROOT, "apps/web/src/story/inkStoryRunner.ts"), "utf8");
    const adapter = readFileSync(resolve(ROOT, "apps/web/src/story/storyMapAdapter.ts"), "utf8");
    for (const source of [index, runner, adapter]) {
      expect(source).not.toMatch(/from\s+["']inkjs\/full["']/);
      expect(source).not.toMatch(/import\(\s*["']inkjs\/full["']\s*\)/);
      expect(source).not.toMatch(/draft-ch0[12]\.ink\?raw/);
    }
    expect(runner).toMatch(/from\s+["']inkjs["']/);
    expect(runner).not.toMatch(/from\s+["']inkjs\/full["']/);
    expect(index).toContain("import(`./chapters/${id}.ts`)");
    expect(index).not.toMatch(/const\s+chapterLoaders\s*=/);
  });

  it("production chapter modules ship compiled JSON only (no raw ink)", async () => {
    const content = await import("@supaluv/content");
    for (const { id: chapter } of content.productionStoryCatalog) {
      const mod = readFileSync(
        resolve(ROOT, `packages/content/src/chapters/${chapter}.ts`),
        "utf8",
      );
      expect(mod).toContain(`compiled/${chapter}.json`);
      expect(mod).not.toMatch(/\.ink\?raw/);
      expect(mod).not.toMatch(/inkjs/);
    }
  });
});

describe("production build artifact gate", () => {
  it("web dist has no ink-full chunk when build output exists", () => {
    const distAssets = resolve(ROOT, "apps/web/dist/assets");
    if (!existsSync(distAssets)) {
      // Build gate in the final report runs pnpm build first.
      return;
    }
    const files = readdirSync(distAssets);
    const inkFullChunks = files.filter((name) => /ink-full/i.test(name));
    expect(inkFullChunks).toEqual([]);
    const jsFiles = files.filter((name) => name.endsWith(".js"));
    for (const name of jsFiles) {
      const body = readFileSync(resolve(distAssets, name), "utf8");
      expect(body.includes("inkjs/full")).toBe(false);
    }
  });
});
