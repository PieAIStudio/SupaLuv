import { lazy, Suspense } from "react";
import type { StoryId } from "../story/storyMapAdapter";

const CreatorStudio = import.meta.env.DEV ? lazy(() => import("../creator/CreatorStudio")) : null;

interface StoryMapPreviewProps {
  readonly storyId: StoryId;
  readonly currentSceneId: string | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function StoryMapPreview({
  storyId,
  currentSceneId,
  isOpen,
  onClose,
}: StoryMapPreviewProps) {
  if (!import.meta.env.DEV) return null;
  if (!isOpen) return null;
  if (!CreatorStudio) return null;
  return (
    <Suspense fallback={<div className="creator-loading">正在载入创作地图…</div>}>
      <CreatorStudio
        storyId={storyId}
        currentSceneId={currentSceneId}
        isOpen={isOpen}
        onClose={onClose}
      />
    </Suspense>
  );
}
