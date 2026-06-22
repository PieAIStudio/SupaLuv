import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
// @ts-expect-error TS5097 -- this Node-executed script needs explicit .ts specifiers for the built-in TS loader.
import { chapter01TrialScenes } from "../../packages/content/manifests/chapter-01-trial-scenes.ts";
// @ts-expect-error TS5097 -- this Node-executed script needs explicit .ts specifiers for the built-in TS loader.
import { buildStoryMapFromScenes, type PrototypeSceneCard, type StoryMapEdge } from "../../packages/shared/src/story-map.ts";

type CanvasSide = "top" | "right" | "bottom" | "left";
type CanvasColor = "gray" | "cyan" | "orange";

interface CanvasTextNode {
  readonly id: string;
  readonly type: "text";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
}

interface CanvasGroupNode {
  readonly id: string;
  readonly type: "group";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
}

export interface CanvasEdge {
  readonly id: string;
  readonly fromNode: string;
  readonly toNode: string;
  readonly fromSide: CanvasSide;
  readonly toSide: CanvasSide;
  readonly label: string;
  readonly color?: CanvasColor;
}

type CanvasNode = CanvasTextNode | CanvasGroupNode;

export interface CanvasDocument {
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
}

interface CanvasBuildInput {
  readonly storyId: string;
  readonly scenes: readonly PrototypeSceneCard[];
  readonly inkSource?: string;
}

interface PositionedSceneNode extends CanvasTextNode {
  readonly lane: "main" | "leftBranch";
}

interface ChapterLayoutPreset {
  readonly mainlineOrder: readonly string[];
  readonly leftBranchOrder: readonly string[];
  readonly laneX: {
    readonly main: number;
    readonly leftBranch: number;
    readonly returnLane: number;
  };
  readonly verticalStep: number;
}

const chapter01TrialPreset: ChapterLayoutPreset = {
  mainlineOrder: [
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
  ],
  leftBranchOrder: [
    "act1_trial_property_pickup",
    "act1_trial_street_aftertaste",
    "act1_trial_rental_return",
    "act1_trial_room_cleanup",
  ],
  laneX: {
    main: 0,
    leftBranch: -520,
    returnLane: 520,
  },
  verticalStep: 280,
};

const chapter01TrialIndexLabels = new Map<string, string>([
  ["act1_trial_property_photo", "01"],
  ["act1_trial_office_shame_test", "02"],
  ["act1_trial_coworker_pressure", "03"],
  ["act1_trial_self_authored_reply", "04"],
  ["act1_trial_meeting_sell_safety", "05"],
  ["act1_trial_lunch_heat_memory", "06"],
  ["act1_trial_forum_hint", "07"],
  ["act1_trial_property_pickup", "07A"],
  ["act1_trial_street_aftertaste", "07B"],
  ["act1_trial_rental_return", "07C"],
  ["act1_trial_room_cleanup", "07D"],
  ["act1_trial_anonymous_forum", "08"],
  ["act1_trial_product_page", "09"],
  ["act1_trial_demo_reply", "10"],
  ["act1_trial_order_form", "11"],
  ["act1_trial_payment", "12"],
]);

const defaultChapter01TrialCanvasPath = resolve(
  process.cwd(),
  "packages/content/canvas/chapter-01-trial.canvas",
);
const defaultChapter01TrialInkPath = resolve(
  process.cwd(),
  "packages/content/ink/chapter-01-trial.ink",
);

function getInkKnotIds(source: string): string[] {
  return Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===/gm), (match) => match[1]).filter(
    (value): value is string => value !== undefined,
  );
}

function assertInkAlignment(input: CanvasBuildInput) {
  if (!input.inkSource) {
    return;
  }

  const sceneIds = input.scenes.map((scene) => scene.id).sort();
  const knotIds = getInkKnotIds(input.inkSource).sort();

  if (JSON.stringify(sceneIds) !== JSON.stringify(knotIds)) {
    throw new Error(`Ink knots and scene ids drifted for story: ${input.storyId}`);
  }
}

function formatSceneNodeText(scene: PrototypeSceneCard, indexLabel: string): string {
  return [
    `## ${indexLabel}. ${scene.title}`,
    `**功能**：${scene.purpose}`,
    `**说话人**：${scene.speaker ?? "旁白"}`,
    `**情绪**：${scene.mood ?? "neutral"}`,
    `\`${scene.id}\``,
  ].join("\n");
}

function buildFallbackNodes(scenes: readonly PrototypeSceneCard[]): PositionedSceneNode[] {
  return scenes.map((scene, index) => ({
    id: scene.id,
    type: "text",
    lane: "main",
    x: 0,
    y: index * 280,
    width: 320,
    height: 180,
    text: formatSceneNodeText(scene, String(index + 1).padStart(2, "0")),
  }));
}

function buildChapter01TrialNodes(scenes: readonly PrototypeSceneCard[]): PositionedSceneNode[] {
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene] as const));
  const nodes: PositionedSceneNode[] = [];
  const mainlineYById = new Map<string, number>();

  chapter01TrialPreset.mainlineOrder.forEach((sceneId, index) => {
    const scene = sceneById.get(sceneId);

    if (!scene) {
      throw new Error(`Missing scene for chapter-01-trial layout preset: ${sceneId}`);
    }

    const y = index < 7 ? index * chapter01TrialPreset.verticalStep : (index + 4) * chapter01TrialPreset.verticalStep;
    mainlineYById.set(sceneId, y);
    nodes.push({
      id: scene.id,
      type: "text",
      lane: "main",
      x: chapter01TrialPreset.laneX.main,
      y,
      width: 320,
      height: 180,
      text: formatSceneNodeText(scene, chapter01TrialIndexLabels.get(scene.id) ?? "00"),
    });
  });

  const forumHintY = mainlineYById.get("act1_trial_forum_hint");
  const anonymousForumY = mainlineYById.get("act1_trial_anonymous_forum");

  if (forumHintY === undefined || anonymousForumY === undefined) {
    throw new Error("chapter-01-trial mainline preset is missing forum merge anchors");
  }

  chapter01TrialPreset.leftBranchOrder.forEach((sceneId, index) => {
    const scene = sceneById.get(sceneId);

    if (!scene) {
      throw new Error(`Missing left-branch scene for chapter-01-trial layout preset: ${sceneId}`);
    }

    const y = forumHintY + (index + 1) * chapter01TrialPreset.verticalStep;

    if (y >= anonymousForumY) {
      throw new Error(`Left-branch scene overlaps merge target: ${sceneId}`);
    }

    nodes.push({
      id: scene.id,
      type: "text",
      lane: "leftBranch",
      x: chapter01TrialPreset.laneX.leftBranch,
      y,
      width: 320,
      height: 180,
      text: formatSceneNodeText(scene, chapter01TrialIndexLabels.get(scene.id) ?? "07X"),
    });
  });

  return nodes;
}

function createGroupNode(
  id: string,
  label: string,
  nodeIds: readonly string[],
  nodeById: ReadonlyMap<string, PositionedSceneNode>,
): CanvasGroupNode {
  const nodes = nodeIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is PositionedSceneNode => node !== undefined);

  if (nodes.length === 0) {
    throw new Error(`Cannot create group ${id} without nodes`);
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxRight = Math.max(...nodes.map((node) => node.x + node.width));
  const maxBottom = Math.max(...nodes.map((node) => node.y + node.height));

  return {
    id,
    type: "group",
    label,
    x: minX - 140,
    y: minY - 120,
    width: maxRight - minX + 280,
    height: maxBottom - minY + 220,
  };
}

function buildChapter01TrialGroups(
  nodeById: ReadonlyMap<string, PositionedSceneNode>,
): readonly CanvasGroupNode[] {
  return [
    createGroupNode(
      "group_workplace_test",
      "职场测试",
      [
        "act1_trial_property_photo",
        "act1_trial_office_shame_test",
        "act1_trial_coworker_pressure",
        "act1_trial_self_authored_reply",
        "act1_trial_meeting_sell_safety",
        "act1_trial_lunch_heat_memory",
      ],
      nodeById,
    ),
    createGroupNode(
      "group_forum_branch",
      "论坛分支",
      [
        "act1_trial_forum_hint",
        "act1_trial_anonymous_forum",
      ],
      nodeById,
    ),
    createGroupNode(
      "group_property_branch",
      "取物支线",
      [
        "act1_trial_property_pickup",
        "act1_trial_street_aftertaste",
        "act1_trial_rental_return",
        "act1_trial_room_cleanup",
      ],
      nodeById,
    ),
    createGroupNode(
      "group_purchase_funnel",
      "购买漏斗",
      [
        "act1_trial_product_page",
        "act1_trial_demo_reply",
        "act1_trial_order_form",
        "act1_trial_payment",
      ],
      nodeById,
    ),
  ];
}

function getNodeLane(nodeId: string, nodeById: ReadonlyMap<string, PositionedSceneNode>) {
  return nodeById.get(nodeId)?.lane ?? "main";
}

function styleCanvasEdge(
  storyId: string,
  edge: StoryMapEdge,
  index: number,
  nodeById: ReadonlyMap<string, PositionedSceneNode>,
): CanvasEdge {
  if (edge.kind === "return") {
    return {
      id: `${storyId}-edge-${index + 1}`,
      fromNode: edge.from,
      toNode: edge.to,
      fromSide: "right",
      toSide: "right",
      label: `↩ ${edge.label}`,
      color: "orange",
    };
  }

  const fromLane = getNodeLane(edge.from, nodeById);
  const toLane = getNodeLane(edge.to, nodeById);

  if (edge.kind === "choice") {
    if (fromLane === "main" && toLane === "leftBranch") {
      return {
        id: `${storyId}-edge-${index + 1}`,
        fromNode: edge.from,
        toNode: edge.to,
        fromSide: "left",
        toSide: "top",
        label: edge.label,
        color: "cyan",
      };
    }

    return {
      id: `${storyId}-edge-${index + 1}`,
      fromNode: edge.from,
      toNode: edge.to,
      fromSide: "bottom",
      toSide: "top",
      label: edge.label,
      color: "cyan",
    };
  }

  if (fromLane === "leftBranch" && toLane === "main") {
    return {
      id: `${storyId}-edge-${index + 1}`,
      fromNode: edge.from,
      toNode: edge.to,
      fromSide: "right",
      toSide: "left",
      label: "continue",
      color: "gray",
    };
  }

  return {
    id: `${storyId}-edge-${index + 1}`,
    fromNode: edge.from,
    toNode: edge.to,
    fromSide: "bottom",
    toSide: "top",
    label: "continue",
    color: "gray",
  };
}

function buildPositionedSceneNodes(input: CanvasBuildInput): PositionedSceneNode[] {
  if (input.storyId === "chapter-01-trial") {
    return buildChapter01TrialNodes(input.scenes);
  }

  return buildFallbackNodes(input.scenes);
}

export function buildCanvasDocument(input: CanvasBuildInput): CanvasDocument {
  assertInkAlignment(input);

  const storyMap = buildStoryMapFromScenes(input.scenes);
  const positionedSceneNodes = buildPositionedSceneNodes(input);
  const nodeById = new Map(positionedSceneNodes.map((node) => [node.id, node] as const));
  const groupNodes =
    input.storyId === "chapter-01-trial" ? buildChapter01TrialGroups(nodeById) : [];
  const textNodes: CanvasTextNode[] = positionedSceneNodes.map(({ lane: _lane, ...node }) => node);
  const edges = storyMap.edges.map((edge, index) =>
    styleCanvasEdge(input.storyId, edge, index, nodeById),
  );

  return {
    nodes: [...groupNodes, ...textNodes],
    edges,
  };
}

export function writeCanvasDocument(outputPath: string, document: CanvasDocument) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
}

export function generateChapter01TrialCanvas(outputPath = defaultChapter01TrialCanvasPath) {
  const document = buildCanvasDocument({
    storyId: "chapter-01-trial",
    scenes: chapter01TrialScenes,
    inkSource: readFileSync(defaultChapter01TrialInkPath, "utf8"),
  });

  writeCanvasDocument(outputPath, document);

  return document;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateChapter01TrialCanvas();
}
