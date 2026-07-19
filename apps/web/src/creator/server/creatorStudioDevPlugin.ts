import type { IncomingMessage, ServerResponse } from "node:http";
import { relative, sep } from "node:path";
import type { Plugin } from "vite";
import {
  buildCreatorStudioDescribe,
  CREATOR_STUDIO_BASE_PATH,
  CREATOR_STUDIO_ROUTE_REGISTRY,
} from "./creatorStudioDescribe";
import {
  CreatorStudioError,
  createCreatorStudioService,
  type CreatorSaveRequest,
  type CreatorSceneSaveRequest,
} from "./creatorStudioServer";
import { isCreatorTaskId } from "./creatorTasks";
import type { SceneEditableFields } from "./sceneManifestEdit";

type CreatorStudioService = ReturnType<typeof createCreatorStudioService>;
type Next = (error?: unknown) => void;

const BASE_PATH = CREATOR_STUDIO_BASE_PATH;
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Routes this handler implements. Same registry as describe catalog —
 * unit tests assert the two stay equal via CREATOR_STUDIO_ROUTE_REGISTRY.
 */
export const CREATOR_STUDIO_MOUNTED_ROUTES = CREATOR_STUDIO_ROUTE_REGISTRY;

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(value));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BODY_BYTES) {
      throw new CreatorStudioError("INVALID_REQUEST", "保存请求过大。", 413);
    }
    chunks.push(bytes);
  }
  if (chunks.length === 0) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CreatorStudioError("INVALID_REQUEST", "请求不是有效 JSON。", 400);
  }
}

function isSaveRequest(value: unknown): value is CreatorSaveRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<CreatorSaveRequest>;
  return (
    typeof request.file === "string" &&
    typeof request.revision === "string" &&
    typeof request.sourceHash === "string" &&
    typeof request.originalText === "string" &&
    typeof request.replacement === "string" &&
    Boolean(request.sourceRange) &&
    typeof request.sourceRange?.startLine === "number" &&
    typeof request.sourceRange?.endLine === "number"
  );
}

function isSceneSaveRequest(value: unknown): value is CreatorSceneSaveRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<CreatorSceneSaveRequest>;
  return (
    typeof request.sceneId === "string" &&
    typeof request.chapterId === "string" &&
    typeof request.sourceHash === "string" &&
    Boolean(request.fields) &&
    typeof request.fields === "object"
  );
}

function writeNdjson(response: ServerResponse, value: unknown): void {
  response.write(`${JSON.stringify(value)}\n`);
}

export function createCreatorStudioRequestHandler(service: CreatorStudioService) {
  return async function creatorStudioRequestHandler(
    request: IncomingMessage,
    response: ServerResponse,
    next: Next,
  ): Promise<void> {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (!pathname.startsWith(BASE_PATH)) {
      next();
      return;
    }

    try {
      if (pathname === `${BASE_PATH}/describe` && request.method === "GET") {
        writeJson(response, 200, buildCreatorStudioDescribe());
        return;
      }
      if (pathname === `${BASE_PATH}/graph` && request.method === "GET") {
        writeJson(response, 200, await service.getGraph());
        return;
      }
      if (pathname === `${BASE_PATH}/scene-meta` && request.method === "GET") {
        writeJson(response, 200, await service.getSceneMeta());
        return;
      }
      if (pathname === `${BASE_PATH}/assets` && request.method === "GET") {
        writeJson(response, 200, await service.getAssets());
        return;
      }
      if (pathname === `${BASE_PATH}/casting` && request.method === "GET") {
        writeJson(response, 200, await service.getCasting());
        return;
      }
      if (pathname === `${BASE_PATH}/tasks` && request.method === "GET") {
        writeJson(response, 200, service.listTasks());
        return;
      }
      if (pathname === `${BASE_PATH}/task` && request.method === "POST") {
        const body = await readJsonBody(request);
        const taskId =
          body && typeof body === "object" && "taskId" in body
            ? (body as { readonly taskId?: unknown }).taskId
            : undefined;
        if (!isCreatorTaskId(taskId)) {
          throw new CreatorStudioError(
            "INVALID_REQUEST",
            "taskId 必须是 asset-audit | auto-player | voice-reconcile。",
            400,
          );
        }
        // Delay NDJSON headers until the exclusive lock is acquired so TASK_BUSY
        // can still return a real HTTP 409 JSON body.
        let streaming = false;
        const beginStream = () => {
          if (streaming) return;
          streaming = true;
          response.statusCode = 200;
          response.setHeader("content-type", "application/x-ndjson; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.setHeader("transfer-encoding", "chunked");
        };
        const result = await service.runTask(taskId, (event) => {
          beginStream();
          writeNdjson(response, event);
        });
        beginStream();
        writeNdjson(response, {
          type: "result",
          ok: result.ok,
          steps: result.steps.map((s) => s.step),
        });
        response.end();
        return;
      }
      if (pathname === `${BASE_PATH}/save` && request.method === "POST") {
        const body = await readJsonBody(request);
        if (!isSaveRequest(body)) {
          throw new CreatorStudioError("INVALID_REQUEST", "保存请求字段不完整。", 400);
        }
        writeJson(response, 200, await service.save(body));
        return;
      }
      if (pathname === `${BASE_PATH}/save-scene` && request.method === "POST") {
        const body = await readJsonBody(request);
        if (!isSceneSaveRequest(body)) {
          throw new CreatorStudioError("INVALID_REQUEST", "场景保存请求字段不完整。", 400);
        }
        // Narrow fields to known keys only.
        const fields = body.fields as SceneEditableFields;
        writeJson(
          response,
          200,
          await service.saveScene({
            sceneId: body.sceneId,
            chapterId: body.chapterId,
            sourceHash: body.sourceHash,
            fields,
          }),
        );
        return;
      }
      if (pathname === `${BASE_PATH}/pipeline` && request.method === "POST") {
        // Drain body if present, then stream NDJSON logs.
        await readJsonBody(request).catch(() => ({}));
        let streaming = false;
        const beginStream = () => {
          if (streaming) return;
          streaming = true;
          response.statusCode = 200;
          response.setHeader("content-type", "application/x-ndjson; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.setHeader("transfer-encoding", "chunked");
        };
        const result = await service.runPipeline((event) => {
          beginStream();
          writeNdjson(response, event);
        });
        beginStream();
        writeNdjson(response, {
          type: "result",
          ok: result.ok,
          steps: result.steps.map((s) => s.step),
        });
        response.end();
        return;
      }
      writeJson(response, 404, {
        error: { code: "INVALID_REQUEST", message: "Creator Studio route 不存在。" },
      });
    } catch (error) {
      // If headers already sent (pipeline stream), just end.
      if (response.headersSent) {
        writeNdjson(response, {
          type: "error",
          code: error instanceof CreatorStudioError ? error.code : "SAVE_FAILED",
          message: error instanceof Error ? error.message : String(error),
        });
        response.end();
        return;
      }
      const failure =
        error instanceof CreatorStudioError
          ? error
          : new CreatorStudioError(
              "SAVE_FAILED",
              error instanceof Error ? error.message : String(error),
              500,
            );
      writeJson(response, failure.status, {
        error: { code: failure.code, message: failure.message },
      });
    }
  };
}

/** Dev-only bootstrap: auto-jump after prop-stage-fixture exposes jumpTo. */
const PREVIEW_BOOTSTRAP = `
<script type="module">
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get("creator-preview-scene");
    if (!scene || !params.has("prop-stage-fixture")) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const api = window.__SUPALUV_PROP_STAGE_TEST__;
      if (api && typeof api.jumpTo === "function") {
        try { api.jumpTo(scene); } catch (e) { console.warn("[creator-preview]", e); }
        window.clearInterval(timer);
        return;
      }
      if (Date.now() - started > 180000) window.clearInterval(timer);
    }, 400);
  } catch (e) {
    console.warn("[creator-preview] bootstrap failed", e);
  }
})();
</script>
`;

export function createCreatorStudioDevPlugin(options: { readonly repoRoot: string }): Plugin {
  const service = createCreatorStudioService({ repoRoot: options.repoRoot });
  const handler = createCreatorStudioRequestHandler(service);
  return {
    name: "supaluv-creator-studio-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    transformIndexHtml(html) {
      if (html.includes("creator-preview-scene")) {
        return html;
      }
      return html.replace("</body>", `${PREVIEW_BOOTSTRAP}</body>`);
    },
    handleHotUpdate({ file }) {
      const relativeFile = relative(options.repoRoot, file).split(sep).join("/");
      if (relativeFile.startsWith("packages/content/")) {
        // Creator saves rewrite Ink, compiled JSON and both graph artifacts in
        // one transaction. Let the editor apply its response instead of HMR
        // tearing down the in-flight save and resetting its status.
        return [];
      }
      return undefined;
    },
  };
}
