import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applySceneFieldUpdates,
  parseSceneCard,
} from "../../apps/web/src/creator/server/sceneManifestEdit";
import * as pipeline from "../../apps/web/src/creator/server/creatorPipeline";
import { createCreatorStudioService } from "../../apps/web/src/creator/server/creatorStudioServer";

const tempRoots: string[] = [];

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const SAMPLE_MANIFEST = `import type { PrototypeSceneCard } from "@supaluv/shared/story-map";

export const draftCh01Scenes = [
  {
    id: "dch01_s001",
    title: "样本场景",
    purpose: "test",
    visualPlaceholder: "样本场景",
    backgroundKey: "office-night",
    artKey: "bg-office-night",
    speaker: "苏明",
    mood: "shame",
    noncanonical: true,
    source: "supa-luv-v2-2026-07",
  },
  {
    id: "dch01_s002",
    title: "有 AI 支线",
    purpose: "test",
    visualPlaceholder: "有 AI 支线",
    artKey: "bg-lobby-white",
    speaker: "旁白",
    aiBranch: {
      enabled: true,
      waitLabel: "灵感生成中…",
      rejoinSceneId: "dch01_s001",
      maxAiBeats: 2,
      context: "测试上下文",
      artPool: ["bg-office-night"],
      speakerPool: ["苏明", "旁白"],
    },
    noncanonical: true,
    source: "supa-luv-v2-2026-07",
  },
] as const satisfies readonly PrototypeSceneCard[];
`;

async function createSceneFixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), "supaluv-creator-scene-"));
  tempRoots.push(repoRoot);
  await Promise.all([
    mkdir(join(repoRoot, "packages/content/manifests"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/catalog"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/characters"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/assets"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/ink"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/compiled"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/generated"), { recursive: true }),
  ]);

  await writeFile(join(repoRoot, "packages/content/manifests/draft-ch01-scenes.ts"), SAMPLE_MANIFEST);
  await writeFile(
    join(repoRoot, "packages/content/catalog/story-catalog.json"),
    `${JSON.stringify(
      {
        productionChapters: [
          {
            id: "draft-ch01",
            inkFile: "draft-ch01.ink",
            manifestFile: "draft-ch01-scenes.ts",
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(repoRoot, "packages/content/characters/registry.ts"),
    `export const CHARACTER_BY_NAME = {
  苏明: { id: "suming", name: "苏明", side: "left", defaultPortrait: "suming-shame" },
  旁白: { id: "narrator", name: "旁白", side: "left", defaultPortrait: "suming-shame" },
};
`,
  );
  await writeFile(
    join(repoRoot, "packages/content/assets/VISUAL-ASSET-INTAKE.json"),
    `${JSON.stringify({ assets: [{ id: "bg-office-night" }, { id: "bg-lobby-white" }] }, null, 2)}\n`,
  );
  await writeFile(join(repoRoot, "packages/content/ink/draft-ch01.ink"), "=== a ===\n-> END\n");
  await writeFile(
    join(repoRoot, "packages/content/generated/narrative-graph-creator.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      packageId: "fixture",
      revision: "rev",
      nodes: [],
      edges: [],
      entryNodeIds: [],
      terminalNodeIds: [],
    })}\n`,
  );
  await writeFile(
    join(repoRoot, "packages/content/generated/narrative-graph-player.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      packageId: "fixture",
      revision: "rev",
      nodes: [],
      edges: [],
      entryNodeIds: [],
      terminalNodeIds: [],
    })}\n`,
  );
  await writeFile(join(repoRoot, "packages/content/compiled/draft-ch01.json"), "{}\n");

  return { repoRoot };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe("sceneManifestEdit", () => {
  it("parses speaker/artKey/aiBranch and rewrites speaker with minimal surrounding change", () => {
    const parsed = parseSceneCard(SAMPLE_MANIFEST, "dch01_s001");
    expect(parsed.speaker).toBe("苏明");
    expect(parsed.artKey).toBe("bg-office-night");
    expect(parsed.aiBranch).toBeNull();

    const next = applySceneFieldUpdates(SAMPLE_MANIFEST, "dch01_s001", { speaker: "旁白" });
    expect(next).toContain('speaker: "旁白"');
    expect(next).toContain('artKey: "bg-office-night"');
    expect(next).toContain('id: "dch01_s002"');
    expect(next).toContain('rejoinSceneId: "dch01_s001"');
    // Preserve original 4-space field indent (no double-indent).
    expect(next).toMatch(/^\s{4}speaker: "旁白",$/m);
    expect(next).not.toMatch(/^\s{8}speaker:/m);
  });

  it("can remove and restore aiBranch blocks", () => {
    const cleared = applySceneFieldUpdates(SAMPLE_MANIFEST, "dch01_s002", { aiBranch: null });
    expect(cleared).not.toContain("aiBranch:");
    const restored = applySceneFieldUpdates(cleared, "dch01_s002", {
      aiBranch: {
        enabled: true,
        rejoinSceneId: "dch01_s001",
        context: "新的上下文",
        maxAiBeats: 2,
      },
    });
    expect(restored).toContain("aiBranch:");
    expect(restored).toContain("新的上下文");
  });
});

describe("Creator Studio scene save", () => {
  it("loads speakers from registry and artKeys from intake", async () => {
    const fixture = await createSceneFixture();
    const service = createCreatorStudioService({ repoRoot: fixture.repoRoot });
    const meta = await service.getSceneMeta();
    expect(meta.speakers).toEqual(expect.arrayContaining(["苏明", "旁白", "系统"]));
    expect(meta.artKeys).toEqual(["bg-lobby-white", "bg-office-night"]);
    expect(meta.scenes.dch01_s001?.speaker).toBe("苏明");
    expect(meta.scenes.dch01_s002?.aiBranch?.rejoinSceneId).toBe("dch01_s001");
  });

  it("rejects hash conflicts before writing", async () => {
    const fixture = await createSceneFixture();
    const service = createCreatorStudioService({ repoRoot: fixture.repoRoot });
    const meta = await service.getSceneMeta();
    const scene = meta.scenes.dch01_s001!;
    await writeFile(
      join(fixture.repoRoot, "packages/content/manifests/draft-ch01-scenes.ts"),
      SAMPLE_MANIFEST.replace("苏明", "工作人员"),
    );

    await expect(
      service.saveScene({
        sceneId: "dch01_s001",
        chapterId: "draft-ch01",
        sourceHash: scene.sourceHash,
        fields: { speaker: "旁白" },
      }),
    ).rejects.toMatchObject({ code: "HASH_CONFLICT" });
  });

  it("writes speaker change when typecheck gate passes and rolls back on gate failure", async () => {
    const fixture = await createSceneFixture();
    const path = join(fixture.repoRoot, "packages/content/manifests/draft-ch01-scenes.ts");
    const service = createCreatorStudioService({ repoRoot: fixture.repoRoot });
    const meta = await service.getSceneMeta();
    const scene = meta.scenes.dch01_s001!;

    vi.spyOn(pipeline, "runContentTypecheckGate").mockResolvedValue({
      step: "typecheck",
      command: "pnpm --filter @supaluv/content typecheck",
      ok: true,
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });

    const saved = await service.saveScene({
      sceneId: "dch01_s001",
      chapterId: "draft-ch01",
      sourceHash: scene.sourceHash,
      fields: { speaker: "旁白" },
    });
    expect(saved.scenes.dch01_s001?.speaker).toBe("旁白");
    expect(await readFile(path, "utf8")).toContain('speaker: "旁白"');

    const afterOk = await readFile(path, "utf8");
    const hashAfterOk = sha256(afterOk);
    vi.spyOn(pipeline, "runContentTypecheckGate").mockResolvedValue({
      step: "typecheck",
      command: "pnpm --filter @supaluv/content typecheck",
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: "type error",
    });

    await expect(
      service.saveScene({
        sceneId: "dch01_s001",
        chapterId: "draft-ch01",
        sourceHash: hashAfterOk,
        fields: { speaker: "系统" },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    expect(await readFile(path, "utf8")).toBe(afterOk);
  });
});
