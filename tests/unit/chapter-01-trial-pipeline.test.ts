import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chapter01TrialInkPath = new URL(
  "../../packages/content/ink/chapter-01-trial.ink",
  import.meta.url,
);
const chapter01TrialCanvasPath = new URL(
  "../../packages/content/canvas/chapter-01-trial.canvas",
  import.meta.url,
);

function getInkKnotIds(source: string): string[] {
  return Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===/gm), (match) => match[1]).filter(
    (value): value is string => value !== undefined,
  );
}

function getMetadataTargets(scene: {
  choices?: readonly { to: string }[];
  autoNext?: string;
}): string[] {
  return [
    ...(scene.choices?.map((choice) => choice.to) ?? []),
    ...(scene.autoNext ? [scene.autoNext] : []),
  ];
}

describe("chapter 01 trial pipeline", () => {
  it("keeps a local noncanonical Chapter 01 trial Ink source", () => {
    expect(existsSync(chapter01TrialInkPath)).toBe(true);
  });

  it("exports 12-20 noncanonical scene cards for the trial chapter", async () => {
    const content = await import("@supaluv/content");

    expect(content.chapter01TrialScenes.length).toBeGreaterThanOrEqual(12);
    expect(content.chapter01TrialScenes.length).toBeLessThanOrEqual(20);
    expect(content.chapter01TrialScenes.every((scene) => scene.noncanonical)).toBe(true);
    expect(
      content.chapter01TrialScenes.every(
        (scene) => scene.source === "chapter-01-trial-pipeline-dummy",
      ),
    ).toBe(true);
  });

  it("keeps Chapter 01 trial scene ids aligned between metadata and Ink", async () => {
    const content = await import("@supaluv/content");
    const sceneIds = content.chapter01TrialScenes.map((scene) => scene.id).sort();
    const knotIds = getInkKnotIds(content.chapter01TrialInkSource).sort();

    expect(knotIds).toEqual(sceneIds);
  });

  it("keeps Chapter 01 trial metadata targets inside known scene ids", async () => {
    const content = await import("@supaluv/content");
    const sceneIds = content.chapter01TrialScenes.map((scene): string => scene.id);

    expect(
      content.chapter01TrialScenes.every((scene) =>
        getMetadataTargets(scene).every((target) => sceneIds.includes(target)),
      ),
    ).toBe(true);
  });

  it("builds and persists an Obsidian Canvas overview", async () => {
    const content = await import("@supaluv/content");
    const generator = await import("../../tools/storygraph/ink-to-canvas");

    expect(existsSync(chapter01TrialCanvasPath)).toBe(true);

    const canvasDocument = generator.buildCanvasDocument({
      storyId: "chapter-01-trial",
      scenes: content.chapter01TrialScenes,
    });
    const persistedCanvas = JSON.parse(readFileSync(chapter01TrialCanvasPath, "utf8")) as {
      nodes: unknown[];
      edges: unknown[];
    };

    expect(canvasDocument.nodes.length).toBe(content.chapter01TrialScenes.length);
    expect(canvasDocument.edges.length).toBeGreaterThan(0);
    expect(persistedCanvas.nodes.length).toBeGreaterThan(0);
    expect(persistedCanvas.edges.length).toBeGreaterThan(0);
  });
});
