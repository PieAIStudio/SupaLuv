import { describe, expect, it } from "vitest";

describe("story map", () => {
  it("builds the expected nodes and edges from prototype scenes", async () => {
    const content = await import("@supaluv/content");
    const shared = await import("@supaluv/shared");

    const map = shared.buildStoryMapFromScenes(content.prototypeScenes);

    expect(map.nodes).toHaveLength(6);
    expect(map.edges.some((edge) => edge.kind === "choice")).toBe(true);
    expect(map.edges.some((edge) => edge.kind === "return")).toBe(true);

    const incomingCounts = new Map<string, number>();
    for (const edge of map.edges) {
      incomingCounts.set(edge.to, (incomingCounts.get(edge.to) ?? 0) + 1);
    }

    expect(Array.from(incomingCounts.values()).some((count) => count >= 2)).toBe(true);
  });

  it("emits a mermaid flowchart string with key prototype scene ids", async () => {
    const content = await import("@supaluv/content");
    const shared = await import("@supaluv/shared");

    const map = shared.buildStoryMapFromScenes(content.prototypeScenes);
    const mermaid = shared.toMermaidFlowchart(map);

    expect(mermaid).toContain("flowchart TD");
    expect(mermaid).toContain("act1_office_shame_test");
    expect(mermaid).toContain("act1_rental_room_search");
    expect(mermaid).toContain("act1_product_page");
  });
});
