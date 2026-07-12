---
id: SPEC-0002
title: Generative character packs and interactive AI ending sessions
type: spec
status: completed
canonical: true
owner: human
created: 2026-07-11
last_reviewed: 2026-07-12
domain: implementation
tags:
  - supaluv
  - ai
  - character-packs
  - real-person-reference
  - endings
  - billing
  - persistence
related:
  - REF-AI-CONSTRAINED-BRANCH
  - REF-CURRENT-WORK
---

# SPEC-0002: Generative character packs + AI ending sessions

## Goal

Prove the two paid AI capabilities central to SupaLuv's product direction:

1. players can create persistent character appearances from text and/or adult
   real-person references and see those identities throughout the game; and
2. an authored story can hand off to a bounded 10-20 minute interactive AI
   ending that survives interruption, respects author direction, and records
   attributable battery charges.

The proof must use live backend/provider paths. Mocks remain mandatory for
deterministic automated tests but do not count as product completion.

## Implementation status — 2026-07-12

The complete deterministic product path is implemented: private character-pack
orchestration, adult-reference gates, base/mood generation contracts, locked
runtime bindings, expiring-link refresh, bounded resumable endings, committed
spend receipts and analysis, and still-first Chapter 1 staging. Unit/integration
tests and browser E2E cover failure, retry, duplicate, refund, choice,
free-text, refresh/resume, terminal, desktop, and landscape-phone behavior.

The specification is **completed**. The integrated path was proven first in a
hosted Preview environment and then in Production: adult-photo review,
OpenRouter base/mood generation, locked story presentation, bounded AI ending,
wallet receipts, spend analysis, refunds, and asset deletion. Minor,
uncertain, and no-face rejection use deterministic provider fixtures instead of
collecting real minor photos. Interruption/resume and concurrency remain
deterministic regression proofs; the live production run covered retry after a
rejected model output and terminal completion at segment 8.

## Product boundaries

- The authored Ink story, authored endings, saves, and authored assets are free.
- Live AI calls cost batteries under ADR-0003; exact prices are configuration.
- Tone remains adult sci-fi black humor / sex comedy under ADR-0004, not romance
  therapy, an AI sex companion, or a porn generator.
- Generated images may be stylish or softly suggestive but may not contain
  nudity, pornography, minors, graphic violence, or hateful imagery.
- Public-figure identity alone is not a block condition and SupaLuv adds no
  mandatory visible public-figure label.
- A third-party provider may still refuse an individual request under its own
  policy. Such refusal is a generation failure and refund, not a SupaLuv
  identity block; the product does not promise every public-figure request will
  succeed.
- No generated video is required or allowed in this proof.

## Domain contracts

### Character slot

Content declares a stable slot id, display role, character kind, allowed input
modes, required mood keys, and the story point at which the slot locks.

- Human lead slots lock before a new game begins.
- The two robot slots lock at their authored robot-selection scenes.
- Locked slots do not change during the remaining story run.
- New characters are added through content metadata, not runtime conditionals.

### Character pack

A character pack belongs to one authenticated player and one character slot. It
contains:

- a stable pack id and lifecycle status;
- the text/style brief;
- one to three private reference assets when supplied;
- one player-approved identity base image;
- generated mood assets keyed by content mood;
- provider/model/provenance metadata;
- input and output moderation summaries without raw classifier payloads; and
- creation, last-use, expiry, and deletion timestamps.

The initial mood set is `neutral`, `happy`, `awkward`, `angry`, `surprised`, and
`sad`. Additional moods generate on demand and are cached by pack and mood key.

### Adult reference assessment

SwimmerAIKit exposes a product-agnostic assessment result distinct from harmful
content classification:

- `adult`
- `minor`
- `uncertain`
- `no_real_face`

SupaLuv accepts only `adult` for human-reference generation. Each reference must
contain exactly one sufficiently visible, prominent real face; multiple faces
are ambiguous and require a replacement image. Thresholds are server
configuration and must have fixture tests. Classifier outage fails closed
without charging the generation action.

### AI ending contract

Content may declare an AI ending entry with:

- allowed outcome anchors;
- required story facts and unresolved threads;
- character invariants;
- tone and comedy constraints;
- forbidden contradictions/outcomes;
- allowed speakers, portrait packs, backgrounds, and optional still-image cues;
- segment, choice, character-count, and total-content limits; and
- terminal requirements.

An ending session belongs to one user and one story run. It stores a hidden
outline, selected outcome anchor, compact continuity memory, current checkpoint,
offered choices, player actions, generated beats, optional still references,
status, version, and timestamps.

## Character creation flow

1. Require authentication and an available character slot.
2. Accept a text description and/or 1-3 reference images.
3. Normalize supported image formats and reject invalid size/type inputs.
4. Review every input for visual content policy.
5. For human slots, assess that every real human reference is adult. Reject the
   entire request on `minor`, `uncertain`, or `no_real_face`.
6. Reserve the configured battery cost with an idempotency key.
7. Generate one identity base image with Gemini 3.1 Flash Image through the
   product-owned provider interface. OpenRouter's unified Image API is the
   test/default route; direct Google Gemini remains an explicit optional route.
8. Review generated output before persistence or display. This combines normal
   visual moderation, the image provider's non-adjustable child-safety guard,
   and a secondary semantic check that the generated character is clearly
   presented as an adult; an uncertain output is rejected.
9. Commit the charge only after a safe base image is delivered; otherwise
   refund.
10. Let the player accept or regenerate the base. A regeneration is a new,
    clearly itemized AI action.
11. Generate and review the initial mood pack, with independent idempotent
    charging for each configured action unit.
12. Lock the accepted pack to the story run at the slot's configured lock point.

Robot slots allow text-only generation and reference images. They skip adult
face assessment when no real human face is presented but retain the ordinary
visual content gate.

## Reference storage and deletion

- Reference and derived assets use private SwimmerCore-backed storage; browser
  data URLs are not production persistence.
- Only the owning authenticated user and server-side service may access them.
- A player can delete an individual reference, an entire pack, or all account
  character data.
- Default reference expiry is 180 days after last use. Reuse refreshes expiry.
- Derived character packs remain until player deletion or account-data cleanup.
- Deletion removes stored objects and tombstones product records without
  rewriting wallet ledger history.
- Provider disclosure must name OpenRouter and the selected underlying image
  model when that route is used. SupaLuv must not promise zero third-party
  retention; provider terms and retention claims must be rechecked before launch.

## Runtime character presentation

- Runtime portrait resolution uses the story-run slot binding first and official
  assets as the free fallback.
- The identity base remains stable across every mood derivative.
- Missing derived moods fall back to the base image without blocking play.
- AI ending beats may use only assets allowed by their ending contract and the
  active story-run bindings.
- The current human videos, their manifest triggers, and video gallery unlocks
  are removed. Still staging uses portraits, backgrounds, restrained camera
  motion, transitions, music, ambience, SFX, and TTS where available.
- The generic video component may remain unreferenced for future non-conflicting
  content.

## Interactive AI ending flow

1. Offer the AI ending only at an authored entry point and keep the authored
   free ending available.
2. Start without a maximum-budget confirmation.
3. Create and persist a hidden outline selecting one allowed outcome anchor.
   Fold outline cost into the first delivered ending action; do not create a
   hidden standalone charge.
4. Generate one segment at a time from the immutable ending contract plus the
   compact persisted continuity memory.
5. Review player free text before generation and review structured output before
   delivery.
6. Return story beats followed by 2-4 generated choices unless the session is
   terminal. Free-text player action is also allowed.
7. Persist a checkpoint and AI spend receipt before acknowledging delivery.
8. Generate at most two optional still CGs asynchronously. Story text must remain
   playable while a still is pending or unavailable.
9. Resume from the latest committed checkpoint after refresh, device change,
   timeout, or provider failure.
10. Finish when the chosen outcome anchor is satisfied or a hard limit is hit.

Hard limits for the first proof:

- target experience: 10-20 minutes;
- maximum generated segments: 8;
- target key choices: 3-5;
- choices per non-terminal decision point: 2-4;
- total generated character count: server-configured and enforced; and
- segment 8 must be terminal even if the model requests continuation.

Elapsed reading time is not enforceable because players read at different
speeds. Segment and content limits are the executable proxy for the 20-minute
product ceiling.

## Billing and spend receipts

- No maximum-budget confirmation is shown.
- Every paid AI action reserves first, then uses a SwimmerCore product
  transaction to commit the reservation together with the delivered asset or
  checkpoint and its receipt; failures refund the still-reserved amount.
- Every mutation carries user id, app id, and idempotency key.
- Successful actions write a product spend receipt linked to the wallet
  reservation without duplicating wallet balance truth.
- Reservation id is unique in the receipt store. Wallet commit, paid delivery,
  and receipt persistence are atomic, so the system cannot create an
  already-charged action without its player-visible receipt.
- Receipt kinds include character base, character regeneration, mood pack,
  on-demand mood, AI side choice, AI ending segment, and AI ending still.
- Failed, unsafe, duplicate, or abandoned generation does not create a committed
  charge receipt.
- If balance becomes insufficient mid-ending, pause at the last committed
  checkpoint and allow resume after recharge.
- A player-facing analysis surface can group receipts by story run, character
  pack, ending session, and action kind.

## Persistence and concurrency

- SupaLuv product data lives in a registered SwimmerCore product schema; it does
  not enter shared `core` tables.
- Product tables and storage objects are owner-scoped and protected by RLS or
  server-only access as appropriate.
- Ending advancement uses session versioning so two tabs cannot both advance
  and charge the same checkpoint.
- A pack or ending session permits only one in-flight mutation per version;
  per-user rate limits prevent accidental or scripted rapid spend.
- Request idempotency survives client retries and server restarts.
- Persist structured facts and compact summaries, not an unbounded raw prompt
  transcript in every generation request.

## Service boundaries

- `SwimmerAIKit`: generic adult-reference assessment, visual moderation,
  generator registry, provider-budget primitives, and TTS helpers.
- `SwimmerCore`: Auth, wallet truth, SupaLuv product schema, RLS, private storage,
  and durable product records.
- `SwimmerClient`: existing browser Auth/client contract; change only if a
  genuinely reusable public client API is missing.
- `SwimmerUIKit`: existing inputs, progress, modal, history, comparison, and
  callout primitives; product composition remains in SupaLuv.
- `SwimmerGameServerKit`: not used for single-player HTTP AI sessions. Colyseus
  remains reserved for authoritative realtime multiplayer needs.
- SupaLuv AI service: product prompts, Gemini provider, ending contracts,
  orchestration, wallet operations, receipts, and product safety decisions.

Shared-library changes use isolated branches, pass their own verification, and
merge to each library's `main` before SupaLuv updates to the resulting official
package or pinned artifact.

## Failure behavior

- Moderation unavailable: fail closed before generation; no charge.
- Image provider failure: retain accepted prior pack; refund current action.
- Unsafe output: do not persist or display; refund current action.
- Storage failure after safe generation: do not claim success; refund unless a
  retry can idempotently finish the same action without another provider call.
- Ending model returns malformed data: reject via schema, retry within a bounded
  server policy, then pause with last checkpoint intact.
- Insufficient batteries: pause the paid flow; never corrupt the free authored
  save or remove the authored ending.
- Optional still failure: continue the text ending and record no still charge.

## Acceptance evidence

Completion requires all of the following:

1. A live adult real-person reference passes input review and produces a safe
   identity base and mood pack.
2. Deterministic minor and uncertain/no-face provider fixtures are blocked
   before generation and are not charged; real minor photos are not retained as
   test fixtures.
3. Text-only and image-referenced robot packs work at authored selection points.
4. A locked pack replaces the correct runtime portraits, survives refresh, and
   is captured in the server-side story run used by the persistent AI ending.
   Cross-device authored-story save synchronization is a separate platform
   capability and is not falsely claimed by this feature.
5. Input/output visual moderation, provider failure, storage failure, duplicate
   request, and wallet refund paths have deterministic tests.
6. An AI ending reaches 3 or more choices, can accept a free-text action,
   survives interruption, and terminates within 8 segments.
7. Two-tab concurrent advancement produces one committed checkpoint and one
   charge for a given action.
8. Spend receipts reconcile with committed wallet reservations and the analysis
   surface explains where batteries were used.
9. Current human-video triggers and gallery rewards are absent; the story remains
   playable with still-first staging.
10. Unit, integration, E2E, typecheck, build, governance, and browser-play proof
    all pass on the final integrated mainline dependencies.

## Explicit non-goals

- Personalized or face-swapped video.
- Unlimited AI conversation or an AI companion mode.
- User-authored explicit sexual images or pornography.
- Exact real-time enforcement of minutes watched.
- Public-figure identity detection or blocking.
- A new realtime game server for single-player generation.
- Exact battery prices or live-payment configuration.
