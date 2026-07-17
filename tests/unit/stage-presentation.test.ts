import { describe, expect, it } from "vitest";
import {
  mapDialogueForPlayer,
  mapPortraitsForPlayer,
  resolveStageMotion,
} from "../../apps/web/src/views/play/lib/stagePresentation";

describe("stagePresentation", () => {
  it("rewrites lead speaker and body names", () => {
    const names = { suming: "阿飞", lin_xiaotang: "小棠" };
    expect(mapDialogueForPlayer("苏明", "苏明看向石佩欣。", names)).toEqual({
      speaker: "阿飞",
      text: "阿飞看向小棠。",
    });
  });

  it("binds the cast actor by canonical name only, never by NPC placeholder stems", () => {
    const bindings = {
      lead_zhou_lu: {
        moodUrls: { neutral: "data:image/png;base64,cast" },
        baseUrl: "data:image/png;base64,cast",
      },
    } as never;
    const mapped = mapPortraitsForPlayer(
      [
        { name: "石佩欣", url: "/assets/portraits/zhou-neutral.png", side: "right", active: true },
        { name: "雷欧", url: "/assets/portraits/leo-neutral.png", side: "right", active: false },
        {
          name: "陈佳",
          url: "/assets/portraits/chenjia-neutral.png",
          side: "right",
          active: false,
        },
      ],
      { suming: "苏明", lin_xiaotang: "石佩欣" },
      { byStem: {}, byLead: {} },
      bindings,
    );
    const byName = Object.fromEntries(mapped.map((p) => [p.name, p.url]));
    expect(byName["石佩欣"]).toBe("data:image/png;base64,cast");
    expect(byName["雷欧"]).toBe("/assets/portraits/leo-neutral.png");
    expect(byName["陈佳"]).toBe("/assets/portraits/chenjia-neutral.png");
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

  it("keeps authored motion restrained and disables it for reduced motion", () => {
    expect(resolveStageMotion("slow_push", false)).toBe("slow_push");
    expect(resolveStageMotion("flash", false)).toBe("flash");
    expect(resolveStageMotion("slow_push", true)).toBe("none");
  });
});
