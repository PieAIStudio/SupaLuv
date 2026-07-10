import { describe, expect, it } from "vitest";
import {
  getAiBatteryPitch,
  getAiBatteryPitchOneLiner,
} from "../../apps/web/src/commerce/aiBatteryPitch";

describe("ai battery pitch", () => {
  it("explains no free AI quota in Chinese", () => {
    const pitch = getAiBatteryPitch("zh-CN");
    expect(pitch.title).toMatch(/电池/);
    expect(pitch.body).toMatch(/不提供/);
    expect(pitch.body.length).toBeGreaterThan(40);
    expect(getAiBatteryPitchOneLiner("zh-CN")).toMatch(/无免费/);
  });

  it("has English variant for overseas shell", () => {
    const pitch = getAiBatteryPitch("en");
    expect(pitch.title.toLowerCase()).toMatch(/batter/);
    expect(pitch.body.toLowerCase()).toMatch(/no free ai/);
  });
});
