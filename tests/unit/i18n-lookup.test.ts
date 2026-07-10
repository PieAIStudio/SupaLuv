import { describe, expect, it } from "vitest";
import { lookupMessage, messagesFor } from "../../apps/web/src/i18n/catalog";

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
});
