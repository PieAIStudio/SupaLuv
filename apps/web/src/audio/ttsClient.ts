/**
 * Browser TTS client — always hits local/proxied edge (keys stay server-side).
 * Settings preview uses fixed previewId only (no free-form text).
 */

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

export async function requestTtsPreview(input: TtsPreviewRequest): Promise<TtsClientResult> {
  const endpoint =
    (import.meta.env.VITE_SUPALUV_TTS_PREVIEW_URL as string | undefined)?.trim() ||
    "/api/tts/preview";

  const response = await fetch(endpoint, {
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

  if (response.status === 401) {
    throw new Error("AUTH_REQUIRED");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `TTS preview failed (${response.status})`);
  }

  const json = (await response.json()) as TtsClientResult;
  if (!json.audioBase64) {
    throw new Error("TTS payload missing audio");
  }
  return json;
}

/**
 * @deprecated Prefer requestTtsPreview for UI. Free-form synthesize is server-gated.
 */
export async function requestDialogueTts(input: TtsClientRequest): Promise<TtsClientResult> {
  const endpoint =
    (import.meta.env.VITE_SUPALUV_TTS_URL as string | undefined)?.trim() || "/api/tts/synthesize";

  const response = await fetch(endpoint, {
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

  if (response.status === 401) {
    throw new Error("AUTH_REQUIRED");
  }
  if (response.status === 402) {
    throw new Error("INSUFFICIENT_BATTERIES");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `TTS failed (${response.status})`);
  }

  const json = (await response.json()) as TtsClientResult;
  if (!json.audioBase64) {
    throw new Error("TTS payload missing audio");
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
