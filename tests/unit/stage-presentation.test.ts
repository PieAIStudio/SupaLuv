import { describe, expect, it } from "vitest";
import {
  mapDialogueForPlayer,
  mapPortraitsForPlayer,
} from "../../apps/web/src/views/play/stagePresentation";

describe("stagePresentation", () => {
  it("rewrites lead speaker and body names", () => {
    const names = { suming: "阿飞", lin_xiaotang: "小棠" };
    expect(mapDialogueForPlayer("苏明", "苏明看向林晓棠。", names)).toEqual({
      speaker: "阿飞",
      text: "阿飞看向小棠。",
    });
  });

  it("applies portrait pack override URL", () => {
    const pack = {
      byStem: {},
      byLead: { suming: "data:image/png;base64,xx" },
    };
    const mapped = mapPortraitsForPlayer(
      [
        {
          name: "苏明",
          url: "/assets/portraits/suming-shame.png",
          side: "left",
          active: true,
        },
      ],
      { suming: "阿飞", lin_xiaotang: "林晓棠" },
      pack,
    );
    expect(mapped[0]?.name).toBe("阿飞");
    expect(mapped[0]?.url).toBe("data:image/png;base64,xx");
  });
});
