import { useEffect, useState } from "react";
import { hasAuthoritativeChoiceStatsCapability } from "@supaluv/shared/choice-stats-catalog";
import type { GlobalLeanHint } from "../coplay/RpsDuelOverlay";
import {
  leanForChoiceLabel,
  loadAuthoritativeCounts,
  preferCommunityChoiceIndex,
} from "../stats/choiceStatsLean";

/**
 * Load lean for the two conflicting co-play choices.
 * Referee majority authority only uses trusted durable aggregate sources.
 * Process-memory / demo samples fail closed (no referee pick).
 */
export function useRpsGlobalLean(input: {
  readonly enabled: boolean;
  readonly storyId: string;
  readonly sceneId: string | null;
  readonly hostLabel: string;
  readonly guestLabel: string;
  readonly hostIndex: number;
  readonly guestIndex: number;
}): {
  readonly lean: GlobalLeanHint | null;
  readonly refereePick: { index: number; note: string } | null;
} {
  const [lean, setLean] = useState<GlobalLeanHint | null>(null);
  const [refereePick, setRefereePick] = useState<{ index: number; note: string } | null>(null);

  useEffect(() => {
    if (!input.enabled || !hasAuthoritativeChoiceStatsCapability()) {
      setLean(null);
      setRefereePick(null);
      return;
    }
    let cancelled = false;
    setLean({ hostPercent: null, guestPercent: null, canReferee: false, loading: true });
    void loadAuthoritativeCounts(input.storyId).then((counts) => {
      if (cancelled) {
        return;
      }
      const hostLean = leanForChoiceLabel(input.storyId, input.sceneId, input.hostLabel, counts);
      const guestLean = leanForChoiceLabel(input.storyId, input.sceneId, input.guestLabel, counts);
      const pick = preferCommunityChoiceIndex({
        storyId: input.storyId,
        sceneId: input.sceneId,
        hostLabel: input.hostLabel,
        guestLabel: input.guestLabel,
        hostIndex: input.hostIndex,
        guestIndex: input.guestIndex,
        counts,
      });
      setLean({
        hostPercent: hostLean?.percent ?? null,
        guestPercent: guestLean?.percent ?? null,
        canReferee: Boolean(pick),
        loading: false,
      });
      setRefereePick(pick);
    });
    return () => {
      cancelled = true;
    };
  }, [
    input.enabled,
    input.guestIndex,
    input.guestLabel,
    input.hostIndex,
    input.hostLabel,
    input.sceneId,
    input.storyId,
  ]);

  return { lean, refereePick };
}
