/**
 * Distinct accessible names for Oracle predictions vs authored story choices.
 * Visible labels may match; screen-reader names must not.
 */

export const ORACLE_CHOICES_LABEL_ID = "oracle-choices-label";
export const AUTHORED_CHOICES_LABEL_ID = "authored-choices-label";

export function formatOracleChoiceAccessibleName(ariaPrefix: string, shortLabel: string): string {
  return `${ariaPrefix}: ${shortLabel}`;
}

export function formatAuthoredChoiceAccessibleName(ariaPrefix: string, choiceText: string): string {
  return `${ariaPrefix}: ${choiceText}`;
}
