import type { InkStorySnapshot } from "../../story/inkStoryRunner";
import type { StoryId } from "../../story/storyMapAdapter";

/** Single-choice labels that advance plot without real branch pressure. */
const CONTINUE_CHOICE_RE =
  /^(继续|……继续|继续下单流程|回家|回自己房间|去物业|支付|确认地址，进入支付|打开匿名论坛|点进产品页|打开演示对话|躺着听世界运转)$/;

export function clampMeter(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function storyHasComedyMeters(storyId: StoryId): boolean {
  return (
    storyId === "draft-ch01" ||
    storyId === "draft-ch02" ||
    storyId === "prototype-act1" ||
    storyId === "chapter-01-trial"
  );
}

/**
 * True when the only available choice is a "continue-like" advance.
 * Used by auto-play and keyboard Space/Enter advance.
 */
export function isContinueOnly(snapshot: InkStorySnapshot): boolean {
  return (
    snapshot.choices.length === 1 && CONTINUE_CHOICE_RE.test(snapshot.choices[0]?.text.trim() ?? "")
  );
}

export function isContinueChoiceText(text: string): boolean {
  return CONTINUE_CHOICE_RE.test(text.trim());
}
