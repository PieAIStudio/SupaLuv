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
    displayName: "周鹿",
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
    lockPoint: {
      kind: "story_knot",
      storyId: "ch01",
      knotId: "ch01_product_page",
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
      kind: "story_knot",
      storyId: "ch01",
      knotId: "ch01_product_page",
    },
  },
] as const satisfies readonly CharacterSlotDefinition[];
