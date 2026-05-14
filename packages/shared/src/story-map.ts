export const PROTOTYPE_SCENE_SOURCE = "experimental-chapter-01-pipeline-dummy" as const;
export const CHAPTER_01_TRIAL_SCENE_SOURCE = "chapter-01-trial-pipeline-dummy" as const;

export type PrototypeSceneSource =
  | typeof PROTOTYPE_SCENE_SOURCE
  | typeof CHAPTER_01_TRIAL_SCENE_SOURCE;

export type PrototypeSceneEdgeKind = "choice" | "return";

export interface PrototypeSceneChoice {
  readonly label: string;
  readonly to: string;
  readonly kind?: PrototypeSceneEdgeKind;
}

export interface PrototypeSceneCard {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly visualPlaceholder: string;
  readonly backgroundKey?: string;
  readonly speaker?: string;
  readonly mood?: string;
  readonly noncanonical: true;
  readonly source: PrototypeSceneSource;
  readonly choices?: readonly PrototypeSceneChoice[];
  readonly autoNext?: string;
}

export interface StoryMapNode {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly visualPlaceholder: string;
  readonly noncanonical: true;
}

export interface StoryMapEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly kind: "choice" | "continue" | "return";
}

export interface StoryMap {
  readonly nodes: readonly StoryMapNode[];
  readonly edges: readonly StoryMapEdge[];
}

export function buildStoryMapFromScenes(scenes: readonly PrototypeSceneCard[]): StoryMap {
  const nodes = scenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    purpose: scene.purpose,
    visualPlaceholder: scene.visualPlaceholder,
    noncanonical: scene.noncanonical,
  }));

  const choiceEdges = scenes.flatMap((scene) =>
    (scene.choices ?? []).map((choice) => ({
      from: scene.id,
      to: choice.to,
      label: choice.label,
      kind: choice.kind ?? "choice",
    })),
  );

  const continueEdges = scenes.flatMap((scene) =>
    scene.autoNext
      ? [
          {
            from: scene.id,
            to: scene.autoNext,
            label: "continue",
            kind: "continue" as const,
          },
        ]
      : [],
  );

  return {
    nodes,
    edges: [...choiceEdges, ...continueEdges],
  };
}

export function toMermaidFlowchart(map: StoryMap): string {
  const nodeLines = map.nodes.map((node) => `  ${node.id}["${node.title}"]`);
  const edgeLines = map.edges.map((edge) => {
    const connector = edge.kind === "continue" ? "-->" : "-.->";

    return `  ${edge.from} ${connector}|${edge.label}| ${edge.to}`;
  });

  return ["flowchart TD", ...nodeLines, ...edgeLines].join("\n");
}
