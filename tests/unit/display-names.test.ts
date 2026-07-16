import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  applyDisplayNamesInText,
  DEFAULT_DISPLAY_NAMES,
  loadDisplayNames,
  resolveDisplaySpeaker,
  sanitizeDisplayName,
  saveDisplayNames,
} from "../../apps/web/src/persistence/displayNames";

beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  localStorage.clear();
});

describe("displayNames", () => {
  it("defaults to 苏明 / 石佩欣", () => {
    expect(loadDisplayNames()).toEqual(DEFAULT_DISPLAY_NAMES);
  });

  it("persists custom lead names", () => {
    saveDisplayNames({ suming: "阿飞", lin_xiaotang: "小棠" });
    expect(loadDisplayNames()).toEqual({ suming: "阿飞", lin_xiaotang: "小棠" });
  });

  it("migrates stored legacy female defaults to the current default", () => {
    localStorage.setItem(
      "supaluv.displayNames.v1",
      JSON.stringify({ suming: "苏明", lin_xiaotang: "林晓棠" }),
    );
    expect(loadDisplayNames().lin_xiaotang).toBe("石佩欣");
  });

  it("sanitizes empty and overlong names", () => {
    expect(sanitizeDisplayName("   ", "苏明")).toBe("苏明");
    expect(sanitizeDisplayName("超长名字一二三四五六七八九十", "苏明").length).toBeLessThanOrEqual(
      12,
    );
  });

  it("resolves speakers and leaves NPC alone", () => {
    const names = { suming: "阿飞", lin_xiaotang: "室友" };
    expect(resolveDisplaySpeaker("苏明", names)).toBe("阿飞");
    expect(resolveDisplaySpeaker("石佩欣", names)).toBe("室友");
    expect(resolveDisplaySpeaker("周鹿", names)).toBe("周鹿");
    expect(resolveDisplaySpeaker("旁白", names)).toBe("旁白");
  });

  it("rewrites canonical names in body text", () => {
    const names = { suming: "阿飞", lin_xiaotang: "小棠" };
    expect(applyDisplayNamesInText("苏明看着石佩欣。", names)).toBe("阿飞看着小棠。");
  });
});
