import type { CharacterMoodKey } from "@supaluv/shared";
import type { StoryCharacterBindings } from "./characterPackTypes";

export function resolveCharacterPortrait(
  slotId: string,
  mood: CharacterMoodKey,
  bindings: StoryCharacterBindings,
  officialFallback: string,
): string {
  const binding = bindings[slotId];
  if (!binding) return officialFallback;
  return binding.moodUrls[mood] ?? binding.baseUrl ?? officialFallback;
}
