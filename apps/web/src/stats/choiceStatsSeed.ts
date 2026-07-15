/**
 * Local presentation sample so an offline demo can still exercise percentage
 * rendering. These numbers are not remote users, global population, or product
 * truth. Any UI that includes them must label the result as a local sample.
 *
 * Keys must stay within the shared production catalog choice IDs.
 */

import type { ChoiceCountMap } from "./choiceStatsTypes";

export const CHOICE_STATS_SEED: ChoiceCountMap = {
  d1_bones_accept: 420,
  d1_bones_cold: 580,

  d1_tell_flat: 610,
  d1_tell_hard: 390,

  d2_catch_firm: 340,
  d2_catch_soft: 660,

  d2_admit_me: 530,
  d2_admit_me_hard: 470,
};
