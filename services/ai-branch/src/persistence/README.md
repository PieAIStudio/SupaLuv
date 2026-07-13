# Server commercial persistence

Last reviewed: 2026-07-13 (Round A rework)

## Responsibility

Atomic commercial persistence for SupaLuv server AI features:

| Module                     | Owns                                        | Atomic settle               |
| -------------------------- | ------------------------------------------- | --------------------------- |
| `CharacterGenerationStore` | packs, references, generated assets, claims | `settleCharacterGeneration` |
| `EndingSessionStore`       | story runs, ending sessions, checkpoints    | `settleEndingCheckpoint`    |
| `SpendReceiptReader`       | list/read spend receipts                    | none (read only)            |

Side-branch AI option receipts use `SideBranchSpendRecorder.recordSideBranchSpend` after successful delivery. That method accepts only `SideBranchSpendInput` (no `actionKind` / `scopeType`); adapters always write `actionKind: "ai_side_choice"` and `scopeType: "story_run"`. Character and ending charges must never use that path — only `settle*`.

## Not responsible

- Wallet reserve/commit/refund (`walletMeter.ts`)
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

Evolving seam (Round A). Observable commercial behaviour frozen; module boundaries may deepen further.
