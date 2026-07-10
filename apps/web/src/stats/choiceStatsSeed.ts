/**
 * Bootstrap community weights so the first players still see Telltale-like %.
 * Replaced/overpowered by real local + remote counts over time.
 * Not secret truth — demo hospitality only.
 */

import type { ChoiceCountMap } from "./choiceStatsTypes";

export const CHOICE_STATS_SEED: ChoiceCountMap = {
  "ch01_delete_or_shot.delete": 420,
  "ch01_delete_or_shot.screenshot": 580,

  "ch01_property_timing.go": 610,
  "ch01_property_timing.delay": 390,

  "ch01_product_approach.demo": 340,
  "ch01_product_approach.pay": 210,
  "ch01_product_approach.privacy": 280,
  "ch01_product_approach.retreat": 170,

  "ch01_demo_react.proceed": 640,
  "ch01_demo_react.close": 360,

  "ch01_checkout_nerve.confirm": 530,
  "ch01_checkout_nerve.price": 470,
};
