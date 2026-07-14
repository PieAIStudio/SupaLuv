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
          usedGlobal: "Global referee applied",
          youThrew: "You threw: {throw}",
          waiting: " · waiting…",
          pleaseThrow: "Make your throw",
          opponent: " · Opponent: {throw}",
        },
      }),
    ).toBe("You threw: Rock · Opponent: Scissors");
  });

  it("translates legacy global-echo notes without altering unknown payloads", () => {
    expect(
      localizeGlobalEchoNote({
        note: "全球回声：68% 站房主 · 「先问清楚」",
        appliedCopy: "Global echo referee applied",
        hostTemplate: "Global echo: {percent}% with host · 「{label}」",
        guestTemplate: "Global echo: {percent}% with guest · 「{label}」",
      }),
    ).toBe("Global echo: 68% with host · 「先问清楚」");
    expect(
      localizeGlobalEchoNote({
        note: "server-supplied note",
        appliedCopy: "Global echo referee applied",
        hostTemplate: "Global echo: {percent}% with host · 「{label}」",
        guestTemplate: "Global echo: {percent}% with guest · 「{label}」",
      }),
    ).toBe("server-supplied note");
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
