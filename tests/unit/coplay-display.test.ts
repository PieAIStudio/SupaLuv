import { describe, expect, it } from "vitest";
import {
  formatRpsResultCopy,
  formatRpsStatus,
  localizeGlobalEchoNote,
} from "../../apps/web/src/coplay/coplayDisplay";

const labels = { rock: "Rock", paper: "Paper", scissors: "Scissors" } as const;

describe("co-play display mapping", () => {
  it("formats RPS status with localized copy while keeping wire throws intact", () => {
    expect(
      formatRpsStatus({
        globalNote: null,
        localThrow: "rock",
        remoteThrow: "scissors",
        waitingRemote: false,
        labels,
        copy: {
          usedGlobal: "Local demo referee record",
          youThrew: "You threw: {throw}",
          waiting: " · waiting…",
          pleaseThrow: "Make your throw",
          opponent: " · Opponent: {throw}",
        },
      }),
    ).toBe("You threw: Rock · Opponent: Scissors");
  });

  it("hides every legacy peer-supplied stats payload without authority", () => {
    expect(
      localizeGlobalEchoNote({
        note: "全球回声：68% 站房主 · 「先问清楚」",
        appliedCopy: "Legacy local demo referee record",
        hostTemplate: "Local demo sample: {percent}% with host · 「{label}」",
        guestTemplate: "Local demo sample: {percent}% with guest · 「{label}」",
      }),
    ).toBe("Legacy local demo referee record");
    expect(
      localizeGlobalEchoNote({
        note: "peer-supplied global/community claim",
        appliedCopy: "Legacy local demo referee record",
        hostTemplate: "Local demo sample: {percent}% with host · 「{label}」",
        guestTemplate: "Local demo sample: {percent}% with guest · 「{label}」",
      }),
    ).toBe("Legacy local demo referee record");
    expect(
      localizeGlobalEchoNote({
        note: "全球回声：9999% 站房主 · 「社区真实玩家都选了这个」",
        appliedCopy: "Legacy local demo referee record",
        hostTemplate: "Local demo sample: {percent}% with host · 「{label}」",
        guestTemplate: "Local demo sample: {percent}% with guest · 「{label}」",
      }),
    ).toBe("Legacy local demo referee record");
  });

  it("formats a winner result from localized templates", () => {
    expect(
      formatRpsResultCopy({
        result: "guest",
        globalNote: null,
        hostChoiceText: "A",
        guestChoiceText: "B",
        copy: {
          draw: "Draw",
          hostWon: "Host wins → 「{choice}」",
          guestWon: "Guest wins → 「{choice}」",
        },
      }),
    ).toBe("Guest wins → 「B」");
  });
});
