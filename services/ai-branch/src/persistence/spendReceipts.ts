import type { SpendReceiptRecord } from "./types.js";

/**
 * Read/list surface for commercial spend analysis.
 *
 * Side-choice receipts are written only via walletMeter.settleReservation →
 * supaluv.settle_spend_receipt (atomic wallet commit + receipt). Character and
 * ending charge receipts are written only inside atomic settle* store methods.
 * There is no app-side receipt-only writer for AI side choices.
 */
export interface SpendReceiptReader {
  listSpendReceipts(ownerId: string): Promise<readonly SpendReceiptRecord[]>;
}
