import type { AiEndingContract } from "./ai-ending.js";

export const PROTOTYPE_SCENE_SOURCE = "experimental-chapter-01-pipeline-dummy" as const;
export const CHAPTER_01_TRIAL_SCENE_SOURCE = "chapter-01-trial-pipeline-dummy" as const;
export const CHAPTER_01_NARRATIVE_DRAFT_SOURCE = "chapter-01-narrative-draft" as const;
export const DRAFT_2026_07_SOURCE = "draft-2026-07" as const;
/** Novel v2 densified chapters (supa-luv-v2 snapshot 2026-07). */
export const SUPA_LUV_V2_2026_07_SOURCE = "supa-luv-v2-2026-07" as const;

export type PrototypeSceneSource =
  | typeof PROTOTYPE_SCENE_SOURCE
  | typeof CHAPTER_01_TRIAL_SCENE_SOURCE
  | typeof CHAPTER_01_NARRATIVE_DRAFT_SOURCE
  | typeof DRAFT_2026_07_SOURCE
  | typeof SUPA_LUV_V2_2026_07_SOURCE;

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
  /** Public art id under /assets/scenes/{artKey}.jpg when present. */
  readonly artKey?: string;
  /** Restrained still-image motion used instead of identity-breaking prerendered human video. */
  readonly stageMotion?: "slow_push" | "drift" | "flash";
  /** Portrait id under /assets/portraits/{portraitKey}.png when present. */
  readonly portraitKey?: string;
  /**
   * Optional second portrait (e.g. listener on the other side).
   * Runtime places left/right by character side registry.
   */
  readonly companionPortraitKey?: string;
  /** Companion display name when dual portraits are active. */
  readonly companionSpeaker?: string;
  /**
   * Legacy single bed id under /assets/audio/bgm/{bgmKey}.mp3.
   * Runtime classifies into music vs ambient (soft-piano → music; others → ambient).
   */
  readonly bgmKey?: string;
  /** Explicit melodic bed (optional; overrides bgmKey classification for music). */
  readonly musicKey?: string;
  /** Explicit environment bed (optional; overrides bgmKey classification for ambient). */
  readonly ambientKey?: string;
  /** One-shot SFX id under /assets/audio/sfx/{sfxKey}.mp3 on scene enter. */
  readonly sfxKey?: string;
  /** Optional full-bleed video under /assets/video/{videoKey}.mp4 (event CG / cutscene). */
  readonly videoKey?: string;
  /** Player-facing cutscene label, e.g. 开场 CG / 事件 CG. */
  readonly cutsceneTitle?: string;
  readonly speaker?: string;
  readonly mood?: string;
  /** Character slots selected exactly once when this authored scene is reached. */
  readonly characterSlotLock?: {
    readonly slotIds: readonly string[];
  };
  readonly aiEnding?: AiEndingContract;
  /**
   * Optional live AI choice slot on this authored beat.
   * AI may add ONE extra choice and short side content, then MUST rejoin
   * `rejoinSceneId` (authored Ink knot). Never open-ended free story.
   */
  readonly aiBranch?: AiBranchSceneConfig;
  readonly noncanonical: true;
  readonly source: PrototypeSceneSource;
  /**
   * Legacy edge copies only. Production draft chapters keep topology in Ink —
   * do not hand-author choices/autoNext for new content.
   */
  readonly choices?: readonly PrototypeSceneChoice[];
  readonly autoNext?: string;
}

/** Story package / chapter catalog contract used by content + web runtime. */
export type StoryCatalogRole = "production" | "dev" | "legacy";

export type ChapterCheckpointKind = "next_chapter" | "draft_end" | "ai_ending_allowed";

export interface ChapterCheckpoint {
  readonly kind: ChapterCheckpointKind;
  /** When kind is next_chapter, the production chapter id to load next. */
  readonly nextChapterId?: string;
}

export interface StoryPackageMeta {
  readonly packageId: string;
  readonly label: string;
  readonly startChapterId: string;
  readonly chapterIds: readonly string[];
}

/** Content-side contract for a constrained AI side branch. */
export interface AiBranchSceneConfig {
  readonly enabled: true;
  /** Placeholder while the option is generating. */
  readonly waitLabel?: string;
  /** Authored Ink scene id / knot the AI path must return to. */
  readonly rejoinSceneId: string;
  /** Max AI-only dialogue beats before forced rejoin (1–4). */
  readonly maxAiBeats?: number;
  /** Short authoring brief for the model / mock. */
  readonly context: string;
  /** Allowed scene art stems (no free image invent in public demo). */
  readonly artPool?: readonly string[];
  /** Allowed portrait stems. */
  readonly portraitPool?: readonly string[];
  /** Allowed speakers for AI beats. */
  readonly speakerPool?: readonly string[];
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
