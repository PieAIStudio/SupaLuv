/**
 * Lazy story-runtime loader — keeps compiled Ink / chapter map / save writer
 * out of the entry chunk. Not part of the public StorySession interface.
 */

export type StoryRuntime = typeof import("../inkStoryRunner") &
  typeof import("../storyMapAdapter") &
  typeof import("../../persistence/sceneUnlocks") &
  typeof import("../../persistence/saveWriter");

let storyRuntimePromise: Promise<StoryRuntime> | null = null;

export function loadStoryRuntime(): Promise<StoryRuntime> {
  if (!storyRuntimePromise) {
    storyRuntimePromise = Promise.all([
      import("../inkStoryRunner"),
      import("../storyMapAdapter"),
      import("../../persistence/sceneUnlocks"),
      import("../../persistence/saveWriter"),
    ])
      .then(([runnerModule, storyMapModule, sceneUnlockModule, saveWriterModule]) => ({
        ...runnerModule,
        ...storyMapModule,
        ...sceneUnlockModule,
        ...saveWriterModule,
      }))
      .catch((error: unknown) => {
        storyRuntimePromise = null;
        throw error;
      });
  }
  return storyRuntimePromise;
}
