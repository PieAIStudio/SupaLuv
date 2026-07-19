import { describe, expect, it } from "vitest";
import {
  listPreviewIds,
  listPreviewSequence,
  resolvePreviewPhrase,
} from "../../services/ai-branch/src/tts/ttsCatalog";

describe("tts catalog", () => {
  it("publishes a stable, ordered Leo bilingual audition", () => {
    expect(listPreviewIds()).toEqual(["zh_preview", "en_preview"]);
    const sequence = listPreviewSequence("leo_bilingual");
    expect(sequence.map((entry) => entry.id)).toEqual(["zh_preview", "en_preview"]);
    expect(sequence.every((entry) => entry.characterId === "leo")).toBe(true);
    expect(sequence.map((entry) => entry.language)).toEqual(["zh-CN", "en"]);
  });

  it("keeps each audition fragment monolingual and rejects unknown IDs", () => {
    const chinese = resolvePreviewPhrase("zh_preview");
    const english = resolvePreviewPhrase("en_preview");
    expect(chinese?.text).toMatch(/雷欧/);
    expect(chinese?.text).not.toMatch(/[A-Za-z]/u);
    expect(english?.text).toMatch(/Leo/);
    expect(english?.text).not.toMatch(/\p{Script=Han}/u);
    expect(resolvePreviewPhrase("hack")).toBeNull();
  });
});
