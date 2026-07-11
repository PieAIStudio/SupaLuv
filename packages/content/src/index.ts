import type { PrototypeSceneCard, StorySeedManifest } from "@supaluv/shared";
import { chapter01TrialScenes } from "../manifests/chapter-01-trial-scenes";
import { ch01Scenes } from "../manifests/ch01-scenes";
import { prototypeScenes } from "../manifests/prototype-scenes";
import ch01InkSource from "../ink/ch01.ink?raw";
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

export type StoryCatalogId = "ch01" | "prototype-act1" | "chapter-01-trial";

export interface StoryCatalogEntry {
  readonly id: StoryCatalogId;
  readonly label: string;
  readonly inkSource: string;
  readonly scenes: readonly PrototypeSceneCard[];
}

export const storyCatalog: readonly StoryCatalogEntry[] = [
  {
    id: "ch01",
    label: "第01章 · 不会嫌弃你",
    inkSource: ch01InkSource,
    scenes: ch01Scenes,
  },
  {
    id: "prototype-act1",
    label: "Prototype Act 1 · Comedy Beat Lab",
    inkSource: prototypeAct1InkSource,
    scenes: prototypeScenes,
  },
  {
    id: "chapter-01-trial",
    label: "Chapter 01 Trial / 管线dummy",
    inkSource: chapter01TrialInkSource,
    scenes: chapter01TrialScenes,
  },
] as const;

export type { StorySeedManifest } from "@supaluv/shared";
export {
  ch01InkSource,
  ch01Scenes,
  chapter01TrialInkSource,
  chapter01TrialScenes,
  prototypeAct1InkSource,
  prototypeScenes,
};
export { CHARACTER_BY_NAME, resolveCharacter } from "../characters/registry";
export type { CharacterDef, PortraitSide } from "../characters/registry";
export { CHARACTER_SLOTS, INITIAL_CHARACTER_MOODS } from "../characters/slots";
