import { describe, expect, it } from "vitest";
import {
  createCursorPayload,
  parseCursorPayload,
  shouldPublishCursor,
} from "../../apps/web/src/coplay/cursorPresence";
import { makeRoomCode, normalizeRoomCode, parseEnvelope } from "../../apps/web/src/coplay/protocol";

describe("coplay cursor presence", () => {
  it("parses and rejects bad payloads", () => {
    const good = createCursorPayload({
      playerId: "p1",
      alias: "房主",
      xNorm: 0.5,
      yNorm: 0.25,
      isHost: true,
      updatedAtMs: 1000,
    });
    expect(parseCursorPayload(good)?.alias).toBe("房主");
    expect(parseCursorPayload({ version: 1 })).toBeNull();
  });

  it("throttles tiny moves within interval", () => {
    const a = createCursorPayload({
      playerId: "p1",
      alias: "A",
      xNorm: 0.1,
      yNorm: 0.1,
      isHost: false,
      updatedAtMs: 1000,
    });
    const b = createCursorPayload({
      playerId: "p1",
      alias: "A",
      xNorm: 0.101,
      yNorm: 0.1,
      isHost: false,
      updatedAtMs: 1050,
    });
    expect(
      shouldPublishCursor({
        next: b,
        previous: a,
        nowMs: 1050,
        minIntervalMs: 120,
        minMove: 0.012,
      }),
    ).toBe(false);
    expect(
      shouldPublishCursor({
        next: b,
        previous: a,
        nowMs: 1200,
        minIntervalMs: 120,
        minMove: 0.012,
      }),
    ).toBe(true);
  });

  it("normalizes room codes", () => {
    expect(normalizeRoomCode(" ab-3k ")).toBe("AB3K");
    expect(makeRoomCode()).toHaveLength(4);
  });

  it("parses story envelope", () => {
    const env = parseEnvelope({
      roomCode: "AB3K",
      fromPlayerId: "host-1",
      payload: {
        version: 1,
        kind: "story",
        sceneId: "s1",
        sceneTitle: "夜",
        speaker: "苏明",
        text: "hi",
        isComplete: true,
        isEnded: false,
        choices: [{ index: 0, text: "继续" }],
        mianzi: 40,
        ai_score: 60,
        aiMode: false,
        hostAlias: "房主",
        updatedAtMs: 1,
      },
    });
    expect(env?.payload && "kind" in env.payload && env.payload.kind === "story").toBe(true);
  });
});
