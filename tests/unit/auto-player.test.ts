import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const engineUrl = pathToFileURL(join(process.cwd(), "tools/auto-player/index.mjs")).href;

type ChapterRunResult = {
  ended: boolean;
  transcriptMarkdown: string;
  choiceCount: number;
  knotCount: number;
  textLineCount: number;
  steps: number;
  persona: string;
  chapterId: string;
};

type AutoPlayerModule = {
  runChapter: (opts: {
    chapterId: string;
    personaId: string;
    maxSteps?: number;
  }) => ChapterRunResult;
  runAll: (opts: {
    outDir: string;
    personaIds?: string[];
    chapterIds?: string[];
    chainChapters?: boolean;
  }) => {
    summary: {
      personas: string[];
      chapters: string[];
      stats: Record<string, Record<string, { ended: boolean }>>;
      transcriptDiffs: Record<string, Record<string, number>>;
    };
    results: ChapterRunResult[];
  };
  lineDiffCount: (a: string, b: string) => number;
  PERSONA_IDS: readonly string[];
  MAX_STEPS: number;
};

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

async function loadEngine(): Promise<AutoPlayerModule> {
  return (await import(engineUrl)) as AutoPlayerModule;
}

describe("auto-player persona traversal engine", () => {
  it("runs all three personas through draft-ch01 to normal termination", async () => {
    const { runChapter, PERSONA_IDS, MAX_STEPS } = await loadEngine();
    expect(PERSONA_IDS).toEqual(["dignity", "impulse", "skipper"]);

    for (const personaId of PERSONA_IDS) {
      const result = runChapter({
        chapterId: "draft-ch01",
        personaId,
        maxSteps: MAX_STEPS,
      });
      expect(result.ended, `${personaId} should reach chapter end`).toBe(true);
      expect(result.steps).toBeLessThan(MAX_STEPS);
      expect(result.choiceCount).toBeGreaterThan(0);
      expect(result.knotCount).toBeGreaterThan(0);
      expect(result.transcriptMarkdown).toContain("## Chapter end");
      expect(result.transcriptMarkdown).toContain("knots_visited");
    }
  });

  it("is byte-stable: same persona × chapter twice yields identical transcript", async () => {
    const { runChapter } = await loadEngine();
    const a = runChapter({ chapterId: "draft-ch01", personaId: "dignity" });
    const b = runChapter({ chapterId: "draft-ch01", personaId: "dignity" });
    expect(a.transcriptMarkdown).toBe(b.transcriptMarkdown);
    expect(
      Buffer.from(a.transcriptMarkdown, "utf8").equals(Buffer.from(b.transcriptMarkdown, "utf8")),
    ).toBe(true);
  });

  it("dignity and impulse produce different ch01 transcripts (diff lines > 0)", async () => {
    const { runChapter, lineDiffCount } = await loadEngine();
    const dignity = runChapter({ chapterId: "draft-ch01", personaId: "dignity" });
    const impulse = runChapter({ chapterId: "draft-ch01", personaId: "impulse" });
    const diffs = lineDiffCount(dignity.transcriptMarkdown, impulse.transcriptMarkdown);
    expect(diffs).toBeGreaterThan(0);
  });

  it("summary.json has the expected matrix structure", async () => {
    const { runAll, PERSONA_IDS } = await loadEngine();
    const outDir = mkdtempSync(join(tmpdir(), "auto-player-"));
    tempDirs.push(outDir);

    const { summary } = runAll({
      outDir,
      personaIds: [...PERSONA_IDS],
      chapterIds: ["draft-ch01"],
      chainChapters: false,
    });

    const onDisk = JSON.parse(readFileSync(join(outDir, "summary.json"), "utf8")) as typeof summary;

    expect(onDisk.personas).toEqual(["dignity", "impulse", "skipper"]);
    expect(onDisk.chapters).toEqual(["draft-ch01"]);
    expect(onDisk.stats.dignity?.["draft-ch01"]?.ended).toBe(true);
    expect(onDisk.stats.impulse?.["draft-ch01"]?.ended).toBe(true);
    expect(onDisk.stats.skipper?.["draft-ch01"]?.ended).toBe(true);

    expect(onDisk.transcriptDiffs["dignity|impulse"]?.["draft-ch01"]).toBeGreaterThan(0);
    expect(typeof onDisk.transcriptDiffs["dignity|skipper"]?.["draft-ch01"]).toBe("number");
    expect(typeof onDisk.transcriptDiffs["impulse|skipper"]?.["draft-ch01"]).toBe("number");

    // Transcript files written per persona.
    for (const persona of PERSONA_IDS) {
      const body = readFileSync(join(outDir, persona, "draft-ch01.transcript.md"), "utf8");
      expect(body.startsWith("# Auto-player transcript")).toBe(true);
    }
  });
});
