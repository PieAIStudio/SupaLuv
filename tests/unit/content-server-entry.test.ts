import { describe, expect, it } from "vitest";
import { ch01Scenes } from "@supaluv/content/ch01-scenes";

describe("server-safe content entry", () => {
  it("exports ending metadata without loading browser-only raw Ink sources", () => {
    expect(ch01Scenes.length).toBeGreaterThan(0);
    expect(ch01Scenes[0]).toHaveProperty("id");
  });
});
