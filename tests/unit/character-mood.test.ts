import { describe, expect, it, vi } from "vitest";
import { requestCharacterMoodOnce } from "../../apps/web/src/characters/useCharacterMood";

const binding = {
  slotId: "lead_suming",
  packId: "pack-1",
  baseUrl: "https://signed/base",
  moodUrls: { happy: "https://signed/happy" },
  lockedAt: "2026-07-12T00:00:00.000Z",
} as const;

describe("character mood loading", () => {
  it("returns a cached mood without generating", async () => {
    const generate = vi.fn(async () => "unused");
    await expect(requestCharacterMoodOnce(binding, "happy", generate)).resolves.toBe(
      "https://signed/happy",
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("suppresses duplicate pending generation and retries after failure", async () => {
    let release!: (value: string) => void;
    const generate = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const first = requestCharacterMoodOnce(binding, "sad", generate);
    const duplicate = requestCharacterMoodOnce(binding, "sad", generate);
    expect(duplicate).toBe(first);
    expect(generate).toHaveBeenCalledOnce();
    release("https://signed/sad");
    await expect(first).resolves.toBe("https://signed/sad");

    const failed = vi.fn(async () => {
      throw new Error("failed");
    });
    await expect(requestCharacterMoodOnce(binding, "angry", failed)).rejects.toThrow("failed");
    const retry = vi.fn(async () => "https://signed/angry");
    await expect(requestCharacterMoodOnce(binding, "angry", retry)).resolves.toBe(
      "https://signed/angry",
    );
  });
});
