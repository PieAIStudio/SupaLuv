import { describe, expect, it } from "vitest";
import { lookupMessage, messagesFor } from "../../apps/web/src/i18n/catalog";
import type { MessageTree } from "../../apps/web/src/i18n/types";

function leafKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : leafKeys(value, path);
  });
}

describe("i18n catalog", () => {
  it("resolves zh-CN boot cta", () => {
    expect(lookupMessage(messagesFor("zh-CN"), "boot.cta")).toContain("点击");
  });

  it("resolves en settings title", () => {
    expect(lookupMessage(messagesFor("en"), "settings.title")).toBe("Settings");
  });

  it("placeholder locales still have title.logo", () => {
    expect(lookupMessage(messagesFor("ja"), "title.logo")).toBeTruthy();
  });

  it("keeps English and Chinese message trees complete and symmetric", () => {
    expect(leafKeys(messagesFor("en")).sort()).toEqual(leafKeys(messagesFor("zh-CN")).sort());
  });

  it("contains the core player locale surfaces in both languages", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const messages = messagesFor(locale);
      for (const key of [
        "title.aiSpend",
        "characterStudio.title",
        "characterStudio.useOfficial",
        "aiSpend.title",
        "aiSpend.actions.character_base",
        "settings.emailSubmit",
      ]) {
        expect(lookupMessage(messages, key), `${locale}:${key}`).toBeTruthy();
      }
    }
  });
});
