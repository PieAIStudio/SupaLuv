/**
 * F — 预言家：玩家在关键抉择前猜「多数会选哪边」，章末揭晓。
 * Session-only memory (not localStorage) — one run of the chapter.
 */

export interface OracleGuess {
  readonly decisionId: string;
  readonly predictedChoiceId: string;
  readonly predictedLabel: string;
  readonly sceneId: string;
}

const guesses = new Map<string, OracleGuess>();

export function clearOracleGuesses(): void {
  guesses.clear();
}

export function setOracleGuess(guess: OracleGuess): void {
  guesses.set(guess.decisionId, guess);
}

export function getOracleGuess(decisionId: string): OracleGuess | null {
  return guesses.get(decisionId) ?? null;
}

export function listOracleGuesses(): readonly OracleGuess[] {
  return [...guesses.values()];
}

export interface OracleVerdict {
  readonly decisionId: string;
  readonly predictedLabel: string;
  readonly actualMajorityLabel: string;
  readonly correct: boolean;
}

export function scoreOracleVerdicts(
  majorityByDecision: ReadonlyMap<string, { choiceId: string; shortLabel: string }>,
): readonly OracleVerdict[] {
  const out: OracleVerdict[] = [];
  for (const guess of guesses.values()) {
    const actual = majorityByDecision.get(guess.decisionId);
    if (!actual) {
      continue;
    }
    out.push({
      decisionId: guess.decisionId,
      predictedLabel: guess.predictedLabel,
      actualMajorityLabel: actual.shortLabel,
      correct: actual.choiceId === guess.predictedChoiceId,
    });
  }
  return out;
}
