import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

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
  const manifestPath = resolve(ROOT, "packages/content/sources/draft-2026-07/SOURCE-MANIFEST.json");
  const draft01Path = resolve(ROOT, "packages/content/sources/draft-2026-07/draft01.md");
  const draft02Path = resolve(ROOT, "packages/content/sources/draft-2026-07/draft02.md");
  const original01 = "/Users/yuanfei/PieAI/SupaLuv/Temp/draft01.md";
  const original02 = "/Users/yuanfei/PieAI/SupaLuv/Temp/draft02.md";

  it("keeps body bytes identical to manifest hashes (snapshot is CI SSOT)", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      sources: Array<{ relativePath: string; sha256: string; originalAbsolutePath: string }>;
    };
    for (const source of manifest.sources) {
      const bodyPath = resolve(ROOT, "packages/content/sources/draft-2026-07", source.relativePath);
      const body = readFileSync(bodyPath);
      expect(sha256Buffer(body)).toBe(source.sha256);
      // Optional local check when original Temp drafts exist; CI must not depend on them.
      if (existsSync(source.originalAbsolutePath)) {
        expect(sha256Buffer(readFileSync(source.originalAbsolutePath))).toBe(source.sha256);
        expect(Buffer.compare(body, readFileSync(source.originalAbsolutePath))).toBe(0);
      }
    }
    expect(existsSync(draft01Path)).toBe(true);
    expect(existsSync(draft02Path)).toBe(true);
    if (existsSync(original01) && existsSync(original02)) {
      expect(sha256Buffer(readFileSync(draft01Path))).toBe(sha256Buffer(readFileSync(original01)));
      expect(sha256Buffer(readFileSync(draft02Path))).toBe(sha256Buffer(readFileSync(original02)));
    }
  });
});

describe("draft-2026-07 coverage ledger (real source)", () => {
  const ledgerPath = resolve(ROOT, "packages/content/ledgers/draft-2026-07-coverage.json");
  const draft01Path = resolve(ROOT, "packages/content/sources/draft-2026-07/draft01.md");
  const draft02Path = resolve(ROOT, "packages/content/sources/draft-2026-07/draft02.md");
  const inkByChapter: Record<string, string> = {
    "draft-ch01": readInkSource("packages/content/ink/draft-ch01.ink"),
    "draft-ch02": readInkSource("packages/content/ink/draft-ch02.ink"),
  };

  it("re-parses snapshots to 93 + 76 = 169 body paragraphs and 8 structure blocks", () => {
    const draft01Body = parseBodyParagraphs(readFileSync(draft01Path, "utf8"));
    const draft02Body = parseBodyParagraphs(readFileSync(draft02Path, "utf8"));
    const draft01Struct = parseStructureBlocks(readFileSync(draft01Path, "utf8"));
    const draft02Struct = parseStructureBlocks(readFileSync(draft02Path, "utf8"));
    expect(draft01Body.length).toBe(93);
    expect(draft02Body.length).toBe(76);
    expect(draft01Body.length + draft02Body.length).toBe(169);
    expect(draft01Struct.length + draft02Struct.length).toBe(8);
  });

  it("ledger entries are exactly 169 and 1:1 with re-parsed source ids/hashes", () => {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      allowedStatuses: string[];
      structure: Array<{ id: string; textHash: string; sourceId: string }>;
      entries: Array<{
        id: string;
        sourceId: string;
        paragraphIndex: number;
        textHash: string;
        chapterId: string;
        sceneId: string | null;
        beatId: string | null;
        status: string;
        dialogueQuotes: string[];
      }>;
    };

    expect(ledger.allowedStatuses).toEqual([...ALLOWED_STATUSES]);
    expect(ledger.entries.length).toBe(169);
    expect(ledger.structure.length).toBe(8);

    const bodyBySource: Record<string, string[]> = {
      draft01: parseBodyParagraphs(readFileSync(draft01Path, "utf8")),
      draft02: parseBodyParagraphs(readFileSync(draft02Path, "utf8")),
    };
    const structureBySource: Record<string, string[]> = {
      draft01: parseStructureBlocks(readFileSync(draft01Path, "utf8")),
      draft02: parseStructureBlocks(readFileSync(draft02Path, "utf8")),
    };

    const entryIds = new Set<string>();
    const entryHashes = new Set<string>();
    for (const sourceId of ["draft01", "draft02"] as const) {
      const bodies = bodyBySource[sourceId]!;
      const sourceEntries = ledger.entries.filter((entry) => entry.sourceId === sourceId);
      expect(sourceEntries.length).toBe(bodies.length);
      sourceEntries.forEach((entry, index) => {
        expect(entry.id).toBe(`${sourceId}_p${String(index + 1).padStart(3, "0")}`);
        expect(entry.paragraphIndex).toBe(index + 1);
        expect(entry.textHash).toBe(sha256Text(bodies[index]!));
        expect(entryIds.has(entry.id)).toBe(false);
        expect(entryHashes.has(entry.textHash)).toBe(false);
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
      expect(entry.chapterId === "draft-ch01" || entry.chapterId === "draft-ch02").toBe(true);
      expect(entry.sceneId).toBeTruthy();
      expect(entry.beatId).toBeTruthy();
    }
  });

  it("every body paragraph exact-matches its mapped Ink chapter; dialogue missing=0", () => {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      entries: Array<{
        id: string;
        sourceId: string;
        paragraphIndex: number;
        textHash: string;
        chapterId: string;
        status: string;
        dialogueQuotes: string[];
      }>;
    };

    const bodyBySource: Record<string, string[]> = {
      draft01: parseBodyParagraphs(readFileSync(draft01Path, "utf8")),
      draft02: parseBodyParagraphs(readFileSync(draft02Path, "utf8")),
    };

    let paragraphMissing = 0;
    let dialogueMissing = 0;
    const paragraphMisses: string[] = [];
    const dialogueMisses: string[] = [];

    for (const entry of ledger.entries) {
      const bodies = bodyBySource[entry.sourceId]!;
      const paragraph = bodies[entry.paragraphIndex - 1];
      expect(paragraph).toBeTruthy();
      expect(sha256Text(paragraph!)).toBe(entry.textHash);
      const ink = inkByChapter[entry.chapterId] ?? "";
      if (!ink.includes(paragraph!)) {
        paragraphMissing += 1;
        paragraphMisses.push(entry.id);
      }
      for (const quote of entry.dialogueQuotes) {
        if (!ink.includes(quote)) {
          dialogueMissing += 1;
          dialogueMisses.push(`${entry.id}:${quote.slice(0, 24)}`);
        }
      }
    }

    expect(paragraphMisses).toEqual([]);
    expect(dialogueMisses).toEqual([]);
    expect(paragraphMissing).toBe(0);
    expect(dialogueMissing).toBe(0);

    const dialogueEntries = ledger.entries.filter(
      (entry) => entry.status === "verbatim-dialogue" && entry.dialogueQuotes.length > 0,
    );
    expect(dialogueEntries.length).toBeGreaterThan(50);
  });
});

describe("draft catalog and legacy retirement", () => {
  it("defaults to draft-ch01 and does not expose retired ch01 in production catalog", async () => {
    const content = await import("@supaluv/content");
    expect(content.DEFAULT_STORY_ID).toBe("draft-ch01");
    expect(content.productionStoryCatalog.map((s) => s.id)).toEqual(["draft-ch01", "draft-ch02"]);
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
      expect(entry.id).toMatch(/^draft-ch0[12]$/);
    }
  });
});

describe("draft ink / scene alignment and topology", () => {
  it("aligns scene manifests 1:1 with Ink knots and omits hand-authored edges", async () => {
    const content = await import("@supaluv/content");
    for (const storyId of ["draft-ch01", "draft-ch02"] as const) {
      const chapter = await content.loadStoryChapter(storyId);
      const source = readInkSource(`packages/content/ink/${storyId}.ink`);
      const knots = getInkKnotIds(source).sort();
      const sceneIds = chapter.scenes.map((s) => s.id).sort();
      expect(sceneIds).toEqual(knots);
      expect(chapter.scenes.every((s) => !("choices" in s) || s.choices === undefined)).toBe(true);
      expect(chapter.scenes.every((s) => !("autoNext" in s) || s.autoNext === undefined)).toBe(
        true,
      );
      expect(chapter.scenes.every((s) => s.source === "draft-2026-07")).toBe(true);
    }
  });

  it("only diverts to existing knots", () => {
    for (const storyId of ["draft-ch01", "draft-ch02"] as const) {
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
      expect(Number(runner.getVariable("dignity"))).toBeTypeOf("number");
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
        dignity: 61,
        impulse: 44,
        budget_900: true,
        clue_subsidy_sms: true,
      });
      expect(runner.getSnapshot().meters.dignity).toBe(61);
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
      "我不会评判你",
      "零点四秒",
      "深夜倾诉会员",
      "质检室",
      "This is shit",
      "样机",
      "情绪波动：优",
      "九百",
      "石家小楼",
      "先看房",
      "陈佳",
      "雷欧",
    ];
    for (const phrase of must) {
      expect(draftCh01InkSource).toContain(phrase);
    }
  });

  it("chapter 2 ink contains mandatory beat phrases", () => {
    const draftCh02InkSource = readInkSource("packages/content/ink/draft-ch02.ink");
    const must = [
      "一百六",
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
    expect(index).toMatch(/import\("\.\/chapters\/draft-ch01"\)/);
    expect(index).toMatch(/import\("\.\/chapters\/draft-ch02"\)/);
  });

  it("production chapter modules ship compiled JSON only (no raw ink)", () => {
    for (const chapter of ["draft-ch01", "draft-ch02"] as const) {
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
