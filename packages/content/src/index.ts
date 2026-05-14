import type { PrototypeSceneCard, StorySeedManifest } from "@supaluv/shared";
import { chapter01TrialScenes } from "../manifests/chapter-01-trial-scenes";
import { prototypeScenes } from "../manifests/prototype-scenes";
import chapter01TrialInkSource from "../ink/chapter-01-trial.ink?raw";
import prototypeAct1InkSource from "../ink/prototype-act1.ink?raw";

export const superLoverSeedManifest = {
  id: "super-lover-p0-seed",
  runtimeBaseline: "react-inkjs",
  visualCandidate: "react",
  sourceMaterial: {
    ipTitle: "超级爱人",
    projectPath: "docs/reference/source-material/super-lover-outline.md",
    canonicalLocation: "Obsidian vault source outline",
    readOnly: true,
  },
  boundary: {
    publicRuntimeAi: "out-of-scope-for-p0",
    accounts: "defer",
    payments: "defer",
    multiplayer: "not-applicable",
  },
} satisfies StorySeedManifest;

export type StoryCatalogId = "prototype-act1" | "chapter-01-trial";

export interface StoryCatalogEntry {
  readonly id: StoryCatalogId;
  readonly label: string;
  readonly inkSource: string;
  readonly scenes: readonly PrototypeSceneCard[];
}

export const storyCatalog: readonly StoryCatalogEntry[] = [
  {
    id: "prototype-act1",
    label: "Prototype Act 1",
    inkSource: prototypeAct1InkSource,
    scenes: prototypeScenes,
  },
  {
    id: "chapter-01-trial",
    label: "Chapter 01 Trial / 退款期已过",
    inkSource: chapter01TrialInkSource,
    scenes: chapter01TrialScenes,
  },
] as const;

export type { StorySeedManifest } from "@supaluv/shared";
export { chapter01TrialInkSource, chapter01TrialScenes, prototypeAct1InkSource, prototypeScenes };
