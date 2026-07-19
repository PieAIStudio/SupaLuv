import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import type { StoryId } from "../../../story/storyMapAdapter";

/** Re-export for play-layer consumers; source of truth is `lib/meters`. */
export { clampMeter } from "../../../lib/meters";

/**
 * Single-choice labels that advance plot without real branch pressure.
 * zh authored continues + EN "Continue" (locale-selected Ink).
 * Case-insensitive for the English literal only.
 */
const CONTINUE_CHOICE_RE =
  /^(继续|……继续|继续下单流程|回家|回自己房间|去物业|支付|确认地址，进入支付|打开匿名论坛|点进产品页|打开演示对话|躺着听世界运转|continue)$/i;

export function storyHasComedyMeters(storyId: StoryId): boolean {
  return (
    storyId === "draft-ch01" ||
    storyId === "draft-ch02" ||
    storyId === "draft-ch03" ||
    storyId === "prototype-act1" ||
    storyId === "chapter-01-trial"
  );
}

/**
 * True when the only available choice is a "continue-like" advance.
 * Used by auto-play and keyboard Space/Enter advance.
 * Multi-option beats stay keyboard-safe (digits only; Space/Enter do nothing).
 */
export function isContinueOnly(snapshot: Pick<InkStorySnapshot, "choices">): boolean {
  return (
    snapshot.choices.length === 1 && CONTINUE_CHOICE_RE.test(snapshot.choices[0]?.text.trim() ?? "")
  );
}

export function isContinueChoiceText(text: string): boolean {
  return CONTINUE_CHOICE_RE.test(text.trim());
}
