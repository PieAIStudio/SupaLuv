import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  choiceStatsCatalogCardinalityBounds,
  isPermittedChoiceOnStory,
} from "@supaluv/shared/choice-stats-catalog";
import {
  choiceStatsStoreCardinality,
  getCountsForStory,
  recordChoice,
  resetChoiceStatsForTesting,
} from "../../services/ai-branch/src/choiceStatsStore.js";
import { sendJson } from "../../services/ai-branch/src/httpUtils.js";
import { handleAiBranchRequest } from "../../services/ai-branch/src/routeTable.js";
import { normalizeAiBranchServiceUrl } from "../../services/ai-branch/src/serviceMount.js";

let server: Server | undefined;

beforeEach(() => {
  resetChoiceStatsForTesting();
});

afterEach(async () => {
  resetChoiceStatsForTesting();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  }
});

async function startService(): Promise<string> {
  server = createServer(async (req, res) => {
    const handled = await handleAiBranchRequest(
      req,
      res,
      normalizeAiBranchServiceUrl(new URL(req.url ?? "/", "http://127.0.0.1")),
    );
    if (!handled) {
      sendJson(res, 404, { error: "Not found" });
    }
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Missing choice stats service test port");
  }
  return `http://127.0.0.1:${address.port}/choice-stats`;
}

describe("choice stats anonymous aggregate service", () => {
  it("records permitted production ids per story and returns counters only", async () => {
    expect(recordChoice("draft-ch01", "d1_bones_cold")).toBe(1);
    expect(recordChoice("draft-ch01", "d1_bones_cold")).toBe(2);
    expect(recordChoice("draft-ch02", "d2_catch_firm")).toBe(1);

    expect(getCountsForStory("draft-ch01")).toEqual({ d1_bones_cold: 2 });
    expect(getCountsForStory("draft-ch02")).toEqual({ d2_catch_firm: 1 });

    const baseUrl = await startService();
    const recordResponse = await fetch(`${baseUrl}/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId: "draft-ch01", choiceId: "d1_bones_accept" }),
    });
    expect(recordResponse.status).toBe(200);

    const response = await fetch(`${baseUrl}?storyId=draft-ch01`);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({
      storyId: "draft-ch01",
      counts: { d1_bones_cold: 2, d1_bones_accept: 1 },
      source: "anonymous-memory-aggregate",
    });
    expect(JSON.stringify(body)).not.toMatch(/user|session|history|email|token/i);
  });

  it("rejects unknown story, unknown choice, and cross-story choice without mutating store", async () => {
    expect(recordChoice("draft-ch01", "d1_bones_cold")).toBe(1);
    const before = choiceStatsStoreCardinality();
    const beforeCounts = getCountsForStory("draft-ch01");

    expect(recordChoice("totally-unknown-story", "d1_bones_cold")).toBe(0);
    expect(recordChoice("draft-ch01", "not_a_real_choice")).toBe(0);
    // d1_bones_cold belongs to draft-ch01 only
    expect(isPermittedChoiceOnStory("draft-ch02", "d1_bones_cold")).toBe(false);
    expect(recordChoice("draft-ch02", "d1_bones_cold")).toBe(0);

    expect(choiceStatsStoreCardinality()).toEqual(before);
    expect(getCountsForStory("draft-ch01")).toEqual(beforeCounts);
    expect(getCountsForStory("draft-ch02")).toEqual({});
    expect(getCountsForStory("totally-unknown-story")).toEqual({});

    const baseUrl = await startService();
    const unknownStory = await fetch(`${baseUrl}/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId: "ghost-story", choiceId: "d1_bones_cold" }),
    });
    expect(unknownStory.status).toBe(400);

    const crossStory = await fetch(`${baseUrl}/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId: "draft-ch02", choiceId: "d1_bones_cold" }),
    });
    expect(crossStory.status).toBe(400);

    const unknownChoice = await fetch(`${baseUrl}/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId: "draft-ch01", choiceId: "fabricated_choice" }),
    });
    expect(unknownChoice.status).toBe(400);

    expect(choiceStatsStoreCardinality()).toEqual(before);
    expect(getCountsForStory("draft-ch01")).toEqual(beforeCounts);
  });

  it("keeps nested map cardinality bounded by the shared catalog under flood of junk keys", () => {
    const bounds = choiceStatsCatalogCardinalityBounds();
    expect(recordChoice("draft-ch01", "d1_bones_accept")).toBe(1);

    for (let i = 0; i < 200; i += 1) {
      expect(recordChoice(`junk-story-${i}`, `junk-choice-${i}`)).toBe(0);
      expect(recordChoice("draft-ch01", `junk-choice-${i}`)).toBe(0);
      expect(recordChoice("draft-ch02", `cross-${i}`)).toBe(0);
    }

    const card = choiceStatsStoreCardinality();
    expect(card.stories).toBeLessThanOrEqual(bounds.maxStories);
    expect(card.choicesTotal).toBeLessThanOrEqual(bounds.maxChoicesTotal);
    expect(card.stories).toBe(1);
    expect(card.choicesTotal).toBe(1);
    expect(getCountsForStory("draft-ch01")).toEqual({ d1_bones_accept: 1 });
  });
});
