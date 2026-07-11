import type {
  BrowserCharacterPack,
  LockedCharacterBinding,
  StoryCharacterBindings,
} from "./characterPackTypes";

export function bindingFromPack(
  pack: BrowserCharacterPack,
  lockedAt: string,
): LockedCharacterBinding {
  if (!pack.baseAsset) throw new Error("Character pack has no accepted base asset");
  return {
    slotId: pack.slotId,
    packId: pack.id,
    baseUrl: pack.baseAsset.url,
    moodUrls: Object.fromEntries(
      Object.entries(pack.moodAssets).flatMap(([mood, asset]) =>
        asset ? [[mood, asset.url]] : [],
      ),
    ),
    lockedAt,
  };
}

/** Existing slot wins: a story run never silently changes actors after lock. */
export function lockCharacterSlot(
  bindings: StoryCharacterBindings,
  binding: LockedCharacterBinding,
): StoryCharacterBindings {
  if (bindings[binding.slotId]) return bindings;
  return { ...bindings, [binding.slotId]: structuredClone(binding) };
}

type RefreshedPackPayload = {
  readonly assets: readonly Readonly<Record<string, unknown>>[];
};

/** Refreshes private download URLs while preserving the actor and lock timestamp chosen for this run. */
export async function refreshCharacterBindingUrls(
  bindings: StoryCharacterBindings,
  getPack: (packId: string) => Promise<RefreshedPackPayload>,
): Promise<StoryCharacterBindings> {
  const entries = await Promise.all(
    Object.entries(bindings).map(async ([slotId, binding]) => {
      if (binding.packId.startsWith("official:")) return [slotId, binding] as const;
      try {
        const payload = await getPack(binding.packId);
        const base = payload.assets.find(
          (asset) => asset.assetKind === "base" && typeof asset.url === "string",
        );
        const moodUrls = Object.fromEntries(
          payload.assets.flatMap((asset) =>
            asset.assetKind === "mood" &&
            typeof asset.moodKey === "string" &&
            typeof asset.url === "string"
              ? [[asset.moodKey, asset.url]]
              : [],
          ),
        );
        return [
          slotId,
          {
            ...binding,
            baseUrl: typeof base?.url === "string" ? base.url : binding.baseUrl,
            moodUrls: Object.keys(moodUrls).length > 0 ? moodUrls : binding.moodUrls,
          },
        ] as const;
      } catch {
        return [slotId, binding] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as StoryCharacterBindings;
}
