import { describe, expect, it } from "vitest";
import { listPreviewIds, resolvePreviewPhrase } from "../../services/ai-branch/src/ttsCatalog";

describe("tts catalog", () => {
  it("resolves fixed previews only", () => {
    expect(resolvePreviewPhrase("zh_preview")?.text).toMatch(/试听|超级爱人/);
    expect(resolvePreviewPhrase("en_preview")?.language).toBe("en");
    expect(resolvePreviewPhrase("hack")).toBeNull();
    expect(listPreviewIds()).toContain("zh_preview");
  });
});
