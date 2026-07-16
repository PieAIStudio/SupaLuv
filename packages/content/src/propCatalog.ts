import candidateManifest from "../assets/candidates/round15-props/candidate-manifest.json";

export type PropCutInId =
  | "prop-protocol-terms"
  | "prop-barcode-shift"
  | "prop-rental-receipt"
  | "prop-application-nda"
  | "prop-approval-sms";

export interface PropCutInDefinition {
  readonly id: PropCutInId;
  readonly storyId: "draft-ch01" | "draft-ch02";
  readonly sceneId: string;
  readonly title: string;
  readonly imageUrl: string;
  readonly altText: string;
  readonly accessibleText: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly candidateOutputPath: string;
  readonly provenanceType: string;
}

const PROP_TRIGGER_BY_ID = {
  "prop-protocol-terms": {
    storyId: "draft-ch01",
    sceneId: "dch01_protocol_test",
    title: "情感真实性测试协议 · 第 3 页",
  },
  "prop-barcode-shift": {
    storyId: "draft-ch02",
    sceneId: "dch02_barcode_sweep",
    title: "惠万家夜班 · 条码与订单",
  },
  "prop-rental-receipt": {
    storyId: "draft-ch02",
    sceneId: "dch02_s020",
    title: "九百块房租收条",
  },
  "prop-application-nda": {
    storyId: "draft-ch02",
    sceneId: "dch02_s037",
    title: "体验官申请与超级保密协议",
  },
  "prop-approval-sms": {
    storyId: "draft-ch02",
    sceneId: "dch02_s040",
    title: "系统通知 · 初审通过",
  },
} as const satisfies Record<
  PropCutInId,
  {
    readonly storyId: "draft-ch01" | "draft-ch02";
    readonly sceneId: string;
    readonly title: string;
  }
>;

interface CandidateAssetRecord {
  readonly id: string;
  readonly accessibleText: string;
  readonly altText: string;
  readonly outputPath: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly provenance: { readonly type: string };
}
const candidateAssets = candidateManifest.assets as readonly CandidateAssetRecord[];

export const PROP_CUTIN_CATALOG: readonly PropCutInDefinition[] = Object.freeze(
  candidateAssets.map((asset) => {
    const trigger = PROP_TRIGGER_BY_ID[asset.id as PropCutInId];
    if (!trigger) {
      throw new Error(`Unknown Round 15 prop candidate id: ${asset.id}`);
    }
    return Object.freeze({
      id: asset.id as PropCutInId,
      storyId: trigger.storyId,
      sceneId: trigger.sceneId,
      title: trigger.title,
      imageUrl: `/assets/props/${asset.id}.png`,
      altText: asset.altText,
      accessibleText: asset.accessibleText,
      sha256: asset.sha256,
      bytes: asset.bytes,
      candidateOutputPath: asset.outputPath,
      provenanceType: asset.provenance.type,
    });
  }),
);

const PROP_BY_SCENE = new Map(
  PROP_CUTIN_CATALOG.map((definition) => [
    `${definition.storyId}/${definition.sceneId}`,
    definition,
  ]),
);

/** Exact, deterministic scene resolver. Broad candidate scene ranges are not runtime triggers. */
export function resolvePropCutIn(
  storyId: string,
  sceneId: string | null,
): PropCutInDefinition | null {
  if (!sceneId) {
    return null;
  }
  return PROP_BY_SCENE.get(`${storyId}/${sceneId}`) ?? null;
}
