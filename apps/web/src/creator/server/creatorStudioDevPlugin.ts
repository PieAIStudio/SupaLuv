import type { IncomingMessage, ServerResponse } from "node:http";
import { relative, sep } from "node:path";
import type { Plugin } from "vite";
import {
  CreatorStudioError,
  createCreatorStudioService,
  type CreatorSaveRequest,
} from "./creatorStudioServer";

type CreatorStudioService = ReturnType<typeof createCreatorStudioService>;
type Next = (error?: unknown) => void;

const BASE_PATH = "/__creator-studio";
const MAX_BODY_BYTES = 64 * 1024;

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
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CreatorStudioError("INVALID_REQUEST", "保存请求不是有效 JSON。", 400);
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
      if (pathname === `${BASE_PATH}/graph` && request.method === "GET") {
        writeJson(response, 200, await service.getGraph());
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
      writeJson(response, 404, {
        error: { code: "INVALID_REQUEST", message: "Creator Studio route 不存在。" },
      });
    } catch (error) {
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

export function createCreatorStudioDevPlugin(options: { readonly repoRoot: string }): Plugin {
  const service = createCreatorStudioService({ repoRoot: options.repoRoot });
  const handler = createCreatorStudioRequestHandler(service);
  return {
    name: "supaluv-creator-studio-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(handler);
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
