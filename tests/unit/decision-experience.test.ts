import { describe, expect, it } from "vitest";
import type { ChapterCheckpointKind } from "@supaluv/shared";
import type { StatsDecisionDef } from "../../apps/web/src/stats/choiceStatsTypes";
import {
  ENDING_PATH_HINT_AI,
  ENDING_PATH_HINT_AUTHOR,
  resolveChapterEnded,
  resolveCheckpointFlags,
  resolveDialogueYieldsToEnding,
  resolveEndCardOpen,
  resolveEndingPath,
  resolveIsInterChapter,
  resolveOracleOptions,
  resolveShowTerminalEndCard,
} from "../../apps/web/src/views/play/experience/resolveDecisionOutcome";

describe("resolveEndingPath", () => {
  it("uses exact Chinese pathHint when AI branch was used", () => {
    expect(resolveEndingPath(true)).toEqual({
      usedAiBranch: true,
      pathHint: ENDING_PATH_HINT_AI,
    });
    expect(ENDING_PATH_HINT_AI).toBe("本局走过 AI 灵感旁支，并汇合作者主线。");
  });

  it("uses exact Chinese pathHint for author-only runs", () => {
    expect(resolveEndingPath(false)).toEqual({
      usedAiBranch: false,
      pathHint: ENDING_PATH_HINT_AUTHOR,
    });
    expect(ENDING_PATH_HINT_AUTHOR).toBe("本局仅走作者预写选项。");
  });
});

describe("resolveChapterEnded", () => {
  it("requires isEnded + typewriter complete + not aiPlaying", () => {
    expect(resolveChapterEnded({ isEnded: true, typewriterComplete: true, aiPlaying: false })).toBe(
      true,
    );
    expect(
      resolveChapterEnded({ isEnded: true, typewriterComplete: false, aiPlaying: false }),
    ).toBe(false);
    expect(resolveChapterEnded({ isEnded: true, typewriterComplete: true, aiPlaying: true })).toBe(
      false,
    );
    expect(
      resolveChapterEnded({ isEnded: false, typewriterComplete: true, aiPlaying: false }),
    ).toBe(false);
  });
});

describe("resolveIsInterChapter / terminal card", () => {
  it("treats next_chapter as inter-chapter (no terminal card)", () => {
    const kind: ChapterCheckpointKind = "next_chapter";
    expect(resolveIsInterChapter(kind)).toBe(true);
    expect(resolveShowTerminalEndCard({ chapterEnded: true, isInterChapter: true })).toBe(false);
  });

  it("shows terminal card only when chapter ended and not inter-chapter", () => {
    expect(resolveShowTerminalEndCard({ chapterEnded: true, isInterChapter: false })).toBe(true);
    expect(resolveShowTerminalEndCard({ chapterEnded: false, isInterChapter: false })).toBe(false);
  });
});

describe("resolveEndCardOpen", () => {
  it("guest uses remoteIsEnded and suppresses inter-chapter terminal", () => {
    expect(
      resolveEndCardOpen({
        isGuestSpectator: true,
        remoteIsEnded: true,
        chapterEnded: false,
        isInterChapter: false,
      }),
    ).toBe(true);
    expect(
      resolveEndCardOpen({
        isGuestSpectator: true,
        remoteIsEnded: true,
        chapterEnded: true,
        isInterChapter: true,
      }),
    ).toBe(false);
  });

  it("host/solo uses local chapterEnded", () => {
    expect(
      resolveEndCardOpen({
        isGuestSpectator: false,
        remoteIsEnded: true,
        chapterEnded: true,
        isInterChapter: false,
      }),
    ).toBe(true);
    expect(
      resolveEndCardOpen({
        isGuestSpectator: false,
        remoteIsEnded: true,
        chapterEnded: false,
        isInterChapter: false,
      }),
    ).toBe(false);
  });
});

describe("resolveDialogueYieldsToEnding", () => {
  it("guest yields on remote end; host on local chapter end", () => {
    expect(
      resolveDialogueYieldsToEnding({
        isGuestSpectator: true,
        remoteIsEnded: true,
        chapterEnded: false,
      }),
    ).toBe(true);
    expect(
      resolveDialogueYieldsToEnding({
        isGuestSpectator: false,
        remoteIsEnded: true,
        chapterEnded: false,
      }),
    ).toBe(false);
    expect(
      resolveDialogueYieldsToEnding({
        isGuestSpectator: false,
        remoteIsEnded: false,
        chapterEnded: true,
      }),
    ).toBe(true);
  });
});

describe("resolveCheckpointFlags", () => {
  it("projects inter-chapter, AI ending, and draft end flags", () => {
    const cases: readonly ChapterCheckpointKind[] = [
      "next_chapter",
      "ai_ending_allowed",
      "draft_end",
    ];
    expect(resolveCheckpointFlags(cases[0]!)).toEqual({
      isInterChapter: true,
      allowAiEnding: false,
      draftEnd: false,
    });
    expect(resolveCheckpointFlags(cases[1]!)).toEqual({
      isInterChapter: false,
      allowAiEnding: true,
      draftEnd: false,
    });
    expect(resolveCheckpointFlags(cases[2]!)).toEqual({
      isInterChapter: false,
      allowAiEnding: false,
      draftEnd: true,
    });
  });
});

describe("resolveOracleOptions", () => {
  it("maps catalog options to DialoguePanel oracle shape", () => {
    const decision: StatsDecisionDef = {
      storyId: "draft-ch01",
      sceneId: "dch01_s003",
      decisionId: "d1_bones",
      prompt: "协议：字面与骨头",
      options: [
        {
          choiceId: "d1_bones_accept",
          match: "至少说人话了",
          shortLabel: "点头：至少说人话了",
        },
        {
          choiceId: "d1_bones_cold",
          match: "后门也算诚实",
          shortLabel: "冷笑：后门也算诚实",
        },
      ],
    };
    expect(resolveOracleOptions(decision)).toEqual([
      {
        choiceId: "d1_bones_accept",
        shortLabel: "点头：至少说人话了",
        matchLabel: "至少说人话了",
      },
      {
        choiceId: "d1_bones_cold",
        shortLabel: "冷笑：后门也算诚实",
        matchLabel: "后门也算诚实",
      },
    ]);
  });

  it("returns empty list when no decision", () => {
    expect(resolveOracleOptions(null)).toEqual([]);
  });
});
