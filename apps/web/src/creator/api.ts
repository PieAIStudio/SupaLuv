import type { NarrativeGraphCreator, NarrativeSourceRange } from "@supaluv/shared/narrative-graph";

export interface CreatorGraphEnvelope {
  readonly graph: NarrativeGraphCreator;
  readonly sources: Readonly<Record<string, { readonly hash: string }>>;
}

export interface CreatorSavePayload {
  readonly file: string;
  readonly revision: string;
  readonly sourceHash: string;
  readonly sourceRange: Pick<NarrativeSourceRange, "startLine" | "endLine">;
  readonly originalText: string;
  readonly replacement: string;
}

export class CreatorApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "CreatorApiError";
    this.code = code;
    this.status = status;
  }
}

async function requestCreator<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure =
      body && typeof body === "object" && "error" in body
        ? (body as { readonly error?: { readonly code?: string; readonly message?: string } }).error
        : null;
    throw new CreatorApiError(
      failure?.code ?? "REQUEST_FAILED",
      failure?.message ?? `Creator Studio 请求失败（HTTP ${response.status}）。`,
      response.status,
    );
  }
  return body as T;
}

export function fetchCreatorGraph(): Promise<CreatorGraphEnvelope> {
  return requestCreator<CreatorGraphEnvelope>("/__creator-studio/graph", { cache: "no-store" });
}

export function saveCreatorSource(payload: CreatorSavePayload): Promise<CreatorGraphEnvelope> {
  return requestCreator<CreatorGraphEnvelope>("/__creator-studio/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
