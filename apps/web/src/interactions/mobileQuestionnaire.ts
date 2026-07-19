import type { StoryInteractionDefinition, StoryInteractionVariantId } from "./types";

export const MOBILE_QUESTIONNAIRE_VERSION = "mobile-questionnaire-v1";

/** Default ch02 neighbor-tolerance apply form; matching = ch03 personality questionnaire. */
export type MobileQuestionnaireVariant = "default" | "matching";

export interface MobileQuestionnaireOption {
  readonly id: string;
  readonly choiceId: string;
}

export interface MobileQuestionnaireQuestion {
  readonly id: string;
  /** i18n leaf under interaction.mobile.variant.<variant>.question / .option */
  readonly questionKey: string;
  readonly options: readonly MobileQuestionnaireOption[];
  readonly skipChoiceId: string;
}

export interface MobileQuestionnairePayload {
  readonly variant: MobileQuestionnaireVariant;
  readonly questions: readonly MobileQuestionnaireQuestion[];
}

/** Authored questionnaire beats; no camera, upload, or free text. Choice IDs stay shared across variants. */
export const mobileQuestionnaireDefaultQuestions: readonly MobileQuestionnaireQuestion[] = [
  {
    id: "mq-neighbor",
    questionKey: "neighbor",
    options: [
      { id: "average", choiceId: "mobile_questionnaire_q1_average" },
      { id: "good", choiceId: "mobile_questionnaire_q1_good" },
      { id: "excellent", choiceId: "mobile_questionnaire_q1_excellent" },
      { id: "skip_rate", choiceId: "mobile_questionnaire_q1_decline" },
    ],
    skipChoiceId: "mobile_questionnaire_q1_skip",
  },
  {
    id: "mq-humanlike",
    questionKey: "humanlike",
    options: [
      { id: "mind", choiceId: "mobile_questionnaire_q2_mind" },
      { id: "fine", choiceId: "mobile_questionnaire_q2_fine" },
      { id: "unsure", choiceId: "mobile_questionnaire_q2_unsure" },
    ],
    skipChoiceId: "mobile_questionnaire_q2_skip",
  },
  {
    id: "mq-room",
    questionKey: "room",
    options: [
      { id: "yes", choiceId: "mobile_questionnaire_q3_yes" },
      { id: "no", choiceId: "mobile_questionnaire_q3_no" },
      { id: "convertible", choiceId: "mobile_questionnaire_q3_convertible" },
    ],
    skipChoiceId: "mobile_questionnaire_q3_skip",
  },
] as const;

/** ch03 matching questionnaire — same choice topology, different display payload. */
export const mobileQuestionnaireMatchingQuestions: readonly MobileQuestionnaireQuestion[] = [
  {
    id: "mq-match-humanlike",
    questionKey: "humanlike",
    options: [
      { id: "dont_mind", choiceId: "mobile_questionnaire_q1_average" },
      { id: "slightly_mind", choiceId: "mobile_questionnaire_q1_good" },
      { id: "strongly_mind", choiceId: "mobile_questionnaire_q1_excellent" },
      { id: "opposite", choiceId: "mobile_questionnaire_q1_decline" },
    ],
    skipChoiceId: "mobile_questionnaire_q1_skip",
  },
  {
    id: "mq-match-grudge",
    questionKey: "grudge",
    options: [
      { id: "zero", choiceId: "mobile_questionnaire_q2_mind" },
      { id: "night", choiceId: "mobile_questionnaire_q2_fine" },
      { id: "month", choiceId: "mobile_questionnaire_q2_unsure" },
    ],
    skipChoiceId: "mobile_questionnaire_q2_skip",
  },
  {
    id: "mq-match-makeup",
    questionKey: "makeup",
    options: [
      { id: "apologize", choiceId: "mobile_questionnaire_q3_yes" },
      { id: "wait", choiceId: "mobile_questionnaire_q3_no" },
      { id: "pretend", choiceId: "mobile_questionnaire_q3_convertible" },
    ],
    skipChoiceId: "mobile_questionnaire_q3_skip",
  },
] as const;

/** @deprecated Prefer resolveMobileQuestionnairePayload; kept for tests expecting flat default list. */
export const mobileQuestionnaireQuestions = mobileQuestionnaireDefaultQuestions;

export const mobileQuestionnaireInteraction: StoryInteractionDefinition = {
  id: MOBILE_QUESTIONNAIRE_VERSION,
  type: "mobile-questionnaire",
  version: MOBILE_QUESTIONNAIRE_VERSION,
  title: "手机问卷",
  stepCount: mobileQuestionnaireDefaultQuestions.length,
};

export function resolveMobileQuestionnaireVariant(
  variant: StoryInteractionVariantId | null | undefined,
): MobileQuestionnaireVariant {
  if (variant === "matching") {
    return "matching";
  }
  return "default";
}

export function resolveMobileQuestionnairePayload(
  variant: StoryInteractionVariantId | null | undefined,
): MobileQuestionnairePayload {
  const resolved = resolveMobileQuestionnaireVariant(variant);
  if (resolved === "matching") {
    return { variant: "matching", questions: mobileQuestionnaireMatchingQuestions };
  }
  return { variant: "default", questions: mobileQuestionnaireDefaultQuestions };
}
