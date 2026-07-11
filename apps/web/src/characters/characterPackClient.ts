export class CharacterPackApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = "CharacterPackApiError";
  }
}

type GenerationInput = {
  readonly clientActionId: string;
  readonly kind: "human" | "robot";
  readonly prompt: string;
  readonly signal?: AbortSignal;
};

type ClientOptions = {
  readonly getAccessToken: () => Promise<string | null>;
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
};

export function createCharacterPackClient(options: ClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (options.baseUrl ?? "/api").replace(/\/$/, "");

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getAccessToken();
    if (!token) throw new CharacterPackApiError(401, "AUTH_REQUIRED");
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    } & T;
    if (!response.ok) {
      throw new CharacterPackApiError(
        response.status,
        payload.error ?? `HTTP_${response.status}`,
        payload.message,
      );
    }
    return payload;
  }

  function generationBody(input: GenerationInput) {
    return JSON.stringify({
      clientActionId: input.clientActionId,
      kind: input.kind,
      prompt: input.prompt,
    });
  }

  return {
    createPack(input: {
      clientPackId: string;
      slotId: string;
      brief: string;
      signal?: AbortSignal;
    }) {
      return request<Record<string, unknown>>("/ai/characters/packs", {
        method: "POST",
        body: JSON.stringify({
          clientPackId: input.clientPackId,
          slotId: input.slotId,
          brief: input.brief,
        }),
        signal: input.signal,
      });
    },
    listPacks(slotId?: string, signal?: AbortSignal) {
      const query = slotId ? `?slotId=${encodeURIComponent(slotId)}` : "";
      return request<{ packs: readonly Record<string, unknown>[] }>(
        `/ai/characters/packs${query}`,
        {
          signal,
        },
      );
    },
    getPack(packId: string, signal?: AbortSignal) {
      return request<{ pack: Record<string, unknown>; assets: readonly Record<string, unknown>[] }>(
        `/ai/characters/packs/${encodeURIComponent(packId)}`,
        { signal },
      );
    },
    async uploadReference(
      packId: string,
      clientReferenceId: string,
      file: File,
      signal?: AbortSignal,
    ) {
      const upload = await request<{
        assetId: string;
        storagePath: string;
        signedUrl: string;
        token: string;
      }>("/ai/characters/references/uploads", {
        method: "POST",
        body: JSON.stringify({
          packId,
          clientReferenceId,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
        signal,
      });
      const uploaded = await fetchImpl(upload.signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
        signal,
      });
      if (!uploaded.ok) {
        throw new CharacterPackApiError(uploaded.status, "REFERENCE_UPLOAD_FAILED");
      }
      return request<Record<string, unknown>>("/ai/characters/references/finalize", {
        method: "POST",
        body: JSON.stringify({
          assetId: upload.assetId,
          packId,
          storagePath: upload.storagePath,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
        signal,
      });
    },
    generateBase(packId: string, input: GenerationInput) {
      return request<{ asset: Record<string, unknown>; idempotent: boolean }>(
        `/ai/characters/packs/${encodeURIComponent(packId)}/base`,
        { method: "POST", body: generationBody(input), signal: input.signal },
      );
    },
    acceptBase(packId: string, signal?: AbortSignal) {
      return request<{ accepted: true }>(
        `/ai/characters/packs/${encodeURIComponent(packId)}/base/accept`,
        { method: "POST", signal },
      );
    },
    generateMoodPack(packId: string, input: GenerationInput) {
      return request<{ assets: readonly Record<string, unknown>[] }>(
        `/ai/characters/packs/${encodeURIComponent(packId)}/moods`,
        { method: "POST", body: generationBody(input), signal: input.signal },
      );
    },
    generateMood(packId: string, mood: string, input: GenerationInput) {
      return request<{ asset: Record<string, unknown>; idempotent: boolean }>(
        `/ai/characters/packs/${encodeURIComponent(packId)}/moods/${encodeURIComponent(mood)}`,
        { method: "POST", body: generationBody(input), signal: input.signal },
      );
    },
    deletePack(packId: string, signal?: AbortSignal) {
      return request<{ deletedObjects: number }>(
        `/ai/characters/packs/${encodeURIComponent(packId)}`,
        { method: "DELETE", signal },
      );
    },
    deleteReference(assetId: string, signal?: AbortSignal) {
      return request<{ deleted: boolean }>(
        `/ai/characters/references/${encodeURIComponent(assetId)}`,
        { method: "DELETE", signal },
      );
    },
  };
}
