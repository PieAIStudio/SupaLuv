import { useState } from "react";
import { createInkStoryRunner, createPrototypeInkStoryRunner } from "./story/inkStoryRunner";
import { getStoryDefinition, type StoryId } from "./story/storyMapAdapter";
import { StoryMapPreview } from "./views/StoryMapPreview";
import { VisualNovelPrototype } from "./views/VisualNovelPrototype";

export function App() {
  const [storyId, setStoryId] = useState<StoryId>("prototype-act1");
  const [storyRevision, setStoryRevision] = useState(0);
  const [runner, setRunner] = useState(() => createPrototypeInkStoryRunner());
  const [snapshot, setSnapshot] = useState(() => runner.getSnapshot());
  const [isCreatorMapOpen, setCreatorMapOpen] = useState(false);

  function loadStory(nextStoryId: StoryId) {
    const nextRunner = createInkStoryRunner(getStoryDefinition(nextStoryId).inkSource);
    setStoryId(nextStoryId);
    setRunner(nextRunner);
    setSnapshot(nextRunner.getSnapshot());
    setStoryRevision((value) => value + 1);
  }

  function handleReset() {
    loadStory(storyId);
  }

  return (
    <main className="app-shell">
      <VisualNovelPrototype
        key={storyRevision}
        storyId={storyId}
        snapshot={snapshot}
        onStoryChange={(nextStoryId) => loadStory(nextStoryId)}
        onChoose={(index) => setSnapshot(runner.choose(index))}
        onOpenMap={() => setCreatorMapOpen(true)}
        onReset={handleReset}
      />
      <StoryMapPreview
        storyId={storyId}
        currentSceneId={snapshot.sceneId}
        isOpen={isCreatorMapOpen}
        onClose={() => setCreatorMapOpen(false)}
      />
    </main>
  );
}
