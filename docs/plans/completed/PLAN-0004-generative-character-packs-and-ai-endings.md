---
id: PLAN-0004
title: Generative character packs and AI endings implementation plan
type: plan
status: completed
canonical: true
owner: ai-assisted
created: 2026-07-11
last_reviewed: 2026-07-12
domain: implementation
tags:
  - supaluv
  - ai
  - character-packs
  - endings
  - swimmer-ai-kit
  - swimmer-core
related:
  - SPEC-0002
  - REF-CURRENT-WORK
---

# Generative Character Packs and AI Endings Implementation Plan

> **For agentic workers:** Follow the project router and execute this plan task-by-task. The owner explicitly prohibited subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship live, paid, persistent adult-reference character packs and bounded interactive AI ending sessions while removing human-video content conflicts.

**Architecture:** Add one generic adult-reference assessment seam to SwimmerAIKit, add owner-scoped SupaLuv product persistence to SwimmerCore, and keep product orchestration in SupaLuv's existing AI service. Character packs and AI ending sessions are separate domain modules; paid delivery uses SwimmerCore transactions that atomically commit the wallet reservation, persist the delivered action, and write its spend receipt.

**Tech Stack:** React 19.2.5, Vite 8.0.10, TypeScript 6.0.3, InkJS 2.4.0, Mastra 1.50.x, Zod 3.25.76, Supabase JS 2.108.1, SwimmerUIKit 1.0.1, SwimmerAIKit 0.2.x, Gemini 3.1 Flash Image through OpenRouter's unified Image API by default (`@google/genai` retained for optional direct mode), Sightengine `face-age`, Vitest 4.1.5, Playwright 1.59.1.

**2026-07-12 checkpoint:** Blocks A–F deterministic implementation is complete
through Task 35. Task 36 live-provider proof remains open because the local
secret set has OpenRouter and Sightengine but no SwimmerCore service or wallet
credentials. Task 37 remains open until that live proof and hosted reconciliation
are complete; the plan must not be moved to `completed/` before then.

## Global constraints

- No subagents.
- The authored Ink story and authored endings remain free; every live AI action is battery-paid.
- No maximum-budget confirmation; reserve/commit/refund each action and itemize committed spend.
- Reject minor, uncertain, no-face, and multi-face human references before generation.
- Do not block public figures solely because of identity and do not add a SupaLuv-visible identity label.
- Allow adult black-humor / sex-comedy energy but block nudity, pornography, child sexual content, graphic violence, and hate.
- Maximum AI ending length is eight segments and the eighth segment must be terminal.
- Current human videos, triggers, and gallery unlocks must leave the content path; do not add generated video.
- Shared-library work uses isolated branches, passes repo-local verification, merges to `main`, and only then updates SupaLuv's formal dependency artifact.
- Preserve unrelated dirty-worktree changes and never stage them with this work.
- Every behavior change follows test-first RED -> GREEN -> REFACTOR.

---

## Block A — Shared adult-reference assessment

### Task 1: Establish isolated SwimmerAIKit worktree and baseline

**Files:**
- Read: `/Users/yuanfei/PieAI/SwimmerAIKit/AGENTS.md`
- Read: `/Users/yuanfei/PieAI/SwimmerAIKit/docs/reference/execution/current-work.md`
- Create worktree: `/Users/yuanfei/PieAI/SwimmerAIKit/.worktrees/supaluv-adult-reference`

**Interfaces:**
- Produces: clean branch `codex/supaluv-adult-reference` based on current `main`.

- [x] Verify repository state; unrelated TTS edits were isolated and later landed independently on `main`.
- [x] Create the worktree with the repository's worktree skill and branch prefix `codex/`.
- [x] Run `pnpm verify` in the worktree; baseline passed with 43 tests.
- [x] Record baseline commit `c32d21c` and merged upstream TTS commit `59cf86e`.

### Task 2: Define adult-reference assessment types

**Files:**
- Create: `/Users/yuanfei/PieAI/SwimmerAIKit/src/content-safety/adult-reference.ts`
- Modify: `/Users/yuanfei/PieAI/SwimmerAIKit/src/content-safety/index.ts`
- Test: `/Users/yuanfei/PieAI/SwimmerAIKit/tests/content-safety.test.ts`

**Interfaces:**
- Produces: `AdultReferenceStatus`, `AdultReferenceDecision`, `AdultReferencePolicy`, `parseAdultReferenceDecision(raw, policy)`.

- [x] Add a failing test that imports `parseAdultReferenceDecision` and expects `{ status: 'adult' }` for one face with `attributes.age.minor: 0.01`.
- [x] Run the focused test and observe the expected missing-function failure.
- [x] Implement the four statuses and configurable adult/minor thresholds.
- [x] Re-run the focused test; PASS.
- [x] Add RED/GREEN table cases for no face, artificial-only face, two real faces, thresholds, missing score, and classifier failure.

### Task 3: Add Sightengine adult-reference provider

**Files:**
- Modify: `/Users/yuanfei/PieAI/SwimmerAIKit/src/content-safety/adult-reference.ts`
- Modify: `/Users/yuanfei/PieAI/SwimmerAIKit/src/content-safety/create-moderation-provider.ts`
- Test: `/Users/yuanfei/PieAI/SwimmerAIKit/tests/content-safety.test.ts`

**Interfaces:**
- Produces: `reviewAdultReference(asset): Promise<AdultReferenceDecision>` on `ContentModerationProvider`.
- Consumes: existing `visualAssetBlob` and Sightengine credentials.

- [x] Add a failing fetch-stub test asserting `models=face-age` and `minor` for probability `0.93`.
- [x] Run the focused test and observe the expected missing-request failure.
- [x] Implement a fail-closed Sightengine request using the existing image upload seam.
- [x] Run the focused suite; PASS with 17 content-safety tests.
- [x] Re-run the full package suite without changing the existing visual moderation contract.

### Task 4: Verify, document, merge, and package SwimmerAIKit

**Files:**
- Modify: `/Users/yuanfei/PieAI/SwimmerAIKit/package.json`
- Modify: `/Users/yuanfei/PieAI/SwimmerAIKit/CHANGELOG.md`
- Modify: `/Users/yuanfei/PieAI/SwimmerAIKit/README.md`
- Modify: `/Users/yuanfei/PieAI/SwimmerAIKit/docs/reference/execution/current-work.md`
- Generated: `/Users/yuanfei/PieAI/SwimmerAIKit/dist/**`

**Interfaces:**
- Produces: merged `main` commit and a reproducible package artifact consumed by SupaLuv.

- [x] Bump to `0.2.1` and document that ordinary minor photos are not classified as exploitation.
- [x] Run `pnpm verify && pnpm docs:check && git diff --check`; 53 tests and all governance gates passed.
- [x] Commit only SwimmerAIKit files on the isolated branch and inspect the diff.
- [x] Rebase over concurrent TTS commit, re-verify, and fast-forward into `main` without discarding work.
- [x] Pack merged main `ff9adeb` as `pieai-swimmer-ai-kit-0.2.1.tgz` with SHA-256 `7f32fbe1ff00297383e0f92c1dd5d5fa2390597dc051b904f6fe1f2036afd6b8`.

## Block B — SwimmerCore SupaLuv product persistence

### Task 5: Establish isolated SwimmerCore worktree and platform baseline

**Files:**
- Read: `/Users/yuanfei/PieAI/SwimmerCore/docs/reference/architecture/platform-boundaries.md`
- Read: `/Users/yuanfei/PieAI/SwimmerCore/docs/architecture/schema-registry.json`
- Create worktree: `/Users/yuanfei/PieAI/SwimmerCore/.worktrees/supaluv-ai-runtime`

**Interfaces:**
- Produces: clean branch `codex/supaluv-ai-runtime` based on current `main`.

- [x] Verify tracked worktree state and preserve the existing unrelated `.worktrees/` entry.
- [x] Run `pro-gov learn recall --query "SupaLuv product schema private storage wallet receipts"`; no prior local learning matched.
- [x] Create the isolated `codex/supaluv-ai-runtime` worktree under the shared PieAI worktree root so the existing project-local worktrees remain untouched.
- [x] Run `pnpm test:platform-hardening`, `pnpm test:platform-contract`, and `pnpm test:supaluv-wallet-app`; baseline passed.

### Task 6: Write the SupaLuv static product-contract test

**Files:**
- Create: `/Users/yuanfei/PieAI/SwimmerCore/tests/supaluv-contract.test.mjs`
- Modify: `/Users/yuanfei/PieAI/SwimmerCore/package.json`

**Interfaces:**
- Produces: `test:supaluv-contract` asserting schema, tables, RLS, grants, functions, and storage policies.

- [x] Write a Node test that locates the new forward migration and asserts the presence of `supaluv`, `supaluv_internal`, `character_packs`, `character_assets`, `story_runs`, `ai_ending_sessions`, `ai_ending_checkpoints`, and `ai_spend_receipts`.
- [x] Run `pnpm test:supaluv-contract`; observed the expected missing-migration failure.
- [x] Add the script without changing the aggregate `test` command yet.
- [x] Re-run and confirm the failure was specifically the missing migration.

### Task 7: Add the SupaLuv schema and owner-scoped tables

**Files:**
- Create: `/Users/yuanfei/PieAI/SwimmerCore/supabase/migrations/20260711120000_supaluv_ai_runtime.sql`
- Modify: `/Users/yuanfei/PieAI/SwimmerCore/docs/architecture/schema-registry.json`
- Test: `/Users/yuanfei/PieAI/SwimmerCore/tests/supaluv-contract.test.mjs`

**Interfaces:**
- Produces: forward-only schema with UUID primary keys, `auth.users` ownership, lifecycle status checks, timestamps, and unique idempotency keys.

- [x] Extend the failing test with exact owner foreign-key, status check, unique-index, and cross-owner parent/child assertions.
- [x] Implement the minimum tables and constraints in one forward migration; wallet truth remains in `core.ledger_entries`.
- [x] Run `pnpm test:supaluv-contract`; table/constraint assertions passed before moving to RLS.
- [x] Run `pnpm test:migration-static`; no unsafe migration pattern was found.

### Task 8: Add RLS, private storage, and deletion contracts

**Files:**
- Modify: the new SupaLuv migration
- Test: `/Users/yuanfei/PieAI/SwimmerCore/tests/supaluv-contract.test.mjs`
- Test: `/Users/yuanfei/PieAI/SwimmerCore/tests/sql/supaluv_ai_runtime_contract.sql`

**Interfaces:**
- Produces: private bucket `supaluv-character-assets`, owner-path policies, service-role operations, and delete/tombstone RPCs.

- [x] Add failing static assertions for RLS enablement, revoked public grants, fixed `search_path`, bucket privacy, and owner object prefixes.
- [x] Add a rollback-only SQL contract that creates two users and proves cross-owner reads and browser writes fail.
- [x] Implement policies and narrow functions; service-role mutation functions are not exposed to `authenticated`.
- [x] Run static tests and the SQL contract against isolated local PostgreSQL 17; both passed.

### Task 9: Add ending checkpoint concurrency and receipt reconciliation

**Files:**
- Modify: the new SupaLuv migration
- Test: `/Users/yuanfei/PieAI/SwimmerCore/tests/supaluv-contract.test.mjs`
- Test: `/Users/yuanfei/PieAI/SwimmerCore/tests/sql/supaluv_ai_runtime_contract.sql`

**Interfaces:**
- Produces: `supaluv_internal.advance_ai_ending_checkpoint(...)` with expected-version compare-and-swap and receipt uniqueness by wallet reservation id.

- [x] Add failing assertions for expected version, unique `(session_id, sequence)`, and unique `wallet_reservation_id`.
- [x] Implement the internal function with fixed search path, owner/session checks, and atomic session/checkpoint update.
- [x] Add a SQL case where two advances use the same version and exactly one succeeds.
- [x] Add a duplicate receipt case and prove it returns the existing record rather than inserting twice.

### Task 10: Verify and merge SwimmerCore

**Files:**
- Modify: `/Users/yuanfei/PieAI/SwimmerCore/docs/reference/execution/current-work.md`
- Modify: platform evidence/registry files required by Core governance.

**Interfaces:**
- Produces: merged SwimmerCore `main` migration contract ready for SupaLuv service consumption.

- [x] Add `test:supaluv-contract` to the aggregate contract gate only after it is green.
- [x] Run the local aggregate gates, graduation gates, staging preview, and migration parity; local gates passed, parity correctly classified 43 remote / 44 local, and staging correctly blocks until reviewed deployment.
- [x] Run `pnpm docs:check && git diff --check`; both passed.
- [x] Commit as `7fbb33b` and fast-forward the isolated branch into SwimmerCore `main`, preserving concurrent work.

**Block B evidence:** 44 migrations replayed locally; 10/10 SupaLuv static contracts, rollback-only SQL behavior, platform contract, lint, typecheck, edge tests, secret scan, and docs gates passed. Production and staging were not mutated.

## Block C — SupaLuv service foundation and character generation

### Task 11: Adopt the merged SwimmerAIKit artifact

**Files:**
- Replace: `/Users/yuanfei/PieAI/SupaLuv/vendor/pieai-swimmer-ai-kit-*.tgz`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/package.json`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/package.json`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/pnpm-lock.yaml`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/content-safety-local.test.ts`

**Interfaces:**
- Consumes: merged SwimmerAIKit `reviewAdultReference` API.

- [x] Add a failing SupaLuv contract test importing the new adult-reference API from the vendored package.
- [x] Run the focused test; observed the old artifact returning no exported function.
- [x] Replace the vendored package with verified `0.2.1` artifact `ff9adeb` and update both exact file references.
- [x] Run frozen install, 4/4 focused tests, typecheck, and SHA-256 integrity checks; all passed.

### Task 12: Define shared character and ending contracts

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/packages/shared/src/character-pack.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/packages/shared/src/ai-ending.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/shared/src/index.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/packages/content/characters/slots.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/content/src/index.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-pack-contract.test.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/ai-ending-contract.test.ts`

**Interfaces:**
- Produces: `CharacterSlotDefinition`, `CharacterPack`, `CharacterMoodKey`, `AiEndingContract`, `AiEndingSegment`, `AiEndingChoice`, and lifecycle status unions.

- [x] Write failing type/runtime fixture tests for four content-declared slots exported by `@supaluv/content` and an eight-segment terminal contract.
- [x] Run both focused tests; observed missing content exports before implementation.
- [x] Implement small serializable interfaces with no React, provider, wallet, or Supabase types.
- [x] Re-run; 7/7 focused and story-map tests plus shared/content builds passed.

### Task 13: Add request validation and action ids

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/actionIdentity.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/characterSchemas.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-service.test.ts`

**Interfaces:**
- Produces: Zod schemas and `makeActionIdempotencyKey(userId, kind, scopeId, clientActionId)`.

- [x] Add failing cases for invalid MIME type, more than three references, missing client action id, and unstable key generation.
- [x] Run focused tests; observed missing service modules.
- [x] Implement 10 MiB/reference limits, a maximum of three references, and a deterministic non-secret SHA-256 action key.
- [x] Re-run; 5/5 validation cases and root/service typechecks passed.

### Task 14: Add the SupaLuv product-store adapter

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/supaluvStore.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/supaluv-store.test.ts`

**Interfaces:**
- Produces: `SupaluvStore` methods for reference assets, packs, story-run bindings, ending sessions/checkpoints, and spend receipts.
- Consumes: injected Supabase-like RPC/query dependency; no global client in domain tests.

- [x] Write a failing in-memory fake test for owner scoping, version conflict, and receipt idempotency.
- [x] Implement the interface, in-memory implementation, and server Supabase adapter pinned to the `supaluv` schema and service-only RPC wrappers.
- [x] Re-run focused tests; 5/5 passed without real network calls and root/service typechecks passed.
- [x] Add a configuration test that fails closed when service credentials are absent in production mode.

### Task 15: Add private reference upload lifecycle

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/characterAssetService.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/routeTable.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/vercel.json`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-route.test.ts`

**Interfaces:**
- Produces: authenticated create-upload, finalize-upload, list, and delete route handlers with owner-scoped paths and 180-day expiry metadata.

- [x] Add failing route tests for auth required, invalid content type, oversized metadata, cross-owner delete, and idempotent delete; observed the expected missing-module failure.
- [x] Implement private signed-upload/finalize/list/delete routes through `SupaluvStore`; owner identity comes only from the verified bearer token. Add a secret-guarded cleanup route that expires original references but not derived packs.
- [x] Re-read uploaded object metadata from private storage before persistence, derive owner-scoped paths server-side, and implement 180-day expiry plus idempotent deletion.
- [x] Add a 64 KiB request-body limit before JSON parsing and a 10 MiB stored-file limit; 12/12 focused lifecycle/store tests and root/service typechecks passed. Existing generic Vercel API rewrite already covers the new routes, so no rewrite change was needed.

### Task 16: Add the Gemini character-image provider

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/package.json`
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/characterImageProvider.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/geminiCharacterImageProvider.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-image-provider.test.ts`

**Interfaces:**
- Produces: `CharacterImageProvider.generateBase`, `.generateMood`, and `.generateStill` returning bytes, MIME type, model id, and provider request metadata.

- [x] Write failing provider-contract tests with an injected Gemini client and exact reference-count/aspect-ratio assertions; observed the expected missing-provider-module failure.
- [x] Pin official `@google/genai` 2.11.0 and explicitly disable its no-op install script plus the transitive protobuf postinstall under the repository supply-chain policy.
- [x] Implement stable `gemini-3.1-flash-image` through the current Interactions API using inline base64 images, 1K 3:4 portraits, 16:9 stills, and adult/non-explicit prompt invariants.
- [x] Validate missing/blocked/malformed image outputs as typed failures; 6/6 provider tests, frozen install, and root/service typechecks passed.

**Official research note (verified 2026-07-12):** Google lists `gemini-3.1-flash-image` as the stable model code, with text/image input and image/text output; its image guide documents 1K output and up to four character references. The current JavaScript examples use the Interactions API and `response_format`. Sources: [model card](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image), [image-generation guide](https://ai.google.dev/gemini-api/docs/image-generation), [official SDK package](https://www.npmjs.com/package/@google/genai), and [SDK API reference](https://googleapis.github.io/js-genai/).

### Task 16A: Route test-stage character generation through OpenRouter

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/openRouterCharacterImageProvider.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/openRouterCharacterSafety.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/characterProviderConfig.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/openrouter-character-*.test.ts`

**Interfaces:**
- Keeps `CharacterImageProvider` and `GeneratedAdultPresentationReviewer` provider-neutral while selecting OpenRouter by default and direct Gemini only by explicit configuration.

- [x] Verify OpenRouter's unified Image API exposes `google/gemini-3.1-flash-image`, private base64 references, 1K/3:4/16:9 output, and up to 14 references.
- [x] Add test-first OpenRouter image and structured adult-review adapters using the existing server-only `OPENROUTER_API_KEY`.
- [x] Add `SUPALUV_CHARACTER_IMAGE_PROVIDER=openrouter` default and preserve `gemini` as an explicit future option requiring `GEMINI_API_KEY`.
- [x] Persist the actual provider/model on generated assets and expose non-secret provider readiness through `/health`.

### Task 17: Build the character safety pipeline

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/safetyGate.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/characterSafety.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-safety.test.ts`

**Interfaces:**
- Produces: `reviewHumanReferences`, `reviewRobotReferences`, and `reviewGeneratedCharacter`.

- [x] Add failing tests proving minor, uncertain, no-face, multi-face, nudity, and provider-unavailable inputs fail before image generation; observed the expected missing-module failure.
- [x] Implement SwimmerAIKit adult-reference plus ordinary visual checks with distinct, user-safe error codes and no public-figure identity rule.
- [x] Add a failing generated-output test where semantic adult presentation is uncertain.
- [x] Implement an injected secondary Gemini 3.1 Flash-Lite semantic reviewer that assesses apparent adult presentation only and never identifies the person; 11/11 safety tests, 24/24 combined character tests, and typecheck passed.

### Task 18: Build the character generation coordinator

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/characterGenerationService.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-generation.test.ts`

**Interfaces:**
- Produces: `generateBase`, `acceptBase`, `generateMoodPack`, `generateMood`, `deletePack` with injected store, safety, provider, and wallet dependencies.

- [x] Write a failing happy-path test asserting order: input safety -> reserve -> generate -> output safety -> store -> commit -> receipt; observed the expected missing-coordinator failure.
- [x] Add provider-failure refund/retry coverage and typed payment/busy failures.
- [x] Implement base acceptance, base/mood generation, six-mood packs, private persistence, deletion, wallet receipts, and typed results.
- [x] Add server-derived action keys, database claims with five-minute stale-lease recovery, one-in-flight-per-pack exclusion, and completed-action replay. 5/5 coordinator tests and typecheck passed; SwimmerCore migration 45 passed static migration, 12 contract tests, lint, and typecheck.

### Task 19: Expose authenticated character-pack routes

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/characterRoutes.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/routeTable.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-route.test.ts`

**Interfaces:**
- Produces: `/ai/characters/references`, `/ai/characters/packs`, `/ai/characters/packs/:id/base`, `/moods`, and delete operations. Story-run bindings are captured when the ending session creates its server-side story run; there is no standalone `/bind` route.

- [x] Add failing route-table tests for pack creation, base generation/acceptance, moods, deletion, owner derivation, and structured error status; observed the expected missing-route-module failure.
- [x] Implement authenticated delegation and production dependency wiring through the existing auth, SwimmerCore, private storage, configured image provider, Sightengine, and wallet seams.
- [x] Implement stable 402, 403, 409, 413, 422, and 503 mappings; no browser-provided owner id is accepted.
- [x] Run combined character route/auth/store/provider/safety/coordinator tests; 39/39 passed with root/service typechecks.

## Block D — Character Studio and runtime identity

### Task 20: Replace local-only portrait state with a source-agnostic resolver

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/persistence/portraitPack.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/characters/characterPackTypes.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/characters/portraitResolver.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/portrait-pack.test.ts`

**Interfaces:**
- Produces: `resolveCharacterPortrait(slotId, mood, bindings, officialFallback)`.

- [x] Add failing tests for exact mood, base fallback, official fallback, and locked binding precedence.
- [x] Implement resolver without removing legacy local data migration.
- [x] Re-run focused and stage-presentation tests; PASS.

### Task 21: Add the browser character-pack API client

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/characters/characterPackClient.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-pack-client.test.ts`

**Interfaces:**
- Produces: authenticated typed client matching Task 19 routes and abortable generation calls.

- [x] Write failing fetch-contract tests for bearer auth, client action ids, error mapping, and abort.
- [x] Implement using existing auth/session patterns; no direct service-role or storage credentials.
- [x] Re-run; PASS.

### Task 22: Build the player-facing Character Studio

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/CharacterStudioScreen.tsx`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/character-studio/ReferenceUploader.tsx`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/character-studio/BaseApproval.tsx`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/character-studio/MoodPackProgress.tsx`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/App.tsx`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/e2e/web-smoke.spec.ts`

**Interfaces:**
- Consumes: SwimmerUIKit `GameInput`, `GameTextArea`, `GameButton`, `GameProgress`, `GameBeforeAfterToggle`, `GameCallout`, and `GameModal`.

- [x] Add an E2E test that expects Character Studio before new game and fails on the current title flow.
- [x] Build the smallest authenticated slot picker, upload/description form, adult-reference error state, generation progress, base accept/regenerate, and mood progress flow.
- [x] Run the E2E with mocked routes; PASS at desktop and phone-landscape viewports.
- [x] Run keyboard and accessible-name assertions; fix only product composition locally.

### Task 23: Bind lead packs at new-game start

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/characters/storyRunBindings.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/App.tsx`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/story/storyMapAdapter.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/story-run-bindings.test.ts`

**Interfaces:**
- Produces: immutable lead bindings per story run and mood-aware presentation.

- [x] Add failing tests proving bindings lock at new game and ignore later pack changes.
- [x] Implement binding creation/load and adapter integration.
- [x] Verify local save/load, expiring signed-URL refresh, and server-side binding capture when an AI ending starts. Cross-device authored-story save sync is not claimed by this feature.

### Task 24: Add authored robot-selection slot binding

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/shared/src/story-map.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/content/manifests/ch01-scenes.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/VisualNovelPrototype.tsx`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/content-manifest.test.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/e2e/web-smoke.spec.ts`

**Interfaces:**
- Produces: content metadata `characterSlotLock` that opens/locks robot customization at authored scenes.

- [x] Add a failing manifest test for two robot lock points with valid slot ids.
- [x] Add E2E coverage that traverses the authored robot studio handoff and unit coverage that locks an existing slot.
- [x] Implement metadata and runtime handoff without changing Ink authority.
- [x] Run manifest, story-map, save, and E2E tests.

### Task 25: Add on-demand mood generation and fallback

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/characters/useCharacterMood.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/play/PortraitStage.tsx`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/character-mood.test.ts`

**Interfaces:**
- Produces: non-blocking mood fetch/generation request with base-image fallback.

- [x] Add failing tests for cached mood, pending mood, failure fallback, and duplicate request suppression.
- [x] Implement hook and portrait-stage integration so dialogue never blocks on an optional mood.
- [x] Re-run focused tests and browser stage smoke.

## Block E — Interactive AI ending sessions and spend analysis

### Task 26: Declare authored ending envelopes in content

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/shared/src/ai-ending.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/content/manifests/ch01-scenes.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/ai-ending-contract.test.ts`

**Interfaces:**
- Produces: one noncanonical Chapter 1 AI ending envelope with outcome anchors, facts, invariants, forbidden outcomes, asset pools, and hard limits.

- [x] Add failing validation tests for missing anchors, `maxSegments > 8`, terminal requirements, and unresolved asset keys.
- [x] Implement the validator and a demo envelope that preserves black-humor/sex-comedy tone without rewriting the source novel as canon.
- [x] Run content and narrative tests; expect PASS.

### Task 27: Add ending schemas and prompt builder

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/endingSchemas.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/endingPrompts.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/ai-ending-service.test.ts`

**Interfaces:**
- Produces: Zod outline/segment schemas and pure prompt builders using bounded continuity memory.

- [x] Add failing tests that reject 1 choice, 5 choices, forbidden speakers, oversized text, and non-terminal segment 8.
- [x] Implement schemas and prompt messages with immutable envelope fields separated from player input.
- [x] Add prompt-injection fixture tests proving player text cannot replace system limits.

### Task 28: Add the Mastra ending generator

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/mastraEnding.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/ai-ending-service.test.ts`

**Interfaces:**
- Produces: `generateEndingOutline` and `generateEndingSegment` with structured results and bounded retry.

- [x] Add failing injected-agent tests for valid JSON, malformed JSON, wrong anchor, and forced terminal repair.
- [x] Implement Mastra Agent calls using the existing SwimmerAIKit OpenRouter model seam and Zod parsing.
- [x] Limit retries and output tokens; re-run focused tests.

### Task 29: Build the ending-session coordinator

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/endingSessionService.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/ai-ending-service.test.ts`

**Interfaces:**
- Produces: `startSession`, `advanceSession`, `resumeSession`, and `getSession` with injected store, wallet, safety, generator, and optional still scheduler.

- [x] Add failing start/advance tests proving outline cost folds into first delivered action.
- [x] Add failing tests for input block, output block, insufficient wallet pause, provider retry exhaustion, version conflict, duplicate action, and terminal segment 8.
- [x] Implement minimal coordinator and checkpoint-before-response ordering.
- [x] Add optional still failure test proving text continues and no still charge commits.

### Task 30: Expose AI ending routes

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/endingRoutes.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/routeTable.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/ai-ending-route.test.ts`

**Interfaces:**
- Produces: authenticated start, advance, resume, and get endpoints with stable 402/403/409/422/503 semantics.

- [x] Add failing route-table/auth/body-limit tests.
- [x] Implement route delegation and structured responses.
- [x] Run focused plus existing AI auth/wallet route tests.

### Task 31: Build the AI Ending player surface

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/ai-ending/aiEndingClient.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/ai-ending/useAiEndingSession.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/AiEndingExperience.tsx`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/ChapterEndCard.tsx`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/e2e/web-smoke.spec.ts`

**Interfaces:**
- Produces: persistent ending UI with beats, 2-4 choices, free text, progress, pause/recharge, resume, optional still, and terminal receipt summary.

- [x] Add failing E2E covering start, three choices, free text, refresh/resume, and terminal outcome.
- [x] Implement client/hook/state UI with SwimmerUIKit and current VN dialogue presentation patterns.
- [x] Add failing insufficient-battery test; implement pause without losing free authored ending access.
- [x] Run E2E at desktop and phone-landscape sizes.

### Task 32: Add AI spend analysis

**Files:**
- Create: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/spendRoutes.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/routeTable.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/services/ai-branch/src/walletMeter.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/commerce/aiSpendClient.ts`
- Create: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/AiSpendAnalysisScreen.tsx`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/App.tsx`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/ai-spend.test.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/e2e/web-smoke.spec.ts`

**Interfaces:**
- Produces: owner-scoped grouped receipts by run/pack/session/action without recalculating wallet balance.

- [x] Add failing aggregation tests with character, existing AI branch, ending segment, refund, and duplicate receipt fixtures.
- [x] Route the existing short AI branch through the atomic wallet-and-receipt settlement RPC, then implement the server query and pure browser grouping formatter.
- [x] Add E2E proof that only committed spend appears and labels explain the action.

## Block F — Remove human video content and prove the integrated product

### Task 33: Remove current human-video content paths

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/content/manifests/ch01-scenes.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/App.tsx`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/GalleryScreen.tsx`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/content/assets/RUNTIME-ASSET-LEDGER.csv`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/content/assets/ATTRIBUTION.md`
- Delete: `/Users/yuanfei/PieAI/SupaLuv/apps/web/public/assets/video/ch01-cold-open.mp4`
- Delete: `/Users/yuanfei/PieAI/SupaLuv/apps/web/public/assets/video/ch01-demo-echo.mp4`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/content-manifest.test.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/scene-unlocks.test.ts`

**Interfaces:**
- Produces: no runtime reference or reward for current human videos; generic player code remains dormant.

- [x] Add failing tests asserting Chapter 1 contains no `videoKey` and clear rewards contain no videos.
- [x] Remove content references, unlocks, ledger entries, attribution entries, and files.
- [x] Run asset checks and focused tests; expect PASS.

### Task 34: Add still-first cinematic replacements

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/views/play/stagePresentation.ts`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/apps/web/src/styles/stage.css`
- Modify: `/Users/yuanfei/PieAI/SupaLuv/packages/content/manifests/ch01-scenes.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/unit/stage-presentation.test.ts`
- Test: `/Users/yuanfei/PieAI/SupaLuv/tests/e2e/web-smoke.spec.ts`

**Interfaces:**
- Produces: restrained still pan/zoom/flash variants that obey reduced motion and never override custom identity.

- [x] Add failing stage tests for motion cue metadata and reduced-motion fallback.
- [x] Implement product-local cinematic variants using existing backgrounds, portraits, audio, and CSS.
- [x] Capture browser screenshots of the former cold-open and echo moments and inspect for clipping/face inconsistency.

### Task 35: Run deterministic integrated verification

**Files:**
- Modify only files required to fix test-proven failures.

**Interfaces:**
- Produces: green local product proof with mocked external providers and real domain/persistence adapters.

- [x] Run `pnpm format:check`, `pnpm lint:audit`, `pnpm assets:check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- [x] Run `pnpm test:e2e` with deterministic AI/image fixtures.
- [x] For every failure, add or retain the smallest reproducing test before changing production code.
- [x] Re-run `pnpm docs:check && git diff --check`.

### Task 36: Run live provider and safety samples

**Files:**
- Store non-secret evidence under `/Users/yuanfei/PieAI/SupaLuv/artifacts/` only where project policy permits.

**Interfaces:**
- Produces: live evidence for adult reference success, minor/uncertain refusal, safe generated base/moods, refund behavior, and ending continuity.

- [x] Verify required secrets by presence only; never print values. Sightengine is declared; Gemini, SwimmerCore service, and wallet credentials are absent.
- [x] Run one safe adult-reference pack through live Sightengine and OpenRouter.
- [x] Prove minor, uncertain, and no-face rejection with deterministic provider fixtures; do not use or commit real minor photos.
- [x] Run a live multi-choice/free-text ending to eight segments; prove interruption/resume deterministically.
- [x] Reconcile wallet reservations with spend receipts and confirm no charge for blocked/failed actions.

### Task 37: Browser playtest, closeout docs, and final proof

**Files:**
- Modify: `/Users/yuanfei/PieAI/SupaLuv/docs/reference/execution/current-work.md` only after coordinating with any concurrent owner of that dirty file.
- Move on completion: this plan to `/Users/yuanfei/PieAI/SupaLuv/docs/plans/completed/`.
- Update: `/Users/yuanfei/PieAI/SupaLuv/docs/specs/active/SPEC-0002-generative-character-packs-and-ai-endings.md` status/location only when every acceptance item is proven.

**Interfaces:**
- Produces: truthful handoff with changed files, shared-library main commits, verification results, known limitations, and player-visible behavior.

- [x] Play the real browser flow as a new user: free authored path, lead customization, robot selection, AI ending, spend analysis, and pack deletion; prove side-branch rejoin and resume deterministically.
- [x] Inspect desktop and landscape-phone screenshots for hierarchy, loading feedback, clipping, contrast, and accidental developer UI; fixed casting contrast/callout overlap, portrait framing, and hidden dev tools.
- [x] Run the full `pnpm cloud:check` and both shared-repo verification ladders; SupaLuv 192/192 and SwimmerAIKit 53/53 tests passed, while SwimmerCore SupaLuv contract tests passed 16/16 plus a real local migration replay.
- [x] Run `git diff --check` in all touched repositories and inspect diffs for unrelated changes; unrelated `.pro-gov` and `.worktrees` changes in shared repositories were not staged.
- [x] Update governed current-work/spec/plan truth, regenerate manifests, run docs checks, and report only evidence-backed completion.

## Definition of done

- SwimmerAIKit and SwimmerCore changes are merged to their respective `main` branches and independently verified.
- SupaLuv consumes only merged/formal shared artifacts.
- Every SPEC-0002 acceptance-evidence item has a test or live proof.
- No current human video remains in the Chapter 1 content path.
- No blocked, failed, duplicate, or optional-still-failed action creates a committed charge.
- Adult reference images and derived packs remain private and player-deletable.
- AI endings resume across refresh/device contexts and terminate within eight segments.
- Full governance, formatting, lint, assets, types, unit/integration, build, E2E, and browser playtest gates pass.
