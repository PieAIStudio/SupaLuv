import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  EMPTY_PORTRAIT_PACK,
  hasCustomPortraitPack,
  leadSlotForStem,
  loadPortraitPack,
  resolvePortraitUrl,
  rewritePortraitUrl,
  savePortraitPack,
  setLeadOverride,
} from "../../apps/web/src/persistence/portraitPack";

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

describe("portraitPack", () => {
  it("falls back to official path", () => {
    expect(resolvePortraitUrl("suming-shame", EMPTY_PORTRAIT_PACK)).toBe(
      "/assets/portraits/suming-shame.png",
    );
  });

  it("applies lead wildcard override", () => {
    const pack = setLeadOverride(EMPTY_PORTRAIT_PACK, "suming", "data:image/png;base64,abc");
    expect(resolvePortraitUrl("suming-panic", pack)).toBe("data:image/png;base64,abc");
    expect(leadSlotForStem("lin-neutral")).toBe("lin_xiaotang");
    expect(hasCustomPortraitPack(pack)).toBe(true);
  });

  it("rewrites full URLs and persists", () => {
    const pack = setLeadOverride(EMPTY_PORTRAIT_PACK, "lin_xiaotang", "data:image/png;base64,zz");
    savePortraitPack(pack);
    expect(loadPortraitPack().byLead.lin_xiaotang).toBe("data:image/png;base64,zz");
    expect(rewritePortraitUrl("/assets/portraits/lin-neutral.png", pack)).toBe(
      "data:image/png;base64,zz",
    );
  });
});
