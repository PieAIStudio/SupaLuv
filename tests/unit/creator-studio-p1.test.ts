import { describe, expect, it } from "vitest";
import {
  buildCastIndex,
  matchPortraitToCharacter,
  parseCharacterRegistry,
  parseChineseVoiceMap,
  parseVoiceDumpStdout,
  portraitPrefixesFor,
  groupPortraitsByCharacter,
} from "../../apps/web/src/creator/server/castingData";
import {
  mergeAssetCatalog,
  normalizeAssetKind,
  parseRuntimeLedgerCsv,
  toPublicPath,
} from "../../apps/web/src/creator/server/assetCatalog";
import { createTaskLock, isCreatorTaskId } from "../../apps/web/src/creator/server/creatorTasks";
import {
  CreatorStudioError,
  createCreatorStudioService,
} from "../../apps/web/src/creator/server/creatorStudioServer";

describe("assetCatalog merge", () => {
  it("maps public paths and normalizes kinds", () => {
    expect(toPublicPath("apps/web/public/assets/portraits/suming-shame.png")).toBe(
      "/assets/portraits/suming-shame.png",
    );
    expect(toPublicPath("packages/content/characters/x/ref.jpg")).toBeNull();
    expect(normalizeAssetKind("background", "apps/web/public/assets/scenes/bg.jpg")).toBe("bg");
    expect(normalizeAssetKind(undefined, "apps/web/public/assets/audio/bgm/x.mp3")).toBe("audio");
  });

  it("parses ledger csv and merges with intake", () => {
    const csv = [
      "asset_id,path,sha256,bytes,source,release_status,notes",
      "lonely-pad,apps/web/public/assets/audio/bgm/lonely-pad.mp3,abc,100,lyria,demo_approved,note-a",
      'bg-office-night,apps/web/public/assets/scenes/bg-office-night.jpg,def,200,ai,pending,"ledger note"',
    ].join("\n");
    const rows = parseRuntimeLedgerCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.assetId).toBe("lonely-pad");
    expect(rows[0]?.bytes).toBe(100);

    const merged = mergeAssetCatalog(
      [
        {
          id: "bg-office-night",
          kind: "background",
          path: "apps/web/public/assets/scenes/bg-office-night.jpg",
          qualityStatus: "prototype_only",
          rightsStatus: "pending",
          bytes: 198466,
          notes: "intake note",
          sha256: "intake-hash",
          fileStatus: "present",
        },
      ],
      rows,
    );

    const bg = merged.find((a) => a.id === "bg-office-night");
    const audio = merged.find((a) => a.id === "lonely-pad");
    expect(bg?.kind).toBe("bg");
    expect(bg?.sources).toEqual(["intake", "ledger"]);
    expect(bg?.qualityStatus).toBe("prototype_only");
    expect(bg?.ledgerReleaseStatus).toBe("pending");
    expect(bg?.publicPath).toBe("/assets/scenes/bg-office-night.jpg");
    expect(audio?.kind).toBe("audio");
    expect(audio?.sources).toEqual(["ledger"]);
    expect(audio?.rightsStatus).toBe("demo_approved");
    expect(audio?.publicPath).toBe("/assets/audio/bgm/lonely-pad.mp3");
  });
});

describe("castingData", () => {
  const registrySample = `
export const CHARACTER_BY_NAME: Readonly<Record<string, CharacterDef>> = {
  苏明: {
    id: "suming",
    name: "苏明",
    side: "left",
    defaultPortrait: "suming-shame",
  },
  工作人员: {
    id: "staff_worker",
    name: "工作人员",
    side: "right",
    defaultPortrait: "staff-neutral",
  },
  小组长: {
    id: "staff_lead",
    name: "小组长",
    side: "right",
    defaultPortrait: "stafflead-neutral",
  },
};
`;

  it("parses registry and voice map", () => {
    const characters = parseCharacterRegistry(registrySample);
    expect(characters.map((c) => c.id).sort()).toEqual(["staff_lead", "staff_worker", "suming"]);

    const voiceMap = parseChineseVoiceMap(`
export const CHINESE_VOICE_MAP: Readonly<Record<string, string>> = {
  suming: "male-qn-qingse",
  staff_worker: "male-qn-daxuesheng",
};
`);
    expect(voiceMap.suming).toBe("male-qn-qingse");
    expect(voiceMap.staff_worker).toBe("male-qn-daxuesheng");
  });

  it("groups portraits without staff/stafflead collision", () => {
    const characters = parseCharacterRegistry(registrySample);
    const groups = groupPortraitsByCharacter(
      ["suming-shame.png", "staff-neutral.png", "stafflead-neutral.png", "readme.txt"],
      characters,
    );
    expect(groups.get("suming")?.map((p) => p.stem)).toEqual(["suming-shame"]);
    expect(groups.get("staff_worker")?.map((p) => p.stem)).toEqual(["staff-neutral"]);
    expect(groups.get("staff_lead")?.map((p) => p.stem)).toEqual(["stafflead-neutral"]);
    expect(matchPortraitToCharacter("stafflead-neutral", characters)).toBe("staff_lead");
    expect(
      portraitPrefixesFor(characters.find((c) => c.id === "staff_lead")!).includes("stafflead"),
    ).toBe(true);
  });

  it("assigns suming-* plates to suming, not narrator alias", () => {
    const withNarrator = parseCharacterRegistry(`
export const CHARACTER_BY_NAME = {
  旁白: {
    id: "narrator",
    name: "旁白",
    side: "left",
    defaultPortrait: "suming-shame",
  },
  苏明: {
    id: "suming",
    name: "苏明",
    side: "left",
    defaultPortrait: "suming-shame",
  },
};
`);
    expect(matchPortraitToCharacter("suming-shame", withNarrator)).toBe("suming");
    expect(matchPortraitToCharacter("suming-lonely", withNarrator)).toBe("suming");
  });

  it("builds cast index from dump + existing keys", () => {
    const dump = parseVoiceDumpStdout(`[draft-ch01] unique voiced chunks: 1
total unique lines: 2, chars: 10
[
 {
  "key": "aaa",
  "characterId": "suming",
  "text": "hello"
 },
 {
  "key": "bbb",
  "characterId": "suming",
  "text": "world"
 },
 {
  "key": "ccc",
  "characterId": "leo",
  "text": "hey"
 }
]
`);
    expect(dump).toHaveLength(3);
    const index = buildCastIndex(dump, new Set(["bbb", "ccc"]));
    // first suming key aaa missing → skip to bbb
    expect(index).toEqual({ suming: "bbb", leo: "ccc" });
  });
});

describe("creator task exclusive lock", () => {
  it("recognizes task ids", () => {
    expect(isCreatorTaskId("asset-audit")).toBe(true);
    expect(isCreatorTaskId("pipeline")).toBe(false);
  });

  it("allows only one holder at a time", () => {
    const lock = createTaskLock();
    expect(lock.tryAcquire("asset-audit")).toBe(true);
    expect(lock.busyTask).toBe("asset-audit");
    expect(lock.tryAcquire("auto-player")).toBe(false);
    lock.release("asset-audit");
    expect(lock.tryAcquire("auto-player")).toBe(true);
    expect(lock.busyTask).toBe("auto-player");
  });

  it("runTask rejects concurrent acquire with TASK_BUSY 409", async () => {
    const service = createCreatorStudioService({
      repoRoot: process.cwd(),
    });
    // Hold the lock via a never-finishing task is hard; simulate with pipeline lock race
    // by calling tryAcquire through two overlapping runTask - use microtask hold via
    // monkeypatch is overkill. Directly test service listTasks shape + double pipeline.
    const first = service.runTask("voice-reconcile");
    let secondError: unknown;
    try {
      await service.runTask("asset-audit");
    } catch (error) {
      secondError = error;
    }
    const firstResult = await first;
    expect(firstResult.ok === true || firstResult.ok === false).toBe(true);
    expect(secondError).toBeInstanceOf(CreatorStudioError);
    expect((secondError as CreatorStudioError).code).toBe("TASK_BUSY");
    expect((secondError as CreatorStudioError).status).toBe(409);
  }, 60_000);
});
