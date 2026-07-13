import type { IncomingMessage, ServerResponse } from "node:http";
import { ch01Scenes } from "@supaluv/content/ch01-scenes";
import { z } from "zod";
import type { AuthGateFailure, AuthGateResult } from "./authGate.js";
import { EndingPaymentError, type EndingSessionService } from "./endingSessionService.js";
import { readBody, RequestBodyTooLargeError, sendJson } from "./httpUtils.js";
import type { EndingSessionStore } from "./persistence/endingSessionStore.js";
import { EndingVersionConflictError } from "./persistence/index.js";

const BODY_LIMIT = 64 * 1024;
const stableId = z.string().trim().min(1).max(128);
const startSchema = z
  .object({
    storyRunId: z.string().uuid(),
    clientRunId: stableId,
    clientSessionId: stableId,
    clientActionId: stableId,
    characterBindings: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), choiceId: stableId }),
  z.object({ kind: z.literal("free_text"), text: z.string().trim().min(1).max(1_000) }),
]);
const advanceSchema = z
  .object({
    clientActionId: stableId,
    expectedVersion: z.number().int().min(0),
    action: actionSchema,
  })
  .strict();

type VerifyAuth = (header: string | undefined) => Promise<AuthGateResult | AuthGateFailure>;
export interface EndingRouteDependencies {
  readonly verifyAuth: VerifyAuth;
  readonly store: EndingSessionStore;
  readonly service: EndingSessionService;
}

function requireEndingContract<T>(value: T | undefined): T {
  if (!value) throw new Error("Chapter 1 AI ending contract is missing");
  return value;
}

const contract = requireEndingContract(
  ch01Scenes.find((scene) => scene.id === "ch01_chapter_end")?.aiEnding,
);
const allowedSpeakers = ["苏明", "周鹿", "艾拉", "凯", "旁白"] as const;

async function parse(req: IncomingMessage): Promise<unknown> {
  const raw = await readBody(req, BODY_LIMIT);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new SyntaxError("Invalid JSON body");
  }
}

export async function handleEndingRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  deps: EndingRouteDependencies,
): Promise<boolean> {
  if (!url.pathname.startsWith("/ai/endings/sessions")) return false;
  try {
    const auth = await deps.verifyAuth(req.headers.authorization);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/ai/endings/sessions") {
      const parsed = startSchema.safeParse(await parse(req));
      if (!parsed.success) {
        sendJson(res, 422, { error: "INVALID_ENDING_START", issues: parsed.error.issues });
        return true;
      }
      await deps.store.saveStoryRun({
        id: parsed.data.storyRunId,
        ownerId: auth.userId,
        clientRunId: parsed.data.clientRunId,
        storyId: "ch01",
        status: "active",
        characterBindings: parsed.data.characterBindings,
      });
      sendJson(
        res,
        201,
        await deps.service.startSession({
          ownerId: auth.userId,
          storyRunId: parsed.data.storyRunId,
          clientSessionId: parsed.data.clientSessionId,
          clientActionId: parsed.data.clientActionId,
          contract,
          allowedSpeakers,
        }),
      );
      return true;
    }

    const match = /^\/ai\/endings\/sessions\/([^/]+)(?:\/(actions|resume))?$/.exec(url.pathname);
    const sessionId = match?.[1];
    if (!sessionId) return false;
    if (req.method === "POST" && match[2] === "actions") {
      const parsed = advanceSchema.safeParse(await parse(req));
      if (!parsed.success) {
        sendJson(res, 422, { error: "INVALID_ENDING_ACTION", issues: parsed.error.issues });
        return true;
      }
      sendJson(
        res,
        200,
        await deps.service.advanceSession({
          ownerId: auth.userId,
          sessionId,
          ...parsed.data,
          contract,
          allowedSpeakers,
        }),
      );
      return true;
    }
    if ((req.method === "GET" && !match[2]) || (req.method === "POST" && match[2] === "resume")) {
      sendJson(res, 200, await deps.service.resumeSession(auth.userId, sessionId));
      return true;
    }
    return false;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) sendJson(res, 413, { error: "BODY_TOO_LARGE" });
    else if (error instanceof EndingPaymentError)
      sendJson(res, error.code === "INSUFFICIENT" ? 402 : 503, { error: error.code });
    else if (error instanceof EndingVersionConflictError)
      sendJson(res, 409, { error: "ENDING_VERSION_CONFLICT" });
    else if (error instanceof SyntaxError || error instanceof z.ZodError)
      sendJson(res, 422, { error: "INVALID_ENDING_REQUEST" });
    else {
      const message = error instanceof Error ? error.message : "AI ending unavailable";
      sendJson(res, /blocked/i.test(message) ? 403 : 503, { error: message.slice(0, 160) });
    }
    return true;
  }
}
