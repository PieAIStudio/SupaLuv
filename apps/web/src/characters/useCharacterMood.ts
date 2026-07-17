import type { CharacterMoodKey } from "@supaluv/shared";
import type { LockedCharacterBinding } from "./characterPackTypes";

const pending = new Map<string, Promise<string>>();

export function requestCharacterMoodOnce(
  binding: LockedCharacterBinding,
  mood: CharacterMoodKey,
  generate: () => Promise<string>,
): Promise<string> {
  const cached = binding.moodUrls[mood];
  if (cached) return Promise.resolve(cached);
  const key = `${binding.packId}:${mood}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = generate().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
