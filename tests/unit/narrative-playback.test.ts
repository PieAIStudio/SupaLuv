import { describe, expect, it } from "vitest";
import {
  resolveAutoplayDelayMs,
  resolveAutoplayEligibility,
} from "../../apps/web/src/views/play/experience/resolveAutoplay";
import {
  buildDialogueLogStamp,
  resolveAiChoiceHistoryEntry,
  resolvePlayerChoiceHistoryEntry,
  resolveRevealedDialogueEntry,
  shouldConsiderDialogueLog,
} from "../../apps/web/src/views/play/experience/resolveDialogueHistory";
import {
  GUEST_WAIT_SCENE_TITLE,
  GUEST_WAIT_SPEAKER,
  GUEST_WAIT_TEXT,
  resolveDialogueComplete,
  resolvePanelChoices,
  resolvePlaybackSource,
  resolveRawDialogue,
  resolveSceneTitle,
  resolveVoiceLineKey,
} from "../../apps/web/src/views/play/experience/resolvePlaybackSource";
import { resolveActiveAiBeat } from "../../apps/web/src/views/play/experience/resolveActiveAiBeat";
import type { AiChoiceSlotState } from "../../apps/web/src/ai/aiBranchTypes";

const remote = {
  sceneId: "remote-1",
  sceneTitle: "远程场景",
  speaker: "周鹿",
  text: "远程对白",
  isComplete: true,
  isEnded: false,
  choices: [{ index: 0, text: "远程选项" }],
  mianzi: 40,
  ai_score: 60,
  aiMode: false,
};

describe("resolvePlaybackSource — source precedence", () => {
  it("guest uses remote story when present", () => {
    const raw = resolveRawDialogue({
      isGuestSpectator: true,
      remoteStory: remote,
      activeAiBeat: { speaker: "AI", text: "AI text" },
      snapshotText: "ink text",
      presentationSpeaker: "旁白",
    });
    expect(raw).toEqual({ text: "远程对白", speaker: "周鹿" });
  });

  it("guest uses exact wait copy when remote story is missing", () => {
    const raw = resolveRawDialogue({
      isGuestSpectator: true,
      remoteStory: null,
      activeAiBeat: { speaker: "AI", text: "AI text" },
      snapshotText: "ink text",
      presentationSpeaker: "旁白",
    });
    expect(raw).toEqual({ text: GUEST_WAIT_TEXT, speaker: GUEST_WAIT_SPEAKER });
  });

  it("AI beat overrides authored Ink when not guest", () => {
    const raw = resolveRawDialogue({
      isGuestSpectator: false,
      remoteStory: remote,
      activeAiBeat: { speaker: "AI", text: "AI text" },
      snapshotText: "ink text",
      presentationSpeaker: "旁白",
    });
    expect(raw).toEqual({ text: "AI text", speaker: "AI" });
  });

  it("authored snapshot wins without AI beat", () => {
    const raw = resolveRawDialogue({
      isGuestSpectator: false,
      remoteStory: null,
      activeAiBeat: null,
      snapshotText: "ink text",
      presentationSpeaker: "旁白",
    });
    expect(raw).toEqual({ text: "ink text", speaker: "旁白" });
  });
});

describe("resolvePlaybackSource — guest projection", () => {
  it("projects scene title, meters, choices and typewriter enablement", () => {
    const projection = resolvePlaybackSource({
      isGuestSpectator: true,
      remoteStory: remote,
      aiPlaying: false,
      activeAiBeat: null,
      snapshotText: "ink",
      presentationSpeaker: "旁白",
      sceneTitle: "作者场景",
      snapshotSceneId: "ink-1",
      snapshotMianzi: 10,
      snapshotAiScore: 90,
      snapshotChoices: [{ index: 0, text: "作者选项", choiceId: "c1" }],
      aiBeatIndex: 0,
    });
    expect(projection.sceneTitle).toBe("远程场景");
    expect(projection.mianzi).toBe(40);
    expect(projection.ai_score).toBe(60);
    expect(projection.choices).toEqual([{ index: 0, text: "远程选项" }]);
    expect(projection.typewriterEnabled).toBe(true);
    expect(projection.remoteIsComplete).toBe(true);
  });

  it("guest wait title and meters fallback when no remote story", () => {
    expect(
      resolveSceneTitle({
        isGuestSpectator: true,
        remoteStory: null,
        aiPlaying: false,
        sceneTitle: "作者场景",
      }),
    ).toBe(GUEST_WAIT_SCENE_TITLE);

    const projection = resolvePlaybackSource({
      isGuestSpectator: true,
      remoteStory: null,
      aiPlaying: false,
      activeAiBeat: null,
      snapshotText: "ink",
      presentationSpeaker: "旁白",
      sceneTitle: "作者场景",
      snapshotSceneId: "ink-1",
      snapshotMianzi: 10,
      snapshotAiScore: 90,
      snapshotChoices: [{ index: 0, text: "作者选项" }],
      aiBeatIndex: 0,
    });
    expect(projection.mianzi).toBe(50);
    expect(projection.ai_score).toBe(50);
    expect(projection.choices).toEqual([]);
    expect(projection.typewriterEnabled).toBe(false);
  });

  it("AI scene title appends · AI for host", () => {
    expect(
      resolveSceneTitle({
        isGuestSpectator: false,
        remoteStory: null,
        aiPlaying: true,
        sceneTitle: "咖啡店",
      }),
    ).toBe("咖啡店 · AI");
  });
});

describe("resolvePlaybackSource — voice line keys", () => {
  it("uses guest / AI / Ink identity rules", () => {
    expect(
      resolveVoiceLineKey({
        isGuestSpectator: true,
        remoteStory: remote,
        aiPlaying: false,
        snapshotSceneId: "ink-1",
        snapshotText: "abcdefghijklmnopqrstuvwxyz",
        aiBeatIndex: 2,
      }),
    ).toBe("guest:remote-1:远程对白");

    expect(
      resolveVoiceLineKey({
        isGuestSpectator: false,
        remoteStory: null,
        aiPlaying: true,
        snapshotSceneId: "ink-1",
        snapshotText: "abcdefghijklmnopqrstuvwxyz",
        aiBeatIndex: 2,
      }),
    ).toBe("ai:ink-1:2");

    expect(
      resolveVoiceLineKey({
        isGuestSpectator: false,
        remoteStory: null,
        aiPlaying: false,
        snapshotSceneId: "ink-1",
        snapshotText: "abcdefghijklmnopqrstuvwxyz",
        aiBeatIndex: 0,
      }),
    ).toBe("ink:ink-1:abcdefghijklmnopqrstuvwx");
  });
});

describe("resolvePlaybackSource — dialogue complete + choices", () => {
  it("guest prefers remote completion flag", () => {
    expect(
      resolveDialogueComplete({
        isGuestSpectator: true,
        remoteIsComplete: true,
        typewriterComplete: false,
      }),
    ).toBe(true);
    expect(
      resolveDialogueComplete({
        isGuestSpectator: true,
        remoteIsComplete: undefined,
        typewriterComplete: false,
      }),
    ).toBe(false);
    expect(
      resolveDialogueComplete({
        isGuestSpectator: false,
        remoteIsComplete: true,
        typewriterComplete: false,
      }),
    ).toBe(false);
  });

  it("host panel choices stay on snapshot", () => {
    const choices = resolvePanelChoices({
      isGuestSpectator: false,
      remoteStory: remote,
      snapshotChoices: [{ index: 1, text: "作者", choiceId: "a" }],
    });
    expect(choices).toEqual([{ index: 1, text: "作者", choiceId: "a" }]);
  });
});

describe("resolveAutoplay", () => {
  const continueSnapshot = { choices: [{ index: 0, text: "继续", choiceId: null }] };
  const branchSnapshot = {
    choices: [
      { index: 0, text: "左", choiceId: null },
      { index: 1, text: "右", choiceId: null },
    ],
  };

  it("only fires for fully revealed authored continue-only scenes", () => {
    expect(
      resolveAutoplayEligibility({
        isGuestSpectator: false,
        aiPlaying: false,
        hasStoryInteraction: false,
        autoPlay: true,
        typewriterComplete: true,
        activeCutscene: false,
        snapshotIsEnded: false,
        snapshot: continueSnapshot,
      }),
    ).toBe(true);
  });

  it("blocks guest, AI, interaction, incomplete typewriter, cutscene, ended, non-continue", () => {
    const base = {
      isGuestSpectator: false,
      aiPlaying: false,
      hasStoryInteraction: false,
      autoPlay: true,
      typewriterComplete: true,
      activeCutscene: false,
      snapshotIsEnded: false,
      snapshot: continueSnapshot,
    };
    expect(resolveAutoplayEligibility({ ...base, isGuestSpectator: true })).toBe(false);
    expect(resolveAutoplayEligibility({ ...base, aiPlaying: true })).toBe(false);
    expect(resolveAutoplayEligibility({ ...base, hasStoryInteraction: true })).toBe(false);
    expect(resolveAutoplayEligibility({ ...base, typewriterComplete: false })).toBe(false);
    expect(resolveAutoplayEligibility({ ...base, activeCutscene: true })).toBe(false);
    expect(resolveAutoplayEligibility({ ...base, snapshotIsEnded: true })).toBe(false);
    expect(resolveAutoplayEligibility({ ...base, autoPlay: false })).toBe(false);
    expect(resolveAutoplayEligibility({ ...base, snapshot: branchSnapshot })).toBe(false);
  });

  it("uses exact 700 / 1100 / 1600 ms delays", () => {
    expect(resolveAutoplayDelayMs("fast")).toBe(700);
    expect(resolveAutoplayDelayMs("normal")).toBe(1100);
    expect(resolveAutoplayDelayMs("slow")).toBe(1600);
  });
});

describe("resolveDialogueHistory", () => {
  it("builds AI and authored stamps", () => {
    expect(
      buildDialogueLogStamp({
        aiPlaying: true,
        snapshotSceneId: "s1",
        aiBeatIndex: 1,
        displayText: "你好",
      }),
    ).toBe("ai:s1:1:你好");
    expect(
      buildDialogueLogStamp({
        aiPlaying: false,
        snapshotSceneId: "s1",
        aiBeatIndex: 0,
        displayText: "你好",
      }),
    ).toBe("s1:你好");
  });

  it("gates append on complete non-interaction dialogue", () => {
    expect(
      shouldConsiderDialogueLog({
        typewriterComplete: true,
        displayText: "hi",
        hasStoryInteraction: false,
      }),
    ).toBe(true);
    expect(
      shouldConsiderDialogueLog({
        typewriterComplete: false,
        displayText: "hi",
        hasStoryInteraction: false,
      }),
    ).toBe(false);
    expect(
      shouldConsiderDialogueLog({
        typewriterComplete: true,
        displayText: "hi",
        hasStoryInteraction: true,
      }),
    ).toBe(false);
  });

  it("preserves revealed / player / AI choice entry shapes", () => {
    expect(
      resolveRevealedDialogueEntry({
        displaySpeaker: "旁白",
        displayText: "夜色",
        aiPlaying: false,
        sceneTitle: "天台",
        snapshotSceneId: "s1",
      }),
    ).toEqual({
      speaker: "旁白",
      meta: "天台",
      text: "夜色",
      kind: "system",
    });
    expect(
      resolveRevealedDialogueEntry({
        displaySpeaker: "苏明",
        displayText: "灵感",
        aiPlaying: true,
        sceneTitle: "天台",
        snapshotSceneId: "s1",
      }),
    ).toEqual({
      speaker: "苏明",
      meta: "AI 旁支",
      text: "灵感",
      kind: "mystery",
    });
    expect(resolvePlayerChoiceHistoryEntry("继续")).toEqual({
      speaker: "你",
      meta: "选择",
      text: "继续",
      kind: "mystery",
    });
    expect(resolveAiChoiceHistoryEntry("换个说法")).toEqual({
      speaker: "你",
      meta: "AI 选择",
      text: "换个说法",
      kind: "mystery",
    });
  });
});

describe("resolveActiveAiBeat", () => {
  it("projects playing beat and index", () => {
    const slot: AiChoiceSlotState = {
      status: "playing",
      beatIndex: 1,
      result: {
        choiceLabel: "灵感",
        provider: "mock",
        rejoinSceneId: "rejoin",
        beats: [
          { speaker: "A", text: "1" },
          { speaker: "B", text: "2" },
        ],
      },
    };
    expect(resolveActiveAiBeat(slot)).toEqual({
      aiPlaying: true,
      activeAiBeat: { speaker: "B", text: "2" },
      aiBeatIndex: 1,
    });
    expect(resolveActiveAiBeat({ status: "idle" })).toEqual({
      aiPlaying: false,
      activeAiBeat: null,
      aiBeatIndex: 0,
    });
  });
});
