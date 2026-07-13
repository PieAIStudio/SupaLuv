import type { SideBranchSpendInput, SpendReceiptRecord } from "./types.js";

/**
 * Read/list surface for commercial spend analysis.
 * Character and ending charge receipts are written only inside atomic settle*.
 */
export interface SpendReceiptReader {
  listSpendReceipts(ownerId: string): Promise<readonly SpendReceiptRecord[]>;
}

/**
 * Side-branch AI option receipts are recorded after successful delivery.
 * Intentionally separate from SpendReceiptReader so routes cannot write
 * character/ending receipts outside settle* atomicity.
 *
 * Structural invariant: callers cannot pass actionKind or scopeType.
 * Adapters always persist actionKind `"ai_side_choice"` and scopeType `"story_run"`.
 */
export interface SideBranchSpendRecorder {
  recordSideBranchSpend(input: SideBranchSpendInput): Promise<SpendReceiptRecord>;
}
