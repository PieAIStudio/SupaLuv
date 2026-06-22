import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chapter01TrialInkPath = new URL(
  "../../packages/content/ink/chapter-01-trial.ink",
  import.meta.url,
);
const chapter01TrialCanvasPath = new URL(
  "../../packages/content/canvas/chapter-01-trial.canvas",
  import.meta.url,
);
const worktreeRoot = resolve(new URL("../..", import.meta.url).pathname);

const chapter01TrialMainline = [
  "act1_trial_property_photo",
  "act1_trial_office_shame_test",
  "act1_trial_coworker_pressure",
  "act1_trial_self_authored_reply",
  "act1_trial_meeting_sell_safety",
  "act1_trial_lunch_heat_memory",
  "act1_trial_forum_hint",
  "act1_trial_anonymous_forum",
  "act1_trial_product_page",
  "act1_trial_demo_reply",
  "act1_trial_order_form",
  "act1_trial_payment",
] as const;

const chapter01TrialLeftBranch = [
  "act1_trial_property_pickup",
  "act1_trial_street_aftertaste",
  "act1_trial_rental_return",
  "act1_trial_room_cleanup",
] as const;

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
      nodes: Array<{
        id: string;
        type: string;
        x: number;
        y: number;
        text?: string;
        label?: string;
      }>;
      edges: Array<{
        fromNode: string;
        toNode: string;
        label: string;
        color?: string;
      }>;
    };
    const nodeById = new Map(persistedCanvas.nodes.map((node) => [node.id, node] as const));
    const mainlineNodes = chapter01TrialMainline.map((id) => nodeById.get(id));
    const leftBranchNodes = chapter01TrialLeftBranch.map((id) => nodeById.get(id));
    const returnEdges = persistedCanvas.edges.filter((edge) => edge.label.startsWith("↩ "));
    const textNodes = persistedCanvas.nodes.filter((node) => node.type === "text");

    expect(textNodes.length).toBe(content.chapter01TrialScenes.length);
    expect(canvasDocument.edges.length).toBeGreaterThan(0);
    expect(persistedCanvas.nodes.length).toBeGreaterThan(0);
    expect(persistedCanvas.edges.length).toBeGreaterThan(0);
    expect(
      persistedCanvas.edges.every(
        (edge) => nodeById.has(edge.fromNode) && nodeById.has(edge.toNode),
      ),
    ).toBe(true);
    expect(
      mainlineNodes.every((node, index) => {
        if (!node) {
          return false;
        }

        if (index === 0) {
          return true;
        }

        const previousNode = mainlineNodes[index - 1];
        return previousNode !== undefined && previousNode.y < node.y;
      }),
    ).toBe(true);
    expect(
      leftBranchNodes.every(
        (node) => node !== undefined && node.x < (nodeById.get("act1_trial_forum_hint")?.x ?? 0),
      ),
    ).toBe(true);
    expect(returnEdges.length).toBeGreaterThan(0);
    expect(returnEdges.every((edge) => edge.color === "orange")).toBe(true);
    expect(nodeById.get("act1_trial_property_photo")?.text).toContain("## 01. Property Photo");
    expect(nodeById.get("act1_trial_property_photo")?.text).toContain("**功能**：");
    expect(nodeById.get("act1_trial_property_photo")?.text).toContain("**说话人**：旁白");
    expect(nodeById.get("act1_trial_property_photo")?.text).toContain(
      "`act1_trial_property_photo`",
    );
    expect(
      persistedCanvas.nodes.some(
        (node) =>
          node.type === "group" &&
          ["职场测试", "论坛分支", "取物支线", "购买漏斗"].includes(node.label ?? ""),
      ),
    ).toBe(true);
  });

  it("does not rewrite the canvas just by importing the generator module", () => {
    const beforeStat = statSync(chapter01TrialCanvasPath);
    const importResult = spawnSync(
      "node",
      ["--input-type=module", "-e", "await import('./tools/storygraph/ink-to-canvas.ts')"],
      {
        cwd: worktreeRoot,
        encoding: "utf8",
      },
    );
    const afterStat = statSync(chapter01TrialCanvasPath);

    expect(importResult.status).toBe(0);
    expect(afterStat.mtimeMs).toBe(beforeStat.mtimeMs);
  });
});
