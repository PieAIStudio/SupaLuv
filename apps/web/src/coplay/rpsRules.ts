/**
 * Rock-paper-scissors resolution for co-play choice conflicts.
 * Pure domain — no React, no transport.
 */

export type RpsThrow = "rock" | "paper" | "scissors";

export type RpsWinner = "host" | "guest" | "draw";

export const RPS_THROWS: readonly RpsThrow[] = ["rock", "paper", "scissors"];

/** Wire IDs only — display labels come from locale via `coplayDisplay`. */
export function isRpsThrow(value: unknown): value is RpsThrow {
  return value === "rock" || value === "paper" || value === "scissors";
}

/**
 * Classic RPS: rock > scissors > paper > rock.
 * Draw when equal.
 */
export function resolveRps(hostThrow: RpsThrow, guestThrow: RpsThrow): RpsWinner {
  if (hostThrow === guestThrow) {
    return "draw";
  }
  if (
    (hostThrow === "rock" && guestThrow === "scissors") ||
    (hostThrow === "scissors" && guestThrow === "paper") ||
    (hostThrow === "paper" && guestThrow === "rock")
  ) {
    return "host";
  }
  return "guest";
}

export function winningChoiceIndex(args: {
  readonly winner: RpsWinner;
  readonly hostChoiceIndex: number;
  readonly guestChoiceIndex: number;
}): number | null {
  if (args.winner === "draw") {
    return null;
  }
  return args.winner === "host" ? args.hostChoiceIndex : args.guestChoiceIndex;
}

/** Host should open a duel when a guest voted a different non-continue option. */
export function shouldOpenRpsDuel(args: {
  readonly hostChoiceIndex: number;
  readonly guestVotes: readonly { readonly choiceIndex: number }[];
  readonly choiceCount: number;
}): boolean {
  if (args.choiceCount < 2) {
    return false;
  }
  if (args.guestVotes.length === 0) {
    return false;
  }
  // Use first guest vote (v1 single-guest focus).
  const guest = args.guestVotes[0]!;
  return guest.choiceIndex !== args.hostChoiceIndex;
}
