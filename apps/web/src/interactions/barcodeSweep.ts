import type { StoryInteractionDefinition, StoryInteractionVariantId } from "./types";

export const BARCODE_SWEEP_VERSION = "barcode-sweep-v1";

/** Default ch02 supermarket practice; activation = ch03 unboxing compliance. */
export type BarcodeSweepVariant = "default" | "activation";

export interface BarcodeSweepRound {
  readonly id: string;
  /** i18n leaf under interaction.barcode.variant.<variant>.product */
  readonly productKey: string;
  /** Ordered segment taps required before the round can complete (no timer). */
  readonly segments: readonly ["a", "b", "c"];
  readonly completeChoiceId: string;
  readonly skipChoiceId: string;
}

export interface BarcodeSweepPayload {
  readonly variant: BarcodeSweepVariant;
  readonly rounds: readonly BarcodeSweepRound[];
}

export const barcodeSweepDefaultRounds: readonly BarcodeSweepRound[] = [
  {
    id: "barcode-round-01",
    productKey: "snack",
    segments: ["a", "b", "c"],
    completeChoiceId: "barcode_sweep_q1_ok",
    skipChoiceId: "barcode_sweep_q1_skip",
  },
  {
    id: "barcode-round-02",
    productKey: "drink",
    segments: ["a", "b", "c"],
    completeChoiceId: "barcode_sweep_q2_ok",
    skipChoiceId: "barcode_sweep_q2_skip",
  },
  {
    id: "barcode-round-03",
    productKey: "instant",
    segments: ["a", "b", "c"],
    completeChoiceId: "barcode_sweep_q3_ok",
    skipChoiceId: "barcode_sweep_q3_skip",
  },
] as const;

/** ch03 activation scan — same choice topology, robot crate labels. */
export const barcodeSweepActivationRounds: readonly BarcodeSweepRound[] = [
  {
    id: "barcode-activation-01",
    productKey: "unit",
    segments: ["a", "b", "c"],
    completeChoiceId: "barcode_sweep_q1_ok",
    skipChoiceId: "barcode_sweep_q1_skip",
  },
  {
    id: "barcode-activation-02",
    productKey: "limb",
    segments: ["a", "b", "c"],
    completeChoiceId: "barcode_sweep_q2_ok",
    skipChoiceId: "barcode_sweep_q2_skip",
  },
  {
    id: "barcode-activation-03",
    productKey: "head",
    segments: ["a", "b", "c"],
    completeChoiceId: "barcode_sweep_q3_ok",
    skipChoiceId: "barcode_sweep_q3_skip",
  },
] as const;

/** @deprecated Prefer resolveBarcodeSweepPayload; kept for tests expecting flat default list. */
export const barcodeSweepRounds = barcodeSweepDefaultRounds;

export const barcodeSweepInteraction: StoryInteractionDefinition = {
  id: BARCODE_SWEEP_VERSION,
  type: "barcode-sweep",
  version: BARCODE_SWEEP_VERSION,
  title: "条码连扫",
  stepCount: barcodeSweepDefaultRounds.length,
};

export function resolveBarcodeSweepVariant(
  variant: StoryInteractionVariantId | null | undefined,
): BarcodeSweepVariant {
  if (variant === "activation") {
    return "activation";
  }
  return "default";
}

export function resolveBarcodeSweepPayload(
  variant: StoryInteractionVariantId | null | undefined,
): BarcodeSweepPayload {
  const resolved = resolveBarcodeSweepVariant(variant);
  if (resolved === "activation") {
    return { variant: "activation", rounds: barcodeSweepActivationRounds };
  }
  return { variant: "default", rounds: barcodeSweepDefaultRounds };
}
