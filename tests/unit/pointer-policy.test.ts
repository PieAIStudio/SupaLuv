import { describe, expect, it } from "vitest";
import {
  detectPointerPresenceMode,
  shouldPublishContinuousCursor,
  shouldShowRemoteCursors,
} from "../../apps/web/src/coplay/pointerPolicy";

function fakeWindow(queries: Record<string, boolean>) {
  return {
    matchMedia: (q: string) => ({
      matches: Boolean(queries[q]),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  };
}

describe("pointer presence policy", () => {
  it("uses fine cursor on desktop hover+fine", () => {
    const mode = detectPointerPresenceMode(
      fakeWindow({
        "(hover: hover) and (pointer: fine)": true,
        "(pointer: coarse)": false,
        "(pointer: fine)": true,
      }),
    );
    expect(mode).toBe("fine_cursor");
    expect(shouldPublishContinuousCursor(mode)).toBe(true);
    expect(shouldShowRemoteCursors(mode)).toBe(true);
  });

  it("uses touch focus on coarse pointer (phones)", () => {
    const mode = detectPointerPresenceMode(
      fakeWindow({
        "(hover: hover) and (pointer: fine)": false,
        "(pointer: coarse)": true,
        "(pointer: fine)": false,
      }),
    );
    expect(mode).toBe("touch_focus");
    expect(shouldPublishContinuousCursor(mode)).toBe(false);
    expect(shouldShowRemoteCursors(mode)).toBe(true);
  });
});
