# Server commercial persistence

Last reviewed: 2026-07-13 (Round E commercial hygiene)

## Responsibility

Atomic commercial persistence for SupaLuv server AI features:

| Module                     | Owns                                        | Atomic settle               |
| -------------------------- | ------------------------------------------- | --------------------------- |
| `CharacterGenerationStore` | packs, references, generated assets, claims | `settleCharacterGeneration` |
| `EndingSessionStore`       | story runs, ending sessions, checkpoints    | `settleEndingCheckpoint`    |
| `SpendReceiptReader`       | list/read spend receipts                    | none (read only)            |

AI side-choice settlement is **not** a persistence writer. The sole production
path is `routeTable` → `walletMeter.settleReservation` → Supabase RPC
`supaluv.settle_spend_receipt` (atomic wallet commit + idempotent receipt).
Character and ending charges must never use that wallet path for domain writes —
only their store `settle*` methods.

## Not responsible

- Wallet reserve/commit/refund/settle (`walletMeter.ts`)
- HTTP routes, moderation, image providers
- Browser save state (`apps/web/src/persistence/`)
- Reading `process.env` (composition stays in `commercialRouteRuntime.ts` / `compose.ts`)

## Entrypoints

| Path          | Role                                         |
| ------------- | -------------------------------------------- |
| `index.ts`    | stable public types + factories              |
| `memory.ts`   | in-memory adapters (shared ledger)           |
| `supabase.ts` | Supabase table/RPC adapters                  |
| `compose.ts`  | credentials → modules (no env inside domain) |

## Verify

```bash
pnpm exec vitest run tests/unit/commercial-persistence.test.ts tests/unit/character-generation.test.ts tests/unit/ai-ending-service.test.ts
pnpm typecheck
```

## Stability

Evolving seam. Observable commercial behaviour frozen; module boundaries may deepen further.
