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
  // Casting the official actor means the authored portraits already ARE that
  // actor — pass the scene's art through untouched. An official binding has
  // moodUrls: {}, so resolving it here would flatten every authored mood key
  // (shame/hurt/guarded/…) down to the base face.
  if (binding.packId?.startsWith("official:")) return officialFallback;
  return binding.moodUrls[mood] ?? binding.baseUrl ?? officialFallback;
}
