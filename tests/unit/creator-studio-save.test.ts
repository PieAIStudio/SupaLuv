import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import {
  CreatorStudioError,
  createCreatorStudioService,
  shouldEnableCreatorStudio,
  type CreatorCandidateArtifacts,
  type CreatorCandidateInput,
} from "../../apps/web/src/creator/server/creatorStudioServer";
import { createCreatorStudioRequestHandler } from "../../apps/web/src/creator/server/creatorStudioDevPlugin";

const tempRoots: string[] = [];

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), "supaluv-creator-studio-"));
  tempRoots.push(repoRoot);
  await Promise.all([
    mkdir(join(repoRoot, "packages/content/ink"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/compiled"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/generated"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/catalog"), { recursive: true }),
  ]);

  const inkPath = "packages/content/ink/draft-ch01.ink";
  const source = [
    "=== scene_one ===",
    "# scene:scene_one",
    "旁白：订单像遗书一样准时。",
    "+ [继续] # choice:choice_one",
    "  -> END",
    "",
  ].join("\n");
  const creatorGraph = {
    schemaVersion: 1,
    packageId: "fixture",
    revision: "revision-before",
    nodes: [
      {
        id: "draft-ch01#scene:scene_one",
        storyId: "draft-ch01",
        chapterId: "draft-ch01",
        chapterOrder: 1,
        kind: "terminal",
        stableSceneId: "scene_one",
        title: "订单像遗书一样准时。",
        excerpt: "旁白：订单像遗书一样准时。",
        sourceRange: { file: inkPath, startLine: 1, endLine: 5 },
        dialogueLines: [
          {
            text: "旁白：订单像遗书一样准时。",
            sourceRange: { file: inkPath, startLine: 3, endLine: 3 },
          },
        ],
      },
    ],
    edges: [
      {
        id: "draft-ch01#choice:choice_one",
        kind: "choice",
        fromNodeId: "draft-ch01#scene:scene_one",
        toNodeId: "draft-ch01#scene:scene_one",
        stableChoiceId: "choice_one",
        endsChapter: true,
        label: "继续",
        sourceRange: { file: inkPath, startLine: 4, endLine: 4 },
      },
    ],
    entryNodeIds: ["draft-ch01#scene:scene_one"],
    terminalNodeIds: ["draft-ch01#scene:scene_one"],
  };

  await writeFile(join(repoRoot, inkPath), source, "utf8");
  await writeJson(join(repoRoot, "packages/content/catalog/story-catalog.json"), {
    defaultPackageId: "fixture",
    productionChapters: [
      {
        id: "draft-ch01",
        packageId: "fixture",
        chapterIndex: 1,
        inkFile: "draft-ch01.ink",
        manifestFile: "draft-ch01-scenes.ts",
        checkpoint: { kind: "draft_end" },
        label: "第一章",
      },
    ],
  });
  await writeJson(
    join(repoRoot, "packages/content/generated/narrative-graph-creator.json"),
    creatorGraph,
  );
  await writeJson(join(repoRoot, "packages/content/generated/narrative-graph-player.json"), {
    schemaVersion: 1,
    packageId: "fixture",
    revision: "revision-before",
    nodes: [],
    edges: [],
    entryNodeIds: [],
    terminalNodeIds: [],
  });
  await writeFile(
    join(repoRoot, "packages/content/compiled/draft-ch01.json"),
    '{"compiled":"before"}\n',
    "utf8",
  );

  return { repoRoot, inkPath, source, creatorGraph };
}

function successfulValidator(input: CreatorCandidateInput): CreatorCandidateArtifacts {
  const nextRevision = sha256(input.candidateSource).slice(0, 16);
  return {
    compiledJson: `${JSON.stringify({ compiled: input.candidateSource })}\n`,
    creatorGraph: {
      ...input.currentGraph,
      revision: nextRevision,
      nodes: input.currentGraph.nodes.map((node) => ({
        ...node,
        excerpt: input.replacement,
        dialogueLines: node.dialogueLines.map((line) =>
          line.sourceRange?.startLine === input.sourceRange.startLine
            ? { ...line, text: input.replacement }
            : line,
        ),
      })),
    },
    playerGraph: {
      schemaVersion: 1,
      packageId: input.currentGraph.packageId,
      revision: nextRevision,
      nodes: [],
      edges: [],
      entryNodeIds: [],
      terminalNodeIds: [],
    },
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Creator Studio source transaction", () => {
  it("exposes only catalog allowlisted Ink sources", async () => {
    const fixture = await createFixture();
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: successfulValidator,
    });

    const envelope = await service.getGraph();

    expect(Object.keys(envelope.sources)).toEqual([fixture.inkPath]);
    expect(envelope.sources[fixture.inkPath]!.hash).toBe(sha256(fixture.source));
  });

  it("rejects directory traversal even when the target exists", async () => {
    const fixture = await createFixture();
    await writeFile(join(fixture.repoRoot, "outside.ink"), "secret", "utf8");
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: successfulValidator,
    });
    const envelope = await service.getGraph();

    await expect(
      service.save({
        file: "packages/content/ink/../../outside.ink",
        revision: envelope.graph.revision,
        sourceHash: sha256("secret"),
        sourceRange: { startLine: 3, endLine: 3 },
        originalText: "secret",
        replacement: "changed",
      }),
    ).rejects.toMatchObject({ code: "INVALID_PATH" });
  });

  it("reports a hash conflict before writing", async () => {
    const fixture = await createFixture();
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: successfulValidator,
    });
    const envelope = await service.getGraph();
    await writeFile(
      join(fixture.repoRoot, fixture.inkPath),
      fixture.source.replace("准时", "迟到"),
    );

    await expect(
      service.save({
        file: fixture.inkPath,
        revision: envelope.graph.revision,
        sourceHash: envelope.sources[fixture.inkPath]!.hash,
        sourceRange: { startLine: 3, endLine: 3 },
        originalText: "旁白：订单像遗书一样准时。",
        replacement: "旁白：订单像遗书一样准时！",
      }),
    ).rejects.toMatchObject({ code: "HASH_CONFLICT" });
  });

  it("reports source range drift when the current bytes do not match the selected line", async () => {
    const fixture = await createFixture();
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: successfulValidator,
    });
    const envelope = await service.getGraph();

    await expect(
      service.save({
        file: fixture.inkPath,
        revision: envelope.graph.revision,
        sourceHash: envelope.sources[fixture.inkPath]!.hash,
        sourceRange: { startLine: 3, endLine: 3 },
        originalText: "旁白：这不是当前文本。",
        replacement: "旁白：订单像遗书一样准时！",
      }),
    ).rejects.toMatchObject({ code: "RANGE_DRIFT" });
  });

  it("saves an indented line via trimmed match and preserves the disk indentation", async () => {
    const fixture = await createFixture();
    // The creator graph serves display text with indentation trimmed; a line
    // nested in a gather/choice block carries leading whitespace on disk.
    const indentedSource = fixture.source.replace(
      "旁白：订单像遗书一样准时。",
      "    旁白：订单像遗书一样准时。",
    );
    await writeFile(join(fixture.repoRoot, fixture.inkPath), indentedSource, "utf8");
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: successfulValidator,
    });
    const envelope = await service.getGraph();

    await service.save({
      file: fixture.inkPath,
      revision: envelope.graph.revision,
      sourceHash: envelope.sources[fixture.inkPath]!.hash,
      sourceRange: { startLine: 3, endLine: 3 },
      originalText: "旁白：订单像遗书一样准时。",
      replacement: "旁白：订单像遗书一样准时！",
    });

    const written = await readFile(join(fixture.repoRoot, fixture.inkPath), "utf8");
    expect(written.split("\n")[2]).toBe("    旁白：订单像遗书一样准时！");
  });

  it("keeps every persisted byte unchanged when candidate compilation fails", async () => {
    const fixture = await createFixture();
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: () => {
        throw new CreatorStudioError("COMPILE_FAILED", "fixture compiler rejected candidate", 422);
      },
    });
    const envelope = await service.getGraph();
    const watched = [
      fixture.inkPath,
      "packages/content/compiled/draft-ch01.json",
      "packages/content/generated/narrative-graph-creator.json",
      "packages/content/generated/narrative-graph-player.json",
    ];
    const before = await Promise.all(watched.map((path) => readFile(join(fixture.repoRoot, path))));

    await expect(
      service.save({
        file: fixture.inkPath,
        revision: envelope.graph.revision,
        sourceHash: envelope.sources[fixture.inkPath]!.hash,
        sourceRange: { startLine: 3, endLine: 3 },
        originalText: "旁白：订单像遗书一样准时。",
        replacement: "旁白：[[故意制造编译错误",
      }),
    ).rejects.toMatchObject({ code: "COMPILE_FAILED" });

    const after = await Promise.all(watched.map((path) => readFile(join(fixture.repoRoot, path))));
    expect(after).toEqual(before);
  });

  it("atomically replaces source and derived artifacts and returns the new revision", async () => {
    const fixture = await createFixture();
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: successfulValidator,
    });
    const envelope = await service.getGraph();

    const saved = await service.save({
      file: fixture.inkPath,
      revision: envelope.graph.revision,
      sourceHash: envelope.sources[fixture.inkPath]!.hash,
      sourceRange: { startLine: 3, endLine: 3 },
      originalText: "旁白：订单像遗书一样准时。",
      replacement: "旁白：订单像遗书一样准时！",
    });

    expect(saved.graph.revision).not.toBe(envelope.graph.revision);
    expect(saved.sources[fixture.inkPath]!.hash).not.toBe(envelope.sources[fixture.inkPath]!.hash);
    expect(await readFile(join(fixture.repoRoot, fixture.inkPath), "utf8")).toContain("准时！");
    expect(
      JSON.parse(
        await readFile(
          join(fixture.repoRoot, "packages/content/generated/narrative-graph-creator.json"),
          "utf8",
        ),
      ).revision,
    ).toBe(saved.graph.revision);
    expect(
      await readFile(join(fixture.repoRoot, "packages/content/compiled/draft-ch01.json"), "utf8"),
    ).toContain("准时！");
  });
});

describe("Creator Studio production boundary", () => {
  it("registers the write middleware only for a development Vite server", () => {
    expect(shouldEnableCreatorStudio("serve", "development")).toBe(true);
    expect(shouldEnableCreatorStudio("serve", "production")).toBe(false);
    expect(shouldEnableCreatorStudio("build", "development")).toBe(false);
    expect(shouldEnableCreatorStudio("build", "production")).toBe(false);
  });

  it("serves the creator graph through the local-only request handler", async () => {
    const fixture = await createFixture();
    const service = createCreatorStudioService({
      repoRoot: fixture.repoRoot,
      validateCandidate: successfulValidator,
    });
    const handler = createCreatorStudioRequestHandler(service);
    const request = Object.assign(new EventEmitter(), {
      method: "GET",
      url: "/__creator-studio/graph",
    });
    let body = "";
    const headers = new Map<string, string>();
    const response = {
      statusCode: 200,
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
      },
      end(value?: string) {
        body = value ?? "";
      },
    };

    await handler(request as never, response as never, () => {
      throw new Error("creator route unexpectedly fell through");
    });

    expect(response.statusCode).toBe(200);
    expect(headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(body).graph.revision).toBe("revision-before");
  });
});
