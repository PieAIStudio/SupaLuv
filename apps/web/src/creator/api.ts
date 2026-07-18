import type { NarrativeGraphCreator, NarrativeSourceRange } from "@supaluv/shared/narrative-graph";
import type { ParsedSceneCard, SceneEditableFields } from "./server/sceneManifestEdit";

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

export interface CreatorSceneMeta {
  readonly speakers: readonly string[];
  readonly artKeys: readonly string[];
  readonly videoKeys: readonly string[];
  readonly sceneIds: readonly string[];
  readonly scenes: Readonly<
    Record<
      string,
      ParsedSceneCard & {
        readonly chapterId: string;
        readonly file: string;
        readonly sourceHash: string;
      }
    >
  >;
  readonly manifests: Readonly<Record<string, { readonly hash: string }>>;
}

export interface CreatorSceneSavePayload {
  readonly sceneId: string;
  readonly chapterId: string;
  readonly sourceHash: string;
  readonly fields: SceneEditableFields;
}

export type PipelineLogEvent =
  | { readonly type: "step_start"; readonly step: string; readonly command: string }
  | { readonly type: "stdout"; readonly step: string; readonly chunk: string }
  | { readonly type: "stderr"; readonly step: string; readonly chunk: string }
  | {
      readonly type: "step_end";
      readonly step: string;
      readonly ok: boolean;
      readonly exitCode: number | null;
    }
  | { readonly type: "done"; readonly ok: boolean }
  | { readonly type: "result"; readonly ok: boolean; readonly steps: readonly string[] }
  | { readonly type: "error"; readonly code?: string; readonly message: string };

export interface CreatorAssetRecord {
  readonly id: string;
  readonly kind: string;
  readonly path: string;
  readonly publicPath: string | null;
  readonly qualityStatus: string;
  readonly rightsStatus: string;
  readonly bytes: number | null;
  readonly notes: string;
  readonly sources: readonly ("intake" | "ledger")[];
  readonly sha256: string | null;
  readonly fileStatus: string | null;
  readonly ledgerReleaseStatus: string | null;
  readonly ledgerSource: string | null;
}

export interface CreatorAssetsPayload {
  readonly assets: readonly CreatorAssetRecord[];
  readonly kinds: readonly string[];
}

export interface CastingPortrait {
  readonly stem: string;
  readonly fileName: string;
  readonly publicPath: string;
}

export interface CastingCharacter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly side: string;
  readonly defaultPortrait: string;
  readonly voiceId: string | null;
  readonly portraits: readonly CastingPortrait[];
  readonly previewVoicePath: string | null;
  readonly previewVoiceKey: string | null;
}

export interface CastingDeskPayload {
  readonly characters: readonly CastingCharacter[];
  readonly voiceMap: Readonly<Record<string, string>>;
  readonly castIndexSource: "memory" | "static" | "generated";
}

export type CreatorTaskId = "asset-audit" | "auto-player" | "voice-reconcile";

export interface CreatorTaskDef {
  readonly id: CreatorTaskId;
  readonly label: string;
  readonly description: string;
}

export interface CreatorTasksPayload {
  readonly tasks: readonly CreatorTaskDef[];
  readonly busyTask: string | null;
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

export function fetchCreatorSceneMeta(): Promise<CreatorSceneMeta> {
  return requestCreator<CreatorSceneMeta>("/__creator-studio/scene-meta", { cache: "no-store" });
}

export function saveCreatorSource(payload: CreatorSavePayload): Promise<CreatorGraphEnvelope> {
  return requestCreator<CreatorGraphEnvelope>("/__creator-studio/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveCreatorScene(payload: CreatorSceneSavePayload): Promise<CreatorSceneMeta> {
  return requestCreator<CreatorSceneMeta>("/__creator-studio/save-scene", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function readNdjsonStream(
  response: Response,
  onEvent: (event: PipelineLogEvent) => void,
  fallbackStep: string,
): Promise<{ readonly ok: boolean }> {
  if (!response.ok || !response.body) {
    const body: unknown = await response.json().catch(() => null);
    const failure =
      body && typeof body === "object" && "error" in body
        ? (body as { readonly error?: { readonly code?: string; readonly message?: string } }).error
        : null;
    throw new CreatorApiError(
      failure?.code ?? "REQUEST_FAILED",
      failure?.message ?? `请求失败（HTTP ${response.status}）。`,
      response.status,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let ok = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as PipelineLogEvent;
        onEvent(event);
        if (event.type === "done" || event.type === "result") {
          ok = event.ok;
        }
      } catch {
        onEvent({ type: "stderr", step: fallbackStep, chunk: `${line}\n` });
      }
    }
  }
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer) as PipelineLogEvent;
      onEvent(event);
      if (event.type === "done" || event.type === "result") {
        ok = event.ok;
      }
    } catch {
      // ignore trailing partial
    }
  }
  return { ok };
}

export function fetchCreatorAssets(): Promise<CreatorAssetsPayload> {
  return requestCreator<CreatorAssetsPayload>("/__creator-studio/assets", { cache: "no-store" });
}

export function fetchCreatorCasting(): Promise<CastingDeskPayload> {
  return requestCreator<CastingDeskPayload>("/__creator-studio/casting", { cache: "no-store" });
}

export function fetchCreatorTasks(): Promise<CreatorTasksPayload> {
  return requestCreator<CreatorTasksPayload>("/__creator-studio/tasks", { cache: "no-store" });
}

export async function runCreatorPipeline(
  onEvent: (event: PipelineLogEvent) => void,
): Promise<{ readonly ok: boolean }> {
  const response = await fetch("/__creator-studio/pipeline", {
    method: "POST",
    headers: { accept: "application/x-ndjson", "content-type": "application/json" },
    body: "{}",
  });
  return readNdjsonStream(response, onEvent, "pipeline");
}

export async function runCreatorTask(
  taskId: CreatorTaskId,
  onEvent: (event: PipelineLogEvent) => void,
): Promise<{ readonly ok: boolean }> {
  const response = await fetch("/__creator-studio/task", {
    method: "POST",
    headers: { accept: "application/x-ndjson", "content-type": "application/json" },
    body: JSON.stringify({ taskId }),
  });
  return readNdjsonStream(response, onEvent, taskId);
}

/** Build a same-origin preview URL reusing prop-stage-fixture jumpTo. */
export function buildScenePreviewUrl(sceneId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("debug", "1");
  url.searchParams.set("prop-stage-fixture", "1");
  url.searchParams.set("creator-preview-scene", sceneId);
  url.hash = "";
  return url.toString();
}

export function openScenePreview(sceneId: string): void {
  // Prefer in-page jump when fixture already exposed (e2e / prop-stage sessions).
  const existing = (
    window as Window & {
      __SUPALUV_PROP_STAGE_TEST__?: { jumpTo?: (id: string) => void };
    }
  ).__SUPALUV_PROP_STAGE_TEST__;
  if (existing && typeof existing.jumpTo === "function") {
    existing.jumpTo(sceneId);
    return;
  }
  window.open(buildScenePreviewUrl(sceneId), "_blank", "noopener,noreferrer");
}
