/**
 * Browser TTS client. Provider selection and credentials remain server-side;
 * browser callers receive only a validated playable clip.
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
  readonly audioBase64: string;
  readonly mimeType: string;
}

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
]);
const MAX_AUDIO_BASE64_LENGTH = 24_000_000;

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
  return requestTtsClip(endpoint, {
    previewId: input.previewId,
    emotion: input.emotion,
    accessToken: input.accessToken,
    signal: input.signal,
  });
}

export async function requestDialogueTts(input: TtsClientRequest): Promise<TtsClientResult> {
  const endpoint =
    (import.meta.env.VITE_SUPALUV_TTS_URL as string | undefined)?.trim() || "/api/tts/synthesize";
  return requestTtsClip(endpoint, {
    text: input.text,
    language: input.language,
    characterId: input.characterId,
    emotion: input.emotion,
    accessToken: input.accessToken,
    signal: input.signal,
  });
}

async function requestTtsClip(
  endpoint: string,
  input: {
    readonly text?: string;
    readonly language?: string;
    readonly characterId?: string;
    readonly previewId?: "zh_preview" | "en_preview";
    readonly emotion?: string;
    readonly accessToken: string;
    readonly signal?: AbortSignal;
  },
): Promise<TtsClientResult> {
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

  try {
    return parseSafeTtsClip(await response.json());
  } catch (error) {
    if (error instanceof TtsClientError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message.slice(0, 500) : "invalid_tts_payload";
    throw new TtsClientError("generic", { debugDetail: detail, cause: error });
  }
}

export function parseSafeTtsClip(value: unknown): TtsClientResult {
  if (!value || typeof value !== "object") {
    throw new Error("TTS payload invalid");
  }
  const raw = value as { audioBase64?: unknown; mimeType?: unknown };
  const audioBase64 = typeof raw.audioBase64 === "string" ? raw.audioBase64.trim() : "";
  const mimeType = typeof raw.mimeType === "string" ? raw.mimeType.trim().toLowerCase() : "";
  if (
    !audioBase64 ||
    audioBase64.length > MAX_AUDIO_BASE64_LENGTH ||
    audioBase64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(audioBase64)
  ) {
    throw new Error("TTS payload missing safe audio");
  }
  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    throw new Error("TTS payload has unsupported audio type");
  }
  return { audioBase64, mimeType };
}

/** Stable speaker label → server voice-catalog character id. */
export function speakerToCharacterId(speaker: string): string {
  const normalized = normalizeSpeaker(speaker);
  if (!normalized || normalized === "旁白" || normalized === "narrator") {
    return "narrator";
  }
  const aliases: Readonly<Record<string, string>> = {
    苏明: "suming",
    suming: "suming",
    雷欧: "leo",
    leo: "leo",
    陈佳: "chen_jia",
    chenjia: "chen_jia",
    石佩欣: "shi_peixin",
    shipeixin: "shi_peixin",
    工作人员: "staff_worker",
    staffworker: "staff_worker",
    小组长: "staff_lead",
    stafflead: "staff_lead",
    老板娘: "shop_owner",
    shopowner: "shop_owner",
    ai: "test_ai",
    testai: "test_ai",
    林晓棠: "lin_xiaotang",
    linxiaotang: "lin_xiaotang",
    周鹿: "zhou_lu",
    zhoulu: "zhou_lu",
  };
  return aliases[normalized] ?? "narrator";
}

function normalizeSpeaker(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[\s_\-.'’]/gu, "");
}
