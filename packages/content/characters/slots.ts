import { INITIAL_CHARACTER_MOOD_KEYS, type CharacterSlotDefinition } from "@supaluv/shared";

export const INITIAL_CHARACTER_MOODS = INITIAL_CHARACTER_MOOD_KEYS;

export const CHARACTER_SLOTS = [
  {
    id: "lead_suming",
    officialCharacterId: "suming",
    displayName: "苏明",
    displayRole: "男主角",
    kind: "human",
    allowedInputModes: ["image_references"],
    requiredMoodKeys: INITIAL_CHARACTER_MOODS,
    lockPoint: { kind: "before_new_game" },
  },
  {
    id: "lead_zhou_lu",
    officialCharacterId: "zhou_lu",
    // Slot/character ids stay stable; the draft-2026-07 chapters cast her as 石佩欣.
    displayName: "石佩欣",
    displayRole: "女主角",
    kind: "human",
    allowedInputModes: ["image_references"],
    requiredMoodKeys: INITIAL_CHARACTER_MOODS,
    lockPoint: { kind: "before_new_game" },
  },
  {
    id: "robot_aila",
    officialCharacterId: "aila",
    displayName: "艾拉",
    displayRole: "女款机器人",
    kind: "robot",
    allowedInputModes: ["text_brief", "image_references"],
    requiredMoodKeys: INITIAL_CHARACTER_MOODS,
    // Robot identity lock is deferred past the two draft chapters (recruitment
    // teaser only). Keep slots registered for later packages without binding
    // retired ch01 product-page knots.
    lockPoint: {
      kind: "deferred_story_knot",
      reason: "Awaiting the authored robot-selection scene in a later chapter.",
    },
  },
  {
    id: "robot_kai",
    officialCharacterId: "kai",
    displayName: "凯",
    displayRole: "男款机器人",
    kind: "robot",
    allowedInputModes: ["text_brief", "image_references"],
    requiredMoodKeys: INITIAL_CHARACTER_MOODS,
    lockPoint: {
      kind: "deferred_story_knot",
      reason: "Awaiting the authored robot-selection scene in a later chapter.",
    },
  },
] as const satisfies readonly CharacterSlotDefinition[];
