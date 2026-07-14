import type { StoryInteractionDefinition } from "./types";

export const PROTOCOL_TEST_VERSION = "protocol-test-v1";

export type ProtocolTestResponse = "literal" | "model" | "skip";

export interface ProtocolTestClause {
  readonly id: string;
  readonly clauseKey: "clear" | "iterate" | "truth";
  readonly choiceIds: Readonly<Record<Exclude<ProtocolTestResponse, "skip">, string>>;
  readonly skipChoiceId: string;
}

/** Three clause cards; prose keys resolve via i18n; choice IDs match Ink. */
export const protocolTestClauses: readonly ProtocolTestClause[] = [
  {
    id: "protocol-clause-01",
    clauseKey: "clear",
    choiceIds: {
      literal: "protocol_test_q1_literal",
      model: "protocol_test_q1_model",
    },
    skipChoiceId: "protocol_test_q1_skip",
  },
  {
    id: "protocol-clause-02",
    clauseKey: "iterate",
    choiceIds: {
      literal: "protocol_test_q2_literal",
      model: "protocol_test_q2_model",
    },
    skipChoiceId: "protocol_test_q2_skip",
  },
  {
    id: "protocol-clause-03",
    clauseKey: "truth",
    choiceIds: {
      literal: "protocol_test_q3_literal",
      model: "protocol_test_q3_model",
    },
    skipChoiceId: "protocol_test_q3_skip",
  },
] as const;

export const protocolTestInteraction: StoryInteractionDefinition = {
  id: PROTOCOL_TEST_VERSION,
  type: "protocol-test",
  version: PROTOCOL_TEST_VERSION,
  title: "协议条款校对",
  stepCount: protocolTestClauses.length,
};
