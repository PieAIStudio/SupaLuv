/**
 * Pure RPS view-model builder — keeps React session free of presentation mapping.
 */

import type { CoPlayRole, RpsOpenPayloadV1 } from "./protocol";
import type { RpsDuelView } from "./RpsDuelOverlay";
import type { RpsThrow, RpsWinner } from "./rpsRules";

export interface RpsDuelState {
  readonly open: RpsOpenPayloadV1;
  readonly localThrow: RpsThrow | null;
  readonly hostThrow: RpsThrow | null;
  readonly guestThrow: RpsThrow | null;
  readonly result: RpsWinner | null;
  readonly globalNote: string | null;
}

export function buildRpsView(
  duel: RpsDuelState | null,
  role: CoPlayRole | undefined,
): RpsDuelView | null {
  if (!duel || !role) {
    return null;
  }
  return {
    duelId: duel.open.duelId,
    hostChoiceText: duel.open.hostChoiceText,
    guestChoiceText: duel.open.guestChoiceText,
    localThrow: duel.localThrow,
    remoteThrow: role === "host" ? duel.guestThrow : duel.hostThrow,
    result: duel.result,
    waitingRemote:
      Boolean(duel.localThrow) &&
      !duel.result &&
      !duel.globalNote &&
      (role === "host" ? !duel.guestThrow : !duel.hostThrow),
    globalNote: duel.globalNote,
  };
}
