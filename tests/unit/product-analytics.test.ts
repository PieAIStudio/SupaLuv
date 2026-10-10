import { afterEach, describe, expect, it } from "vitest";
import {
  runTrackedChapterStart,
  setAnalyticsClientForTesting,
  trackEvent,
} from "../../apps/web/src/analytics/productAnalytics";

afterEach(() => {
  setAnalyticsClientForTesting(null);
});

describe("typed product analytics", () => {
  it("captures chapter_started with only its allowlisted stable story id", () => {
    const captured: Array<{ name: string; properties?: Record<string, unknown> }> = [];
    setAnalyticsClientForTesting({
      capture(name, properties) {
        captured.push({ name, properties });
      },
    });

    trackEvent({
      name: "chapter_started",
      storyId: "draft-ch03",
      storyText: "must never leave the browser",
    } as never);

    expect(captured).toEqual([
      {
        name: "chapter_started",
        properties: { storyId: "draft-ch03" },
      },
    ]);
  });

  it("emits exactly once after a successful chapter start", async () => {
    const captured: string[] = [];
    setAnalyticsClientForTesting({
      capture(name) {
        captured.push(name);
      },
    });

    await expect(
      runTrackedChapterStart(
        async () => "ready" as const,
        () => "draft-ch02",
      ),
    ).resolves.toBe("ready");

    expect(captured).toEqual(["chapter_started"]);
  });

  it("does not report blocked or failed chapter starts", async () => {
    const captured: string[] = [];
    setAnalyticsClientForTesting({
      capture(name) {
        captured.push(name);
      },
    });

    await expect(
      runTrackedChapterStart(
        async () => "blocked" as const,
        () => "draft-ch01",
        (result) => result === ("ready" as string),
      ),
    ).resolves.toBe("blocked");
    await expect(
      runTrackedChapterStart(
        async () => {
          throw new Error("load failed");
        },
        () => "draft-ch03",
      ),
    ).rejects.toThrow("load failed");

    expect(captured).toEqual([]);
  });
});
