import { afterEach, describe, expect, it, vi } from "vitest";
import {
  categorizeTtsPreviewError,
  categoryFromHttpStatus,
  isPlayerUnsafeDiagnostic,
  requestTtsPreview,
  TTS_PREVIEW_ERROR_I18N_KEYS,
  TtsClientError,
  ttsPreviewErrorI18nKey,
} from "../../apps/web/src/audio/ttsClient";
import { lookupMessage, messagesFor } from "../../apps/web/src/i18n/catalog";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const HOSTILE_502_BODY =
  "MiniMax provider stack: InternalServerError at openrouter gateway /v1/tts ECONNRESET";

describe("TTS preview player-safe error categories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps HTTP statuses to stable categories", () => {
    expect(categoryFromHttpStatus(401)).toBe("unauthenticated");
    expect(categoryFromHttpStatus(403)).toBe("unauthenticated");
    expect(categoryFromHttpStatus(402)).toBe("insufficient_balance");
    expect(categoryFromHttpStatus(502)).toBe("upstream");
    expect(categoryFromHttpStatus(503)).toBe("upstream");
    expect(categoryFromHttpStatus(500)).toBe("upstream");
    expect(categoryFromHttpStatus(400)).toBe("generic");
    expect(categoryFromHttpStatus(418)).toBe("generic");
  });

  it("throws unauthenticated for 401 without leaking body text into Error.message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { error: "jwt expired signature MiniMax" })),
    );

    await expect(
      requestTtsPreview({
        previewId: "zh_preview",
        accessToken: "token",
      }),
    ).rejects.toMatchObject({
      name: "TtsClientError",
      category: "unauthenticated",
      status: 401,
      message: "TTS_UNAUTHENTICATED",
    });

    try {
      await requestTtsPreview({ previewId: "zh_preview", accessToken: "token" });
    } catch (error) {
      expect(error).toBeInstanceOf(TtsClientError);
      const clientError = error as TtsClientError;
      expect(clientError.message).not.toMatch(/jwt|MiniMax|signature/i);
      expect(clientError.debugDetail).toMatch(/jwt|MiniMax/i);
      expect(isPlayerUnsafeDiagnostic(clientError.debugDetail ?? "")).toBe(true);
    }
  });

  it("throws insufficient_balance for 402", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(402, { error: "INSUFFICIENT_BATTERIES wallet ledger x" })),
    );

    await expect(
      requestTtsPreview({ previewId: "en_preview", accessToken: "token" }),
    ).rejects.toMatchObject({
      category: "insufficient_balance",
      status: 402,
      message: "TTS_INSUFFICIENT_BALANCE",
    });
  });

  it("maps 502 hostile provider/internal bodies to upstream without player-visible diagnostics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(502, { error: HOSTILE_502_BODY })),
    );

    try {
      await requestTtsPreview({ previewId: "zh_preview", accessToken: "token" });
      expect.unreachable("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TtsClientError);
      const clientError = error as TtsClientError;
      expect(clientError.category).toBe("upstream");
      expect(clientError.status).toBe(502);
      expect(clientError.message).toBe("TTS_UPSTREAM");
      expect(clientError.message).not.toContain("MiniMax");
      expect(clientError.message).not.toContain("openrouter");
      expect(clientError.message).not.toContain("stack");
      expect(clientError.debugDetail).toBe(HOSTILE_502_BODY);

      const playerKey = ttsPreviewErrorI18nKey(clientError.category);
      for (const locale of ["en", "zh-CN"] as const) {
        const copy = lookupMessage(messagesFor(locale), playerKey);
        expect(copy, locale).toBeTruthy();
        expect(copy).not.toMatch(/minimax|elevenlabs|openrouter|stack|ECONN|provider/i);
        expect(copy).not.toContain(HOSTILE_502_BODY);
      }
    }
  });

  it("maps network/timeout failures to network category", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(
      requestTtsPreview({ previewId: "zh_preview", accessToken: "token" }),
    ).rejects.toMatchObject({
      category: "network",
      message: "TTS_NETWORK",
    });

    expect(categorizeTtsPreviewError(new DOMException("Aborted", "AbortError"))).toBe("network");
    expect(categorizeTtsPreviewError(new Error("Network request timed out"))).toBe("network");
  });

  it("falls back to generic for unknown failures", () => {
    expect(categorizeTtsPreviewError(new Error("something odd"))).toBe("generic");
    expect(categorizeTtsPreviewError("string-throw")).toBe("generic");
    expect(categorizeTtsPreviewError(null)).toBe("generic");
  });

  it("exposes localized player-safe copy for every category in en and zh-CN", () => {
    const categories = Object.keys(TTS_PREVIEW_ERROR_I18N_KEYS) as Array<
      keyof typeof TTS_PREVIEW_ERROR_I18N_KEYS
    >;
    for (const category of categories) {
      const key = ttsPreviewErrorI18nKey(category);
      for (const locale of ["en", "zh-CN"] as const) {
        const copy = lookupMessage(messagesFor(locale), key);
        expect(copy, `${locale}:${key}`).toBeTruthy();
        expect(typeof copy).toBe("string");
        expect(copy!.length).toBeGreaterThan(4);
        expect(isPlayerUnsafeDiagnostic(copy!)).toBe(false);
      }
    }
  });

  it("never puts arbitrary Error.message into i18n keys used by Settings preview UI", () => {
    const keys = Object.values(TTS_PREVIEW_ERROR_I18N_KEYS);
    expect(keys).toEqual(
      expect.arrayContaining([
        "settings.previewErrorUnauthenticated",
        "settings.previewErrorInsufficientBalance",
        "settings.previewErrorUpstream",
        "settings.previewErrorNetwork",
        "settings.previewErrorGeneric",
      ]),
    );
    // SettingsPlayerSection must only call t(ttsPreviewErrorI18nKey(category)).
    for (const key of keys) {
      expect(key.startsWith("settings.previewError")).toBe(true);
    }
  });
});
