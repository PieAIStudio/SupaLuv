/**
 * OpenAPI 3.1 document builder for Creator Studio.
 * Generated from CREATOR_STUDIO_ENDPOINT_SPECS + workflows/invariants (SSOT).
 * Served at GET /__creator-studio/openapi.json.
 */

import {
  CREATOR_STUDIO_BASE_PATH,
  CREATOR_STUDIO_ENDPOINT_SPECS,
  CREATOR_STUDIO_ERROR_CODES,
  CREATOR_STUDIO_INVARIANTS,
  CREATOR_STUDIO_PRODUCT,
  CREATOR_STUDIO_WORKFLOWS,
  type CreatorStudioEndpointSpec,
  type CreatorStudioFieldShape,
} from "./creatorStudioDescribe";
import { CREATOR_TASK_DEFS } from "./creatorTasks";

export const CREATOR_STUDIO_OPENAPI_PATH = `${CREATOR_STUDIO_BASE_PATH}/openapi.json`;

/** JSON Schema fragment (OpenAPI 3.1 dialect — plain JSON Schema). */
type JsonSchema = Record<string, unknown>;

export interface CreatorStudioOpenApiDocument {
  readonly openapi: "3.1.0";
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly servers: readonly { readonly url: string; readonly description: string }[];
  readonly paths: Record<string, Record<string, unknown>>;
  readonly components: {
    readonly schemas: Record<string, JsonSchema>;
  };
  readonly "x-supaluv-workflows": typeof CREATOR_STUDIO_WORKFLOWS;
  readonly "x-supaluv-invariants": typeof CREATOR_STUDIO_INVARIANTS;
  readonly "x-supaluv-error-codes": readonly {
    readonly code: string;
    readonly typicalHttpStatus: string;
  }[];
  readonly "x-supaluv-task-defs": typeof CREATOR_TASK_DEFS;
  readonly "x-supaluv-dev-only": true;
  readonly "x-supaluv-base-path": typeof CREATOR_STUDIO_BASE_PATH;
}

function isWritePath(path: string): boolean {
  return (
    path.endsWith("/save") ||
    path.endsWith("/save-scene") ||
    path.endsWith("/pipeline") ||
    path.endsWith("/task")
  );
}

/** POST write/job routes are destructive; GETs are not. */
export function endpointIsDestructive(spec: CreatorStudioEndpointSpec): boolean {
  return spec.method === "POST" && isWritePath(spec.path);
}

/**
 * Safe-to-retry without side effects only for pure GETs.
 * Writes are not idempotent: a second save with the same body hits HASH_CONFLICT
 * after the first success (sourceHash advances).
 */
export function endpointIsIdempotent(spec: CreatorStudioEndpointSpec): boolean {
  return spec.method === "GET";
}

function fieldToJsonSchema(field: CreatorStudioFieldShape): JsonSchema {
  const description = field.legalValuesFrom
    ? `${field.description} Legal values from: ${field.legalValuesFrom}`
    : field.description;

  if (field.name === "sourceRange" || field.type.includes("startLine")) {
    return {
      type: "object",
      description,
      required: ["startLine", "endLine"],
      properties: {
        startLine: { type: "integer", minimum: 1, description: "1-based start line (inclusive)" },
        endLine: { type: "integer", minimum: 1, description: "1-based end line (inclusive)" },
      },
      additionalProperties: false,
    };
  }

  if (field.name === "fields" || field.type.includes("SceneEditableFields")) {
    return {
      type: "object",
      description,
      properties: {
        speaker: { type: "string", maxLength: 256, description: "Must be in scene-meta.speakers" },
        artKey: { type: "string", maxLength: 256, description: "Must be in scene-meta.artKeys" },
        videoKey: {
          type: "string",
          maxLength: 256,
          description: "Must be in scene-meta.videoKeys when set",
        },
        aiBranch: {
          description: "AI branch config object, or null to remove aiBranch from the scene card",
          oneOf: [
            {
              type: "object",
              required: ["enabled", "rejoinSceneId", "context"],
              properties: {
                enabled: { type: "boolean", const: true },
                rejoinSceneId: { type: "string", maxLength: 128 },
                context: { type: "string", maxLength: 8000 },
                waitLabel: { type: "string", maxLength: 256 },
                maxAiBeats: { type: "integer", minimum: 1 },
                artPool: { type: "array", items: { type: "string" } },
                portraitPool: { type: "array", items: { type: "string" } },
                speakerPool: { type: "array", items: { type: "string" } },
              },
              additionalProperties: false,
            },
            { type: "null" },
          ],
        },
      },
      additionalProperties: false,
    };
  }

  if (field.type === "string") {
    const schema: JsonSchema = { type: "string", description };
    if (field.name === "sourceHash" || field.name === "revision") {
      schema.minLength = 1;
      schema.maxLength = 128;
      if (field.name === "sourceHash") {
        schema.pattern = "^[a-f0-9]{64}$";
        schema.description = `${description} (sha256 hex, 64 chars)`;
      }
    } else if (field.name === "sceneId" || field.name === "chapterId" || field.name === "taskId") {
      schema.minLength = 1;
      schema.maxLength = 128;
    } else if (field.name === "file") {
      schema.minLength = 1;
      schema.maxLength = 512;
    } else {
      schema.maxLength = 8000;
    }
    return schema;
  }

  return { description, type: "object" };
}

function requestBodySchema(spec: CreatorStudioEndpointSpec): JsonSchema | null {
  if (!spec.requestBody) return null;
  const fields = spec.requestBody.fields;
  if (fields.length === 0) {
    return {
      type: "object",
      description: spec.requestBody.notes ?? "Empty object or omit body.",
      additionalProperties: false,
    };
  }
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const field of fields) {
    properties[field.name] = fieldToJsonSchema(field);
    if (field.required) required.push(field.name);
  }
  return {
    type: "object",
    description: spec.requestBody.notes,
    required,
    properties,
    additionalProperties: false,
  };
}

function errorResponseRef(code: string, meaning: string): JsonSchema {
  return {
    description: `${code}: ${meaning}`,
    content: {
      "application/json": {
        schema: {
          allOf: [
            { $ref: "#/components/schemas/ErrorBody" },
            {
              type: "object",
              properties: {
                error: {
                  type: "object",
                  properties: {
                    code: { type: "string", const: code },
                  },
                },
              },
            },
          ],
        },
        example: {
          error: { code, message: meaning },
        },
      },
    },
  };
}

function successResponse(spec: CreatorStudioEndpointSpec): JsonSchema {
  const contentType = spec.response.contentType;
  const isNdjson = contentType.includes("ndjson");
  return {
    description: spec.response.notes
      ? `${spec.response.shape}\n\n${spec.response.notes}`
      : spec.response.shape,
    content: {
      [contentType]: {
        schema: isNdjson
          ? {
              type: "string",
              description:
                "NDJSON stream: one JSON object per line (step_start, stdout, stderr, step_end, done, result, error).",
            }
          : {
              type: "object",
              description: spec.response.shape,
              additionalProperties: true,
            },
      },
    },
  };
}

function operationIdFor(spec: CreatorStudioEndpointSpec): string {
  const leaf =
    spec.path.replace(CREATOR_STUDIO_BASE_PATH, "").replace(/^\//, "").replace(/\//g, "_") ||
    "root";
  const safe = leaf.replace(/[^a-zA-Z0-9_]/g, "_");
  return `${spec.method.toLowerCase()}_${safe}`;
}

function buildOperation(spec: CreatorStudioEndpointSpec): Record<string, unknown> {
  const responses: Record<string, unknown> = {
    "200": successResponse(spec),
  };
  for (const err of spec.errors) {
    const key = String(err.httpStatus);
    // Prefer first semantics for a status; append codes in description if collision.
    if (responses[key]) {
      const existing = responses[key] as { description?: string };
      existing.description = `${existing.description ?? ""}; also ${err.code}: ${err.meaning}`;
    } else {
      responses[key] = errorResponseRef(err.code, err.meaning);
    }
  }

  const op: Record<string, unknown> = {
    operationId: operationIdFor(spec),
    summary: spec.purpose,
    description: spec.purpose,
    "x-destructive": endpointIsDestructive(spec),
    "x-idempotent": endpointIsIdempotent(spec),
    tags: ["Creator Studio"],
    responses,
  };

  if (spec.method === "POST") {
    const schema = requestBodySchema(spec);
    if (schema) {
      op.requestBody = {
        required: Boolean(spec.requestBody?.fields.some((f) => f.required)),
        description: spec.contentType ?? "application/json",
        content: {
          "application/json": { schema },
        },
      };
    }
  }

  return op;
}

function typicalHttpStatus(code: (typeof CREATOR_STUDIO_ERROR_CODES)[number]): string {
  if (
    code === "HASH_CONFLICT" ||
    code === "GRAPH_CONFLICT" ||
    code === "RANGE_DRIFT" ||
    code === "TASK_BUSY"
  ) {
    return "409";
  }
  if (code === "INVALID_PATH") return "403";
  if (code === "SCENE_NOT_FOUND") return "404";
  if (code === "INVALID_REQUEST") return "400 or 413";
  if (code === "SAVE_FAILED") return "500";
  return "422";
}

/** Build the OpenAPI 3.1 document served at GET /openapi.json. */
export function buildCreatorStudioOpenApi(): CreatorStudioOpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const spec of CREATOR_STUDIO_ENDPOINT_SPECS) {
    const method = spec.method.toLowerCase();
    if (!paths[spec.path]) paths[spec.path] = {};
    paths[spec.path]![method] = buildOperation(spec);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "SupaLuv Creator Studio",
      version: "1.0.0",
      description: [
        CREATOR_STUDIO_PRODUCT,
        "",
        "Dev-only HTTP surface (Vite serve, non-production). Bound to 127.0.0.1.",
        "Cold-agent entry: fetch this document, then follow x-supaluv-workflows.",
        "Five cold-start task classes: read, modify, conflict (HASH_CONFLICT), illegal input (4xx), rollback.",
        'Error body (non-streaming): { "error": { "code": string, "message": string } }.',
      ].join("\n"),
    },
    servers: [
      {
        url: "http://127.0.0.1:5173",
        description: "Default local Vite dev server (host 127.0.0.1 only)",
      },
    ],
    paths,
    components: {
      schemas: {
        ErrorBody: {
          type: "object",
          required: ["error"],
          additionalProperties: false,
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              additionalProperties: false,
              properties: {
                code: {
                  type: "string",
                  enum: [...CREATOR_STUDIO_ERROR_CODES],
                  description: "Machine-readable error code",
                },
                message: {
                  type: "string",
                  description: "Human-readable detail",
                },
              },
            },
          },
        },
      },
    },
    "x-supaluv-workflows": CREATOR_STUDIO_WORKFLOWS,
    "x-supaluv-invariants": CREATOR_STUDIO_INVARIANTS,
    "x-supaluv-error-codes": CREATOR_STUDIO_ERROR_CODES.map((code) => ({
      code,
      typicalHttpStatus: typicalHttpStatus(code),
    })),
    "x-supaluv-task-defs": CREATOR_TASK_DEFS,
    "x-supaluv-dev-only": true,
    "x-supaluv-base-path": CREATOR_STUDIO_BASE_PATH,
  };
}
