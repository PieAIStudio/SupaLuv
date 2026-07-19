# wallet/

**Owns**: battery reserve/commit/refund metering and spend-receipt HTTP routes for AI product actions.

**Does not own**: SwimmerBackend wallet implementation, auth token verification, commercial runtime composition.

**Entry**: `walletMeter.ts` (metering); `spendRoutes.ts` (receipt HTTP).
