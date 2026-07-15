import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChoiceStatsRemoteClient,
  CHOICE_STATS_REMOTE_BASE_BACKOFF_MS,
  parseChoiceStatsRemotePayload,
  fetchAuthoritativeChoiceStats,
  resetChoiceStatsRemoteForTesting,
} from "../../apps/web/src/stats/choiceStatsRemote";
import { loadAuthoritativeCounts } from "../../apps/web/src/stats/choiceStatsLean";
import { isAuthoritativeChoiceStatsSource } from "@supaluv/shared/choice-stats-catalog";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetChoiceStatsRemoteForTesting();
});

function snapshotResponse(
  counts: Record<string, number>,
  source: string = "anonymous-memory-aggregate",
  storyId = "draft-ch01",
): Response {
  return new Response(JSON.stringify({ storyId, counts, source }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("choice stats remote resilience", () => {
  it("bounds a hanging request with a hard timeout and quiet fallback", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<FetchFn>(() => new Promise<Response>(() => undefined));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = new ChoiceStatsRemoteClient({
      baseUrl: "http://127.0.0.1:8787/choice-stats",
      fetchFn: fetchMock,
      timeoutMs: 100,
    });

    const pending = client.fetchSnapshot("draft-ch01");
    await vi.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("absorbs the fetch abort rejection after timeout without an unhandled rejection", async () => {
    vi.useFakeTimers();
    const unhandled = vi.fn<(reason: unknown, promise: Promise<unknown>) => void>();
    process.on("unhandledRejection", unhandled);
    const fetchMock = vi.fn<FetchFn>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              queueMicrotask(() => reject(new DOMException("Aborted", "AbortError")));
            },
            { once: true },
          );
        }),
    );
    const client = new ChoiceStatsRemoteClient({
      baseUrl: "http://127.0.0.1:8787/choice-stats",
      fetchFn: fetchMock,
      timeoutMs: 100,
    });

    try {
      const pending = client.fetchSnapshot("draft-ch01");
      await vi.advanceTimersByTimeAsync(100);
      await expect(pending).resolves.toBeNull();
      await Promise.resolve();
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("opens the circuit, then allows a deterministic recovery probe", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const fetchMock = vi
      .fn<FetchFn>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(snapshotResponse({ d1_bones_cold: 12 }));
    const client = new ChoiceStatsRemoteClient({
      baseUrl: "http://127.0.0.1:8787/choice-stats",
      fetchFn: fetchMock,
    });

    await expect(client.fetchSnapshot("draft-ch01")).resolves.toBeNull();
    await expect(client.fetchSnapshot("draft-ch01")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(CHOICE_STATS_REMOTE_BASE_BACKOFF_MS - 1);
    await expect(client.fetchSnapshot("draft-ch01")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(client.fetchSnapshot("draft-ch01")).resolves.toEqual({
      storyId: "draft-ch01",
      counts: { d1_bones_cold: 12 },
      source: "anonymous-memory-aggregate",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("permits only one half-open probe and reuses a fresh successful snapshot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    let resolveProbe: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn<FetchFn>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveProbe = resolve;
          }),
      );
    const client = new ChoiceStatsRemoteClient({
      baseUrl: "http://127.0.0.1:8787/choice-stats",
      fetchFn: fetchMock,
    });

    await client.fetchSnapshot("draft-ch01");
    await vi.advanceTimersByTimeAsync(CHOICE_STATS_REMOTE_BASE_BACKOFF_MS);

    const recovery = client.fetchSnapshot("draft-ch01");
    await expect(client.postChoice("d1_bones_cold", "draft-ch01")).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveProbe?.(snapshotResponse({ d1_bones_cold: 9 }));
    await expect(recovery).resolves.toEqual({
      storyId: "draft-ch01",
      counts: { d1_bones_cold: 9 },
      source: "anonymous-memory-aggregate",
    });
    await expect(client.fetchSnapshot("draft-ch01")).resolves.toEqual({
      storyId: "draft-ch01",
      counts: { d1_bones_cold: 9 },
      source: "anonymous-memory-aggregate",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("integration: an absent local service causes one quiet probe, not repeated traffic", async () => {
    const reservation = createServer();
    await new Promise<void>((resolve) => reservation.listen(0, "127.0.0.1", resolve));
    const address = reservation.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to reserve local integration port");
    }
    const port = address.port;
    await new Promise<void>((resolve, reject) =>
      reservation.close((closeError) => (closeError ? reject(closeError) : resolve())),
    );

    let fetchCalls = 0;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = new ChoiceStatsRemoteClient({
      baseUrl: `http://127.0.0.1:${port}/choice-stats`,
      fetchFn: (input, init) => {
        fetchCalls += 1;
        return globalThis.fetch(input, init);
      },
      timeoutMs: 250,
      baseBackoffMs: 5_000,
    });

    await expect(client.postChoice("d1_bones_cold", "draft-ch01")).resolves.toBe(false);
    await Promise.all(Array.from({ length: 12 }, () => client.fetchSnapshot("draft-ch01"))).then(
      (results) => expect(results.every((result) => result === null)).toBe(true),
    );

    expect(fetchCalls).toBe(1);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("choice stats provenance parsing", () => {
  it("preserves typed source and fails closed on missing or unsupported provenance", () => {
    expect(
      parseChoiceStatsRemotePayload(
        {
          storyId: "draft-ch01",
          counts: { d1_bones_cold: 3 },
          source: "anonymous-memory-aggregate",
        },
        "draft-ch01",
      ),
    ).toEqual({
      storyId: "draft-ch01",
      counts: { d1_bones_cold: 3 },
      source: "anonymous-memory-aggregate",
    });

    expect(
      parseChoiceStatsRemotePayload(
        { storyId: "draft-ch01", counts: { d1_bones_cold: 3 } },
        "draft-ch01",
      ),
    ).toBeNull();

    expect(
      parseChoiceStatsRemotePayload(
        {
          storyId: "draft-ch01",
          counts: { d1_bones_cold: 3 },
          source: "pretend-trusted-global",
        },
        "draft-ch01",
      ),
    ).toBeNull();

    expect(
      parseChoiceStatsRemotePayload(
        {
          storyId: "draft-ch01",
          counts: { d1_bones_cold: 3 },
          source: 42,
        },
        "draft-ch01",
      ),
    ).toBeNull();
  });

  it("fails closed when a successful HTTP body omits provenance", async () => {
    const fetchMock = vi.fn<FetchFn>().mockResolvedValue(
      new Response(JSON.stringify({ counts: { d1_bones_cold: 4 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new ChoiceStatsRemoteClient({
      baseUrl: "http://127.0.0.1:8787/choice-stats",
      fetchFn: fetchMock,
    });
    await expect(client.fetchSnapshot("draft-ch01")).resolves.toBeNull();
  });

  it("requires the response storyId to exactly match the requested permitted story", () => {
    expect(
      parseChoiceStatsRemotePayload(
        {
          counts: { d1_bones_cold: 3 },
          source: "anonymous-memory-aggregate",
        },
        "draft-ch01",
      ),
    ).toBeNull();
    expect(
      parseChoiceStatsRemotePayload(
        {
          storyId: "draft-ch02",
          counts: { d2_catch_firm: 3 },
          source: "anonymous-memory-aggregate",
        },
        "draft-ch01",
      ),
    ).toBeNull();
    expect(
      parseChoiceStatsRemotePayload(
        {
          storyId: "ghost-story",
          counts: {},
          source: "anonymous-memory-aggregate",
        },
        "ghost-story",
      ),
    ).toBeNull();
  });

  it("rejects unknown and cross-story count keys instead of filtering them", () => {
    expect(
      parseChoiceStatsRemotePayload(
        {
          storyId: "draft-ch01",
          counts: { d1_bones_cold: 3, fabricated_choice: 999 },
          source: "anonymous-memory-aggregate",
        },
        "draft-ch01",
      ),
    ).toBeNull();
    expect(
      parseChoiceStatsRemotePayload(
        {
          storyId: "draft-ch01",
          counts: { d2_catch_firm: 999 },
          source: "anonymous-memory-aggregate",
        },
        "draft-ch01",
      ),
    ).toBeNull();
  });
});

describe("process-memory cannot authorize Oracle/referee", () => {
  it("does not treat anonymous-memory-aggregate as authoritative", () => {
    expect(isAuthoritativeChoiceStatsSource("anonymous-memory-aggregate")).toBe(false);
    expect(isAuthoritativeChoiceStatsSource("local")).toBe(false);
    expect(isAuthoritativeChoiceStatsSource("seed")).toBe(false);
    expect(isAuthoritativeChoiceStatsSource(null)).toBe(false);
  });

  it("returns no authority counts even when process-memory snapshot is rich", async () => {
    const fetchMock = vi.fn<FetchFn>().mockResolvedValue(
      snapshotResponse({
        d1_bones_accept: 10,
        d1_bones_cold: 90,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAuthoritativeChoiceStats("draft-ch01")).resolves.toBeNull();
    await expect(loadAuthoritativeCounts("draft-ch01")).resolves.toEqual({});
  });
});
