import { existsSync, readFileSync } from "node:fs";
import type { PrototypeSceneCard } from "@supaluv/shared";
import { describe, expect, it } from "vitest";

const prototypeInkPath = new URL("../../packages/content/ink/prototype-act1.ink", import.meta.url);

function readPrototypeInk(): string {
  return readFileSync(prototypeInkPath, "utf8");
}

function getInkKnotIds(source: string): string[] {
  return Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===/gm), (match) => match[1]).filter(
    (knotId): knotId is string => knotId !== undefined,
  );
}

function getInkKnotBodies(source: string): Map<string, string> {
  const headings = Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===$/gm), (match) => ({
    fullMatch: match[0],
    knotId: match[1],
    index: match.index ?? 0,
  })).filter(
    (heading): heading is { fullMatch: string; knotId: string; index: number } =>
      heading.knotId !== undefined,
  );
  const sections = headings.map((heading, index) => {
    const knotId = heading.knotId;
    const bodyStart = heading.index + heading.fullMatch.length + 1;
    const nextHeadingIndex = headings[index + 1]?.index ?? source.length;
    const body = source.slice(bodyStart, nextHeadingIndex).trimEnd();

    return [knotId, body] as const;
  });

  return new Map(sections);
}

function getMetadataTargets(scene: PrototypeSceneCard): string[] {
  return [
    ...(scene.choices?.map((choice) => choice.to) ?? []),
    ...(scene.autoNext ? [scene.autoNext] : []),
  ];
}

function getInkOutgoingTargetsByKnot(source: string): Map<string, string[]> {
  const targetsByKnot = new Map<string, string[]>();

  for (const [knotId, body] of getInkKnotBodies(source)) {
    const rawTargets = Array.from(
      body.matchAll(
        /(?:^\s*\+\s+\[[^\]]+\]\s*->\s+([A-Za-z0-9_]+)\s*$)|(?:^\s*->\s+([A-Za-z0-9_]+)\s*$)/gm,
      ),
      (match) => match[1] ?? match[2],
    );

    const filteredTargets = rawTargets.filter(
      (target): target is string => target !== undefined && target !== "END",
    );

    targetsByKnot.set(knotId, filteredTargets);
  }

  return targetsByKnot;
}

describe("prototype Ink fixture", () => {
  it("keeps a local noncanonical Ink source fixture", () => {
    expect(existsSync(prototypeInkPath)).toBe(true);
  });

  it("marks every derived scene as noncanonical", async () => {
    const { prototypeScenes } = await import("@supaluv/content/prototype-scenes");

    expect(prototypeScenes).toHaveLength(8);
    expect(prototypeScenes.every((scene) => scene.noncanonical)).toBe(true);
    expect(
      prototypeScenes.every((scene) => scene.source === "experimental-chapter-01-pipeline-dummy"),
    ).toBe(true);
  });

  it("includes minimal presentation metadata for the VN-like pass", async () => {
    const { prototypeScenes } = await import("@supaluv/content/prototype-scenes");

    expect(
      prototypeScenes.every(
        (scene) =>
          typeof scene.backgroundKey === "string" &&
          scene.backgroundKey.length > 0 &&
          typeof scene.speaker === "string" &&
          scene.speaker.length > 0 &&
          typeof scene.mood === "string" &&
          scene.mood.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps scene ids aligned between metadata and Ink knots", async () => {
    const { prototypeScenes } = await import("@supaluv/content/prototype-scenes");
    const knotIds = getInkKnotIds(readPrototypeInk());
    const sceneIds = prototypeScenes.map((scene) => scene.id);

    expect([...knotIds].sort()).toEqual([...sceneIds].sort());
  });

  it("keeps every metadata edge target inside the declared scene ids", async () => {
    const { prototypeScenes } = await import("@supaluv/content/prototype-scenes");
    const sceneIds = prototypeScenes.map((scene): string => scene.id);

    expect(
      prototypeScenes.every((scene) =>
        getMetadataTargets(scene).every((target) => sceneIds.includes(target)),
      ),
    ).toBe(true);
  });

  it("keeps parsed Ink outgoing targets aligned with metadata scene edges", async () => {
    const { prototypeScenes } = await import("@supaluv/content/prototype-scenes");
    const metadataTargetsByScene = new Map(
      prototypeScenes.map(
        (scene) => [scene.id as string, getMetadataTargets(scene).sort()] as const,
      ),
    );
    const inkTargetsByKnot = getInkOutgoingTargetsByKnot(readPrototypeInk());

    expect([...inkTargetsByKnot.keys()].sort()).toEqual([...metadataTargetsByScene.keys()].sort());

    for (const [sceneId, metadataTargets] of metadataTargetsByScene) {
      expect(inkTargetsByKnot.get(sceneId)?.sort() ?? []).toEqual(metadataTargets);
    }
  });
});
