import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chapter01TrialScenes } from "../../packages/content/manifests/chapter-01-trial-scenes";
import { buildStoryMapFromScenes, type PrototypeSceneCard } from "../../packages/shared/src/story-map";

interface CanvasNode {
  readonly id: string;
  readonly type: "text";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
}

interface CanvasEdge {
  readonly id: string;
  readonly fromNode: string;
  readonly toNode: string;
  readonly fromSide: "right";
  readonly toSide: "left";
  readonly label: string;
}

interface CanvasDocument {
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
}

function getInkKnotIds(source: string): string[] {
  return Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===/gm), (match) => match[1]).filter(
    (value): value is string => value !== undefined,
  );
}

export function buildCanvasDocument(input: {
  readonly storyId: string;
  readonly scenes: readonly PrototypeSceneCard[];
  readonly inkSource?: string;
}): CanvasDocument {
  if (input.inkSource) {
    const sceneIds = input.scenes.map((scene) => scene.id).sort();
    const knotIds = getInkKnotIds(input.inkSource).sort();

    if (JSON.stringify(sceneIds) !== JSON.stringify(knotIds)) {
      throw new Error(`Ink knots and scene ids drifted for story: ${input.storyId}`);
    }
  }

  const storyMap = buildStoryMapFromScenes(input.scenes);
  const nodes = input.scenes.map((scene, index) => ({
    id: scene.id,
    type: "text" as const,
    x: 160 + (index % 4) * 360,
    y: 120 + Math.floor(index / 4) * 250,
    width: 300,
    height: 160,
    text: [scene.title, `purpose: ${scene.purpose}`, `speaker: ${scene.speaker ?? "旁白"}`, `mood: ${scene.mood ?? "neutral"}`].join(
      "\n",
    ),
  }));
  const edges = storyMap.edges.map((edge, index) => ({
    id: `${input.storyId}-edge-${index + 1}`,
    fromNode: edge.from,
    toNode: edge.to,
    fromSide: "right" as const,
    toSide: "left" as const,
    label: edge.label,
  }));

  return { nodes, edges };
}

export function writeCanvasDocument(outputPath: string, document: CanvasDocument) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
}

const chapter01TrialCanvasPath = resolve(
  process.cwd(),
  "packages/content/canvas/chapter-01-trial.canvas",
);
const chapter01TrialInkPath = resolve(process.cwd(), "packages/content/ink/chapter-01-trial.ink");
const chapter01TrialCanvas = buildCanvasDocument({
  storyId: "chapter-01-trial",
  scenes: chapter01TrialScenes,
  inkSource: readFileSync(chapter01TrialInkPath, "utf8"),
});

writeCanvasDocument(chapter01TrialCanvasPath, chapter01TrialCanvas);
