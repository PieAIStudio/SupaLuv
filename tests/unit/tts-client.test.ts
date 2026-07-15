import { describe, expect, it } from "vitest";
import { parseSafeTtsClip, speakerToCharacterId } from "../../apps/web/src/audio/ttsClient";

describe("browser TTS trust boundary", () => {
  it("returns only validated playable fields and discards provider metadata", () => {
    expect(
      parseSafeTtsClip({
        audioBase64: "YQ==",
        mimeType: "audio/mpeg",
        provider: "not-browser-contract",
        route: "not-browser-contract",
        raw: { secret: "not-forwarded" },
      }),
    ).toEqual({ audioBase64: "YQ==", mimeType: "audio/mpeg" });
  });

  it("rejects malformed base64 and unsupported media types", () => {
    expect(() => parseSafeTtsClip({ audioBase64: "not base64", mimeType: "audio/mpeg" })).toThrow(
      /safe audio/,
    );
    expect(() => parseSafeTtsClip({ audioBase64: "YQ==", mimeType: "text/html" })).toThrow(
      /unsupported/,
    );
  });

  it("maps core cast labels to stable catalog IDs with narrator fallback", () => {
    expect(speakerToCharacterId("雷欧")).toBe("leo");
    expect(speakerToCharacterId("Léo")).toBe("leo");
    expect(speakerToCharacterId("工作人员")).toBe("staff_worker");
    expect(speakerToCharacterId("unknown provider id")).toBe("narrator");
  });
});
