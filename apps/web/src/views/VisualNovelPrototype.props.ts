import type { DialogueVoicePlaybackGuardApi } from "../audio/dialogueVoicePlaybackGuard";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import type { CoPlaySessionApi } from "../coplay/useCoPlaySession";
import type { ManualSlotId } from "../persistence/gameSave";
import type { DisplayNameMap } from "../persistence/displayNames";
import type { PortraitPackState } from "../persistence/portraitPack";
import type { GameSettings } from "../persistence/settings";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import type { StoryId } from "../story/storyMapAdapter";
import type { EndingPathMeta } from "./ChapterEndCard";

/** Public play-stage composition props — shape is stable; do not change without App callers. */
export interface VisualNovelPrototypeProps {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly textSpeed: GameSettings["textSpeed"];
  readonly autoPlay: boolean;
  readonly masterMuted: boolean;
  readonly voiceVolume: GameSettings["voiceVolume"];
  readonly dialogueVoiceGuard: DialogueVoicePlaybackGuardApi;
  readonly dialogueVoiceRunKey: string;
  readonly activeSaveSlot: ManualSlotId;
  readonly displayNames?: DisplayNameMap;
  readonly portraitPack?: PortraitPackState;
  readonly characterBindings?: StoryCharacterBindings;
  readonly onCharacterBindingsChange?: (bindings: StoryCharacterBindings) => void;
  readonly coPlay?: CoPlaySessionApi | null;
  readonly onLeaveCoPlay?: () => void;
  readonly onRareEcho?: () => void;
  readonly onReverseCurrent?: () => void;
  readonly onOracleHit?: () => void;
  readonly onRpsResolvedAchievement?: () => void;
  readonly onCustomPackCgSkipped?: () => void;
  readonly onStoryChange: (storyId: StoryId) => void;
  readonly onChoose: (index: number) => void;
  readonly onJumpTo: (path: string) => void;
  readonly onOpenPlayerPath: () => void;
  readonly onOpenCreatorMap: () => void;
  readonly onReset: () => void;
  readonly onSave: (slotId?: ManualSlotId) => void;
  readonly onOpenTitle: () => void;
  readonly onOpenGallery: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenHelp?: () => void;
  readonly onOpenAchievements?: () => void;
  readonly onAutoPlayChange?: (next: boolean) => void;
  readonly onMasterMutedChange?: (next: boolean) => void;
  readonly onAiBranchUsed?: () => void;
  readonly onChapterClear?: (path: EndingPathMeta) => void;
  /** First hear of a bed → gallery audio unlock. */
  readonly onBedHeard?: (bedId: string) => void;
}
