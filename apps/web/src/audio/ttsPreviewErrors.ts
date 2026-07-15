/**
 * Player-safe TTS preview error categories.
 * UI must only show localized copy keyed by category — never raw provider/backend bodies.
 */

export type TtsPreviewErrorCategory =
  | "unauthenticated"
  | "insufficient_balance"
  | "upstream"
  | "network"
  | "generic";

/** Stable i18n paths under settings.* — both en and zh-CN must define these leaves. */
export const TTS_PREVIEW_ERROR_I18N_KEYS: Readonly<Record<TtsPreviewErrorCategory, string>> = {
  unauthenticated: "settings.previewErrorUnauthenticated",
  insufficient_balance: "settings.previewErrorInsufficientBalance",
  upstream: "settings.previewErrorUpstream",
  network: "settings.previewErrorNetwork",
  generic: "settings.previewErrorGeneric",
};

/**
 * Structured client error. `message` is a stable category token for logs, not player copy.
 * `debugDetail` may hold status/body snippets for DEV console only — never render it.
 */
export class TtsClientError extends Error {
  readonly category: TtsPreviewErrorCategory;
  readonly status: number | undefined;
  readonly debugDetail: string | undefined;

  constructor(
    category: TtsPreviewErrorCategory,
    options?: {
      readonly status?: number;
      readonly debugDetail?: string;
      readonly cause?: unknown;
    },
  ) {
    super(`TTS_${category.toUpperCase()}`);
    this.name = "TtsClientError";
    this.category = category;
    this.status = options?.status;
    this.debugDetail = options?.debugDetail;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function categoryFromHttpStatus(status: number): TtsPreviewErrorCategory {
  if (status === 401 || status === 403) {
    return "unauthenticated";
  }
  if (status === 402) {
    return "insufficient_balance";
  }
  if (status === 502 || status === 503 || status === 504 || status >= 500) {
    return "upstream";
  }
  return "generic";
}

/** Classify any thrown value from the TTS preview path into a player-safe category. */
export function categorizeTtsPreviewError(error: unknown): TtsPreviewErrorCategory {
  if (error instanceof TtsClientError) {
    return error.category;
  }

  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return "network";
    }
  }

  if (error instanceof TypeError) {
    return "network";
  }

  if (error instanceof Error) {
    const message = error.message;
    if (
      message === "AUTH_REQUIRED" ||
      /unauthori[sz]ed|not authenticated|login required/i.test(message)
    ) {
      return "unauthenticated";
    }
    if (message === "INSUFFICIENT_BATTERIES" || /insufficient|402/i.test(message)) {
      return "insufficient_balance";
    }
    if (
      message === "Failed to fetch" ||
      /network|timeout|timed out|ECONNRESET|ENOTFOUND|fetch failed/i.test(message)
    ) {
      return "network";
    }
    if (/502|503|504|upstream|provider|bad gateway/i.test(message)) {
      return "upstream";
    }
  }

  return "generic";
}

export function ttsPreviewErrorI18nKey(category: TtsPreviewErrorCategory): string {
  return TTS_PREVIEW_ERROR_I18N_KEYS[category];
}

/** Strip accidental diagnostic fragments if a string ever reaches mapping code. */
export function isPlayerUnsafeDiagnostic(text: string): boolean {
  return (
    /minimax|elevenlabs|openrouter|stack trace|traceback|internal server|provider|ECONN|ENOENT|at\s+\S+\s+\(/i.test(
      text,
    ) || /[{[]/.test(text)
  );
}
