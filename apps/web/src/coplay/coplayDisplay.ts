/**
 * Pure co-play display mapping — locale copy in, visible strings out.
 * Keeps protocol IDs / RPS wire values out of presentation.
 */

import type { RpsThrow, RpsWinner } from "./rpsRules";

/** Replace `{key}` placeholders; unknown keys stay as written. */
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}

export type RpsThrowLabels = Readonly<Record<RpsThrow, string>>;

export interface RpsResultCopy {
  readonly draw: string;
  /** Template with `{choice}` */
  readonly hostWon: string;
  /** Template with `{choice}` */
  readonly guestWon: string;
}

export function rpsThrowLabel(value: RpsThrow, labels: RpsThrowLabels): string {
  return labels[value];
}

export function formatRpsResultCopy(args: {
  readonly result: RpsWinner | null;
  readonly globalNote: string | null;
  readonly hostChoiceText: string;
  readonly guestChoiceText: string;
  readonly copy: RpsResultCopy;
}): string | null {
  if (args.globalNote) {
    return args.globalNote;
  }
  if (args.result === "draw") {
    return args.copy.draw;
  }
  if (args.result === "host") {
    return fillTemplate(args.copy.hostWon, { choice: args.hostChoiceText });
  }
  if (args.result === "guest") {
    return fillTemplate(args.copy.guestWon, { choice: args.guestChoiceText });
  }
  return null;
}

export function formatRpsStatus(args: {
  readonly globalNote: string | null;
  readonly localThrow: RpsThrow | null;
  readonly remoteThrow: RpsThrow | null;
  readonly waitingRemote: boolean;
  readonly labels: RpsThrowLabels;
  readonly copy: {
    readonly usedGlobal: string;
    /** Template with `{throw}` */
    readonly youThrew: string;
    readonly waiting: string;
    readonly pleaseThrow: string;
    /** Template with `{throw}` */
    readonly opponent: string;
  };
}): string {
  if (args.globalNote) {
    return args.copy.usedGlobal;
  }
  if (!args.localThrow) {
    return args.copy.pleaseThrow;
  }
  let status = fillTemplate(args.copy.youThrew, {
    throw: rpsThrowLabel(args.localThrow, args.labels),
  });
  if (args.waitingRemote) {
    status += args.copy.waiting;
  }
  if (args.remoteThrow && !args.globalNote) {
    status += fillTemplate(args.copy.opponent, {
      throw: rpsThrowLabel(args.remoteThrow, args.labels),
    });
  }
  return status;
}

export function formatCursorLabel(args: {
  readonly alias: string;
  readonly isHost: boolean;
  /** e.g. " · Host" / " · 房主" */
  readonly hostSuffix: string;
}): string {
  return args.isHost ? `${args.alias}${args.hostSuffix}` : args.alias;
}

/**
 * Legacy stats notes are entirely peer supplied. Without an authoritative
 * aggregate, never parse their percentage, side, or label into player copy.
 */
export function localizeGlobalEchoNote(args: {
  readonly note: string;
  readonly appliedCopy: string;
  readonly hostTemplate: string;
  readonly guestTemplate: string;
}): string {
  return args.appliedCopy;
}
