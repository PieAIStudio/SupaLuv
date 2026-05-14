export type StoryRuntimeBaseline = "react-inkjs";
export type VisualRuntimeCandidate = "react" | "pixivn-spike";

export interface SourceMaterialReference {
  readonly ipTitle: string;
  readonly projectPath: string;
  readonly canonicalLocation: string;
  readonly readOnly: boolean;
}

export interface PrototypeBoundary {
  readonly publicRuntimeAi: "out-of-scope-for-p0" | "allowed-after-review";
  readonly accounts: "defer";
  readonly payments: "defer";
  readonly multiplayer: "not-applicable";
}

export interface StorySeedManifest {
  readonly id: string;
  readonly runtimeBaseline: StoryRuntimeBaseline;
  readonly visualCandidate: VisualRuntimeCandidate;
  readonly sourceMaterial: SourceMaterialReference;
  readonly boundary: PrototypeBoundary;
}

export function isReadonlySourceMaterial(reference: SourceMaterialReference): boolean {
  return reference.readOnly;
}

export * from "./story-map";
