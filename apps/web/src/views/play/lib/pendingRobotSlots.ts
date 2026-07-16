import { getStoryScene, type StoryId } from "../../../story/storyMapAdapter";
import type { StoryCharacterBindings } from "../../../characters/characterPackTypes";
import type { CharacterStudioSlot } from "../../CharacterStudioScreen";

/** Scene character-slot lock → Character Studio entries still missing bindings. */
export function pendingRobotSlotsForScene(
  storyId: StoryId,
  sceneId: string | null,
  characterBindings: StoryCharacterBindings,
): CharacterStudioSlot[] {
  const currentScene = getStoryScene(storyId, sceneId);
  return (currentScene?.characterSlotLock?.slotIds ?? [])
    .filter((slotId) => !characterBindings[slotId])
    .map<CharacterStudioSlot>((slotId) =>
      slotId === "robot_aila"
        ? {
            id: slotId,
            name: "艾拉",
            role: "女款机器人",
            roleKey: "characterStudio.femaleRobot",
            kind: "robot",
            official: "/assets/portraits/demo-ui.png",
          }
        : {
            id: slotId,
            name: "凯",
            role: "男款机器人",
            roleKey: "characterStudio.maleRobot",
            kind: "robot",
            official: "/assets/portraits/demo-ui.png",
          },
    );
}
