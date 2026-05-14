import { describe, expect, it } from "vitest";
import { superLoverSeedManifest } from "@supaluv/content";
import { isReadonlySourceMaterial } from "@supaluv/shared";

describe("superLoverSeedManifest", () => {
  it("keeps the source outline as read-only provenance", () => {
    expect(superLoverSeedManifest.sourceMaterial.ipTitle).toBe("超级爱人");
    expect(superLoverSeedManifest.sourceMaterial.projectPath).toBe(
      "docs/reference/source-material/super-lover-outline.md",
    );
    expect(isReadonlySourceMaterial(superLoverSeedManifest.sourceMaterial)).toBe(true);
  });

  it("keeps P0 runtime scope small", () => {
    expect(superLoverSeedManifest.runtimeBaseline).toBe("react-inkjs");
    expect(superLoverSeedManifest.boundary.publicRuntimeAi).toBe("out-of-scope-for-p0");
    expect(superLoverSeedManifest.boundary.multiplayer).toBe("not-applicable");
  });
});
