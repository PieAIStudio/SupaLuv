import type { StoryInteractionDefinition } from "./types";

export const MOBILE_QUESTIONNAIRE_VERSION = "mobile-questionnaire-v1";

export interface MobileQuestionnaireOption {
  readonly id: string;
  readonly choiceId: string;
}

export interface MobileQuestionnaireQuestion {
  readonly id: string;
  readonly questionKey: "neighbor" | "humanlike" | "room";
  readonly options: readonly MobileQuestionnaireOption[];
  readonly skipChoiceId: string;
}

/** Authored questionnaire beats; no camera, upload, or free text. */
export const mobileQuestionnaireQuestions: readonly MobileQuestionnaireQuestion[] = [
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

export const mobileQuestionnaireInteraction: StoryInteractionDefinition = {
  id: MOBILE_QUESTIONNAIRE_VERSION,
  type: "mobile-questionnaire",
  version: MOBILE_QUESTIONNAIRE_VERSION,
  title: "手机问卷",
  stepCount: mobileQuestionnaireQuestions.length,
};
