import type { StoryInteractionDefinition } from "./types";

export const BARCODE_SWEEP_VERSION = "barcode-sweep-v1";

export interface BarcodeSweepRound {
  readonly id: string;
  readonly productKey: "snack" | "drink" | "instant";
  /** Ordered segment taps required before the round can complete (no timer). */
  readonly segments: readonly ["a", "b", "c"];
  readonly completeChoiceId: string;
  readonly skipChoiceId: string;
}

export const barcodeSweepRounds: readonly BarcodeSweepRound[] = [
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

export const barcodeSweepInteraction: StoryInteractionDefinition = {
  id: BARCODE_SWEEP_VERSION,
  type: "barcode-sweep",
  version: BARCODE_SWEEP_VERSION,
  title: "条码连扫",
  stepCount: barcodeSweepRounds.length,
};
