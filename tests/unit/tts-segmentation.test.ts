import { describe, expect, it } from "vitest";
import {
  hasMixedTtsRoutes,
  planBrowserTtsSegments,
} from "../../apps/web/src/audio/ttsSegmentation";
import { planDialogueTtsSegments } from "../../services/ai-branch/src/tts/ttsRoute";
import {
  TTS_FRAGMENT_ROUTING_FIXTURES,
  TTS_ROUTING_FIXTURES,
} from "../fixtures/tts-routing-fixtures";

describe("browser/server TTS segmentation parity", () => {
  it.each(TTS_ROUTING_FIXTURES)("keeps strict parity for $name", (fixture) => {
    const browser = planBrowserTtsSegments(fixture.text, fixture.fallbackLanguage);
    const server = planDialogueTtsSegments(fixture.text, fixture.fallbackLanguage);
    const routeSet = [...new Set(browser.map((segment) => segment.route))].sort();

    expect(browser).toEqual(server);
    expect(routeSet).toEqual([...fixture.expectedRouteSet].sort());
    expect(hasMixedTtsRoutes(browser)).toBe(fixture.expectedMixed);
  });

  it.each(TTS_FRAGMENT_ROUTING_FIXTURES)(
    "classifies each Latin fragment independently for $name",
    (fixture) => {
      const browser = planBrowserTtsSegments(fixture.text, fixture.fallbackLanguage);
      const server = planDialogueTtsSegments(fixture.text, fixture.fallbackLanguage);

      // Assert each planner against the exact expected sequence first — parity alone
      // cannot catch a shared all-or-nothing allowlist defect.
      expect(browser).toEqual(fixture.expectedSegments);
      expect(server).toEqual(fixture.expectedSegments);
      expect(browser).toEqual(server);
    },
  );

  it("does not silence real chapter lines that only borrow allowlisted tokens", () => {
    for (const fixture of TTS_ROUTING_FIXTURES.filter(
      (entry) => entry.name.startsWith("chapter") && !entry.expectedMixed,
    )) {
      const browser = planBrowserTtsSegments(fixture.text, fixture.fallbackLanguage);
      const server = planDialogueTtsSegments(fixture.text, fixture.fallbackLanguage);
      expect(browser).toEqual(server);
      expect(browser.length).toBeGreaterThan(0);
      expect(hasMixedTtsRoutes(browser)).toBe(false);
      expect(browser.every((segment) => segment.route === "chinese")).toBe(true);
    }
  });

  it("keeps the frozen allowlist exact", () => {
    for (const token of ["AI", "ai", "App", "APP", "OK", "Ok", "OpenAI", "openai"]) {
      expect(hasMixedTtsRoutes(planBrowserTtsSegments(`中文 ${token} 继续。`, "zh-CN"))).toBe(
        false,
      );
    }
    for (const token of ["Live", "Very", "robot", "SupaLuv", "Claude"]) {
      expect(hasMixedTtsRoutes(planBrowserTtsSegments(`中文 ${token} 继续。`, "zh-CN"))).toBe(true);
    }
  });
});
