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
  if (!isOpen) return null;
  if (!CreatorStudio) {
    return (
      <aside className="story-map-panel is-open" data-testid="story-map-panel" role="dialog">
        <h2>创作地图</h2>
        <p>此作者工具仅在本地开发服务器可用。</p>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </aside>
    );
  }
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
