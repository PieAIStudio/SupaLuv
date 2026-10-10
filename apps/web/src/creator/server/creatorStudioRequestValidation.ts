/**
 * Thin request-body validation for Creator Studio write endpoints.
 * Machine-readable 4xx only — never silent success or uncaught 500 for bad input.
 */

import {
  CreatorStudioError,
  type CreatorSaveRequest,
  type CreatorSceneSaveRequest,
} from "./creatorStudioServer";
import { isCreatorTaskId, type CreatorTaskId } from "./creatorTasks";
import type { SceneAiBranchFields, SceneEditableFields } from "./sceneManifestEdit";

const MAX_ID_LEN = 128;
const MAX_HASH_LEN = 64;
const MAX_PATH_LEN = 512;
const MAX_FIELD_STRING = 256;
const MAX_TEXT_LEN = 8000;
const MAX_REPLACEMENT_LEN = 32_000;

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CreatorStudioError("INVALID_REQUEST", `${label} 必须是 JSON 对象。`, 400);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, name: string, maxLen: number): string {
  if (typeof value !== "string") {
    throw new CreatorStudioError("INVALID_REQUEST", `${name} 必须是字符串。`, 400);
  }
  if (value.trim() === "") {
    throw new CreatorStudioError("INVALID_REQUEST", `${name} 不能为空。`, 400);
  }
  if (value.length > maxLen) {
    throw new CreatorStudioError(
      "INVALID_REQUEST",
      `${name} 超过最大长度 ${maxLen}（实际 ${value.length}）。`,
      400,
    );
  }
  return value;
}

function optionalStringField(value: unknown, name: string, maxLen: number): string | undefined {
  if (value === undefined) return undefined;
  return requireNonEmptyString(value, name, maxLen);
}

function parseAiBranch(value: unknown): SceneAiBranchFields | null {
  if (value === null) return null;
  const obj = requireObject(value, "fields.aiBranch");
  if (obj.enabled !== true) {
    throw new CreatorStudioError("INVALID_REQUEST", "fields.aiBranch.enabled 必须为 true。", 400);
  }
  const rejoinSceneId = requireNonEmptyString(
    obj.rejoinSceneId,
    "fields.aiBranch.rejoinSceneId",
    MAX_ID_LEN,
  );
  const context = requireNonEmptyString(obj.context, "fields.aiBranch.context", MAX_TEXT_LEN);
  const waitLabel = optionalStringField(
    obj.waitLabel,
    "fields.aiBranch.waitLabel",
    MAX_FIELD_STRING,
  );
  let maxAiBeats: number | undefined;
  if (obj.maxAiBeats !== undefined) {
    if (
      typeof obj.maxAiBeats !== "number" ||
      !Number.isInteger(obj.maxAiBeats) ||
      obj.maxAiBeats < 1
    ) {
      throw new CreatorStudioError(
        "INVALID_REQUEST",
        "fields.aiBranch.maxAiBeats 必须是正整数。",
        400,
      );
    }
    maxAiBeats = obj.maxAiBeats;
  }
  const stringPools: Partial<
    Record<"artPool" | "portraitPool" | "speakerPool", readonly string[]>
  > = {};
  for (const key of ["artPool", "portraitPool", "speakerPool"] as const) {
    if (obj[key] === undefined) continue;
    if (!Array.isArray(obj[key]) || obj[key].some((item) => typeof item !== "string")) {
      throw new CreatorStudioError(
        "INVALID_REQUEST",
        `fields.aiBranch.${key} 必须是字符串数组。`,
        400,
      );
    }
    stringPools[key] = obj[key] as readonly string[];
  }
  return {
    enabled: true,
    rejoinSceneId,
    context,
    ...(waitLabel !== undefined ? { waitLabel } : {}),
    ...(maxAiBeats !== undefined ? { maxAiBeats } : {}),
    ...stringPools,
  };
}

function parseSceneEditableFields(value: unknown): SceneEditableFields {
  const obj = requireObject(value, "fields");
  const allowed = new Set(["speaker", "artKey", "videoKey", "aiBranch"]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new CreatorStudioError(
        "INVALID_REQUEST",
        `fields 含未知键 ${key}；允许：speaker, artKey, videoKey, aiBranch。`,
        400,
      );
    }
  }
  const fields: {
    speaker?: string;
    artKey?: string;
    videoKey?: string;
    aiBranch?: SceneAiBranchFields | null;
  } = {};
  if (obj.speaker !== undefined) {
    fields.speaker = requireNonEmptyString(obj.speaker, "fields.speaker", MAX_FIELD_STRING);
  }
  if (obj.artKey !== undefined) {
    fields.artKey = requireNonEmptyString(obj.artKey, "fields.artKey", MAX_FIELD_STRING);
  }
  if (obj.videoKey !== undefined) {
    fields.videoKey = requireNonEmptyString(obj.videoKey, "fields.videoKey", MAX_FIELD_STRING);
  }
  if (obj.aiBranch !== undefined) {
    fields.aiBranch = parseAiBranch(obj.aiBranch);
  }
  return fields;
}

/** Validate POST /save-scene body → typed request or INVALID_REQUEST 400. */
export function parseSceneSaveRequest(body: unknown): CreatorSceneSaveRequest {
  const obj = requireObject(body, "请求体");
  for (const key of ["sceneId", "chapterId", "sourceHash", "fields"] as const) {
    if (!(key in obj)) {
      throw new CreatorStudioError("INVALID_REQUEST", `缺少字段 ${key}。`, 400);
    }
  }
  const sceneId = requireNonEmptyString(obj.sceneId, "sceneId", MAX_ID_LEN);
  const chapterId = requireNonEmptyString(obj.chapterId, "chapterId", MAX_ID_LEN);
  const sourceHash = requireNonEmptyString(obj.sourceHash, "sourceHash", MAX_HASH_LEN);
  if (!/^[a-f0-9]{64}$/i.test(sourceHash)) {
    throw new CreatorStudioError(
      "INVALID_REQUEST",
      "sourceHash 必须是 64 位十六进制 sha256。",
      400,
    );
  }
  const fields = parseSceneEditableFields(obj.fields);
  return {
    sceneId,
    chapterId,
    sourceHash: sourceHash.toLowerCase(),
    fields,
  };
}

/** Validate POST /task body. */
export function parseTaskRequest(body: unknown): { readonly taskId: CreatorTaskId } {
  const obj = requireObject(body, "请求体");
  if (!("taskId" in obj)) {
    throw new CreatorStudioError("INVALID_REQUEST", "缺少字段 taskId。", 400);
  }
  if (typeof obj.taskId !== "string") {
    throw new CreatorStudioError("INVALID_REQUEST", "taskId 必须是字符串。", 400);
  }
  if (obj.taskId.length > MAX_ID_LEN) {
    throw new CreatorStudioError("INVALID_REQUEST", `taskId 超过最大长度 ${MAX_ID_LEN}。`, 400);
  }
  if (!isCreatorTaskId(obj.taskId)) {
    throw new CreatorStudioError(
      "INVALID_REQUEST",
      "taskId 必须是 asset-audit | auto-player | voice-reconcile。",
      400,
    );
  }
  return { taskId: obj.taskId };
}

/** Validate POST /pipeline body (optional empty object). */
export function parsePipelineRequest(body: unknown): void {
  if (body === undefined || body === null) return;
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new CreatorStudioError(
      "INVALID_REQUEST",
      "pipeline 请求体必须是 JSON 对象（可 {}）或省略。",
      400,
    );
  }
}

/** Validate POST /save (Ink) body. */
export function parseInkSaveRequest(body: unknown): CreatorSaveRequest {
  const obj = requireObject(body, "请求体");
  for (const key of [
    "file",
    "revision",
    "sourceHash",
    "sourceRange",
    "originalText",
    "replacement",
  ] as const) {
    if (!(key in obj)) {
      throw new CreatorStudioError("INVALID_REQUEST", `缺少字段 ${key}。`, 400);
    }
  }
  const file = requireNonEmptyString(obj.file, "file", MAX_PATH_LEN);
  const revision = requireNonEmptyString(obj.revision, "revision", MAX_HASH_LEN * 2);
  const sourceHash = requireNonEmptyString(obj.sourceHash, "sourceHash", MAX_HASH_LEN);
  if (!/^[a-f0-9]{64}$/i.test(sourceHash)) {
    throw new CreatorStudioError(
      "INVALID_REQUEST",
      "sourceHash 必须是 64 位十六进制 sha256。",
      400,
    );
  }
  if (typeof obj.originalText !== "string") {
    throw new CreatorStudioError("INVALID_REQUEST", "originalText 必须是字符串。", 400);
  }
  if (obj.originalText.length > MAX_REPLACEMENT_LEN) {
    throw new CreatorStudioError("INVALID_REQUEST", "originalText 超过最大长度。", 400);
  }
  if (typeof obj.replacement !== "string") {
    throw new CreatorStudioError("INVALID_REQUEST", "replacement 必须是字符串。", 400);
  }
  if (obj.replacement.length > MAX_REPLACEMENT_LEN) {
    throw new CreatorStudioError("INVALID_REQUEST", "replacement 超过最大长度。", 400);
  }
  const range = requireObject(obj.sourceRange, "sourceRange");
  if (
    typeof range.startLine !== "number" ||
    !Number.isInteger(range.startLine) ||
    range.startLine < 1
  ) {
    throw new CreatorStudioError(
      "INVALID_REQUEST",
      "sourceRange.startLine 必须是 ≥1 的整数。",
      400,
    );
  }
  if (typeof range.endLine !== "number" || !Number.isInteger(range.endLine) || range.endLine < 1) {
    throw new CreatorStudioError("INVALID_REQUEST", "sourceRange.endLine 必须是 ≥1 的整数。", 400);
  }
  if (range.endLine < range.startLine) {
    throw new CreatorStudioError(
      "INVALID_REQUEST",
      "sourceRange.endLine 不能小于 startLine。",
      400,
    );
  }
  return {
    file,
    revision,
    sourceHash: sourceHash.toLowerCase(),
    sourceRange: { startLine: range.startLine, endLine: range.endLine },
    originalText: obj.originalText,
    replacement: obj.replacement,
  };
}
