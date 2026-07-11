import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleEndingRoute,
  type EndingRouteDependencies,
} from "../../services/ai-branch/src/endingRoutes";
import { EndingPaymentError } from "../../services/ai-branch/src/endingSessionService";
import {
  EndingVersionConflictError,
  createInMemorySupaluvStore,
} from "../../services/ai-branch/src/supaluvStore";

let server: Server | undefined;
afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
});

function deps(): EndingRouteDependencies {
  return {
    verifyAuth: vi.fn(async (header) =>
      header === "Bearer valid"
        ? { ok: true as const, userId: "owner-a", isAnonymous: false }
        : { ok: false as const, status: 401 as const, error: "auth required" },
    ),
    store: createInMemorySupaluvStore(),
    service: {
      startSession: vi.fn(async () => ({
        checkpoint: { sessionId: "session-1" },
        segment: { sequence: 1 },
      })) as never,
      advanceSession: vi.fn(async () => ({ checkpoint: {}, segment: { sequence: 2 } })) as never,
      resumeSession: vi.fn(async () => ({
        session: { id: "session-1" },
        checkpoints: [],
      })) as never,
      getSession: vi.fn() as never,
    },
  };
}

async function request(
  dependencies: EndingRouteDependencies,
  path: string,
  init: RequestInit = {},
) {
  server = createServer(async (req, res) => {
    if (
      !(await handleEndingRoute(req, res, new URL(req.url ?? "/", "http://local"), dependencies))
    ) {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing port");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("AI ending routes", () => {
  it("requires authentication and enforces the body limit", async () => {
    expect(
      (await request(deps(), "/ai/endings/sessions", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
    expect(
      (
        await request(deps(), "/ai/endings/sessions", {
          method: "POST",
          headers: { authorization: "Bearer valid" },
          body: "x".repeat(70_000),
        })
      ).status,
    ).toBe(413);
  });

  it("starts with the authenticated owner and supports resume", async () => {
    const dependencies = deps();
    const response = await request(dependencies, "/ai/endings/sessions", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify({
        storyRunId: "9e6f830d-1424-4fc4-a521-3c170f12139c",
        clientRunId: "run-1",
        clientSessionId: "session-client-1",
        clientActionId: "start-1",
        characterBindings: {},
      }),
    });
    expect(response.status).toBe(201);
    expect(dependencies.service.startSession).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "owner-a" }),
    );
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
    expect(
      (
        await request(dependencies, "/ai/endings/sessions/session-1/resume", {
          method: "POST",
          headers: { authorization: "Bearer valid" },
        })
      ).status,
    ).toBe(200);
  });

  it.each([
    [new EndingPaymentError("INSUFFICIENT", "low"), 402],
    [new EndingVersionConflictError(), 409],
  ] as const)("maps advance failures", async (failure, status) => {
    const dependencies = deps();
    vi.mocked(dependencies.service.advanceSession).mockRejectedValueOnce(failure);
    const response = await request(dependencies, "/ai/endings/sessions/session-1/actions", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify({
        clientActionId: "action-2",
        expectedVersion: 1,
        action: { kind: "choice", choiceId: "call" },
      }),
    });
    expect(response.status).toBe(status);
  });
});
