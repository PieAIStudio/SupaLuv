export interface RuntimeBoundaryChoice {
  readonly index: number;
  readonly id: string | null;
  readonly text: string;
}

export interface RuntimeBoundary {
  readonly sceneId: string | null;
  readonly text: string;
  readonly displayedTexts: readonly { readonly sceneId: string; readonly text: string }[];
  readonly choices: readonly RuntimeBoundaryChoice[];
  readonly stateJson: string;
  readonly ended: boolean;
}

export interface RuntimeExploration {
  readonly mode: "representative-visible-menu";
  readonly reachableScenes: Set<string>;
  readonly displayedTextsByScene: Map<string, Set<string>>;
  readonly exploredStates: number;
  readonly expandedMenus: number;
  readonly terminalStates: number;
  readonly errors: readonly string[];
}

export function readRuntimeBoundary(story: unknown, carriedSceneId: string | null): RuntimeBoundary;
export function exploreRepresentativeChapter(
  Story: new (compiledJson: string) => unknown,
  compiledJson: string,
  maxExploredStates?: number,
): RuntimeExploration;
export function hasRuntimeTextWitness(
  exploration: RuntimeExploration,
  sceneId: string | null | undefined,
  sourceParagraph: string,
): boolean;
