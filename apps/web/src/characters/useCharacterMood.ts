import { useEffect, useState } from "react";
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

export function useCharacterMood(input: {
  readonly binding?: LockedCharacterBinding;
  readonly mood: CharacterMoodKey;
  readonly generate?: () => Promise<string>;
}) {
  const fallback = input.binding?.baseUrl ?? null;
  const cached = input.binding?.moodUrls[input.mood];
  const [state, setState] = useState<{
    readonly url: string | null;
    readonly status: "cached" | "pending" | "fallback";
  }>(() => ({ url: cached ?? fallback, status: cached ? "cached" : "fallback" }));

  useEffect(() => {
    if (!input.binding) return;
    const exact = input.binding.moodUrls[input.mood];
    if (exact) {
      setState({ url: exact, status: "cached" });
      return;
    }
    if (!input.generate || input.binding.packId.startsWith("official:")) {
      setState({ url: input.binding.baseUrl, status: "fallback" });
      return;
    }
    let active = true;
    setState({ url: input.binding.baseUrl, status: "pending" });
    void requestCharacterMoodOnce(input.binding, input.mood, input.generate)
      .then((url) => active && setState({ url, status: "cached" }))
      .catch(() => active && setState({ url: input.binding!.baseUrl, status: "fallback" }));
    return () => {
      active = false;
    };
  }, [input.binding, input.generate, input.mood]);

  return state;
}
