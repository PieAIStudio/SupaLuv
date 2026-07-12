---
id: ADR-0005
title: Generative character identity and bounded interactive AI endings
type: decision
status: accepted
canonical: true
owner: human
created: 2026-07-11
last_reviewed: 2026-07-12
domain: product
tags:
  - supaluv
  - ai
  - character-customization
  - portraits
  - endings
  - video
pinned: true
related:
  - ADR-0002
  - ADR-0003
  - ADR-0004
  - REF-CURRENT-WORK
supersedes:
  - ADR-0002
superseded_by: null
---

# ADR-0005: Generative identity + bounded interactive AI endings

## Context

SupaLuv's primary differentiation is not pre-rendered cinema. Players can use
paid AI to replace the two leads and selected robots with desired appearances,
including adult real-person reference photos. Story choices can also open AI
material, and the authored story may hand off to a 10-20 minute interactive AI
ending.

Pre-rendered video containing official actors contradicts arbitrary character
identity. Stretching the current one-request, 1-4-beat AI side branch into a
long ending would also lose reliable save, retry, safety, and continuity
boundaries.

## Decision

1. **Character identity is a first-class, persisted product object.** Content
   declares character slots. The current proof covers the male lead, female
   lead, and two story-selected robots without hard-coding that total into the
   runtime.
2. **Adult real-person reference photos are supported.** Input photos that are
   classified as minors or cannot reliably establish an adult real face are
   rejected. Public figures are not blocked solely because of identity.
3. **Generated visual content remains non-explicit.** Softly suggestive adult
   styling and sex-comedy energy are allowed; nudity, pornography, child sexual
   content, and disallowed violent or hateful imagery are blocked.
4. **The current human-containing videos leave the product content path.** Their
   scene triggers and gallery unlocks are removed and replaced with still-first
   cinematic staging. The generic video player may remain dormant for future
   non-conflicting content.
5. **Short AI side branches and AI endings are separate contracts.** Short
   branches remain bounded authored-story detours. An AI ending is a persistent,
   terminal session with an author-defined outcome envelope, generated in
   checkpoints with 2-4 choices at each decision point.
6. **AI endings do not need to rejoin Ink.** They must converge on an allowed
   authored outcome direction, retain story facts and character constraints,
   and terminate within the configured segment and content limits.
7. **AI usage keeps action-level battery charging.** There is no maximum-budget
   confirmation. Each successfully delivered AI action commits its own charge;
   failed actions refund. A later analysis surface itemizes where batteries were
   spent.
8. **Authored story and authored endings remain free.** The AI character studio,
   AI choices, generated ending segments, dynamic stills, and other live model
   calls remain paid capabilities under ADR-0003.

## Rationale

- A still-first character pack can maintain player-selected identity without a
  per-player video render pipeline.
- Persisted, checkpointed AI ending sessions survive refreshes and provider
  failures and make each charge attributable.
- Author-defined outcome envelopes preserve SupaLuv's canon, tone, and ending
  quality without pretending that generative output can be fully predetermined.
- Keeping short branches separate avoids turning a small, proven interface into
  a misleading all-purpose AI story abstraction.

## Consequences

- ADR-0002's hybrid “official pack plays video, custom pack skips video” rule is
  retired.
- SwimmerAIKit needs a generic adult-reference assessment seam using visual age
  evidence; this work must merge to its main branch before SupaLuv consumes it.
- SwimmerCore needs SupaLuv-owned private product data for reference assets,
  character packs, ending sessions, checkpoints, and AI spend receipts; wallet
  truth remains in shared core wallet RPCs.
- Exact battery prices remain configuration, not this decision.
- The owner accepts the product risk of not blocking or visibly labeling public
  figures solely because of identity. Provider-native provenance such as
  SynthID is not removed.

## Alternatives rejected

| Alternative | Reason |
| --- | --- |
| Patch local portrait overrides and enlarge `AiBranchResult` | Cannot truthfully provide cloud recovery, long-session checkpoints, or clean billing attribution |
| Generate personalized video | Excess cost, latency, moderation, and character-consistency risk for the current proof |
| Fully open-ended world simulator | Expands the product beyond authored interactive cinema and removes a reliable terminal condition |
| Block all public figures | Explicitly rejected by the owner for this non-explicit game use case |
