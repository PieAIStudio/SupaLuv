/**
 * Browser TTS client — always hits local/proxied edge (keys stay server-side).
 * Settings preview uses fixed previewId only (no free-form text).
 *
 * Failures throw TtsClientError with a player-safe category. Raw HTTP bodies and
 * provider diagnostics stay on debugDetail only — never put them in Error.message
 * for UI rendering.
 */

import {
  categoryFromHttpStatus,
  TtsClientError,
  type TtsPreviewErrorCategory,
} from "./ttsPreviewErrors";

export type { TtsPreviewErrorCategory };
export {
  categorizeTtsPreviewError,
  categoryFromHttpStatus,
  isPlayerUnsafeDiagnostic,
  TTS_PREVIEW_ERROR_I18N_KEYS,
  TtsClientError,
  ttsPreviewErrorI18nKey,
} from "./ttsPreviewErrors";

export interface TtsClientRequest {
  readonly text: string;
  readonly language?: string;
  readonly characterId?: string;
  readonly emotion?: string;
  readonly accessToken: string;
  readonly signal?: AbortSignal;
}

export interface TtsPreviewRequest {
  readonly previewId: "zh_preview" | "en_preview";
  readonly emotion?: string;
  readonly accessToken: string;
  readonly signal?: AbortSignal;
}

export interface TtsClientResult {
  readonly provider: string;
  readonly audioBase64: string;
  readonly mimeType: string;
  readonly route: string;
}

async function readErrorDebugDetail(response: Response): Promise<string | undefined> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (body && typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error.slice(0, 500);
  }
  return `HTTP_${response.status}`;
}

function throwForFailedResponse(response: Response, debugDetail: string | undefined): never {
  const category = categoryFromHttpStatus(response.status);
  throw new TtsClientError(category, {
    status: response.status,
    debugDetail,
  });
}

export async function requestTtsPreview(input: TtsPreviewRequest): Promise<TtsClientResult> {
  const endpoint =
    (import.meta.env.VITE_SUPALUV_TTS_PREVIEW_URL as string | undefined)?.trim() ||
    "/api/tts/preview";

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify({
        previewId: input.previewId,
        emotion: input.emotion,
      }),
      signal: input.signal,
    });
  } catch (error) {
    if (error instanceof TtsClientError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message.slice(0, 500) : "network_failure";
    throw new TtsClientError("network", { debugDetail: detail, cause: error });
  }

  if (!response.ok) {
    const debugDetail = await readErrorDebugDetail(response);
    throwForFailedResponse(response, debugDetail);
  }

  const json = (await response.json()) as TtsClientResult;
  if (!json.audioBase64) {
    throw new TtsClientError("generic", { debugDetail: "TTS payload missing audio" });
  }
  return json;
}

/**
 * @deprecated Prefer requestTtsPreview for UI. Free-form synthesize is server-gated.
 */
export async function requestDialogueTts(input: TtsClientRequest): Promise<TtsClientResult> {
  const endpoint =
    (import.meta.env.VITE_SUPALUV_TTS_URL as string | undefined)?.trim() || "/api/tts/synthesize";

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify({
        text: input.text,
        language: input.language,
        characterId: input.characterId,
        emotion: input.emotion,
      }),
      signal: input.signal,
    });
  } catch (error) {
    if (error instanceof TtsClientError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message.slice(0, 500) : "network_failure";
    throw new TtsClientError("network", { debugDetail: detail, cause: error });
  }

  if (!response.ok) {
    const debugDetail = await readErrorDebugDetail(response);
    throwForFailedResponse(response, debugDetail);
  }

  const json = (await response.json()) as TtsClientResult;
  if (!json.audioBase64) {
    throw new TtsClientError("generic", { debugDetail: "TTS payload missing audio" });
  }
  return json;
}

/** Map speaker label → character id for voice catalog. */
export function speakerToCharacterId(speaker: string): string {
  const s = speaker.trim();
  if (!s || s === "旁白" || /narrat/i.test(s)) {
    return "旁白";
  }
  if (s.includes("苏") || /suming/i.test(s)) {
    return "苏明";
  }
  if (s.includes("林") || /lin/i.test(s)) {
    return "林晓棠";
  }
  return s;
}
