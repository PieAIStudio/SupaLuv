---
id: ADR-0002
title: Custom Lead Faces vs Pre-rendered Lead-Face Video
type: decision
status: accepted
canonical: true
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-10
domain: architecture
tags:
  - supaluv
  - portraits
  - video
  - customization
  - cutscenes
pinned: false
related:
  - REF-PLAYER-PROTAGONIST-CUSTOMIZATION
  - REF-FEATURE-STATUS-ROADMAP
  - REF-CURRENT-WORK
  - ADR-0001
supersedes: []
superseded_by: null
---

# ADR-0002: Custom Lead Faces vs Pre-rendered Lead-Face Video

## Status

**Accepted** for demo and near-term product. Revisit if a real-time face-in-video
pipeline becomes cost-viable.

## Context

Players can customize the two lead characters (names shipped; local portrait pack
override shipped). The product also uses pre-rendered Event CG / video that may
show official lead faces.

If both run at once, the player sees **their face on still portraits** and
**the official face in video** — a clear immersion break.

Re-rendering every video per player is too slow and expensive for a commercial
demo. Deepfake-style live face swap is out of scope (cost, ethics, review).

## Decision

**Hybrid soft-degrade (option D from the customization discussion):**

| Mode | Still portraits | Event CG with lead faces |
| --- | --- | --- |
| Official pack only | Official | Play as authored |
| Custom lead pack active | Player overrides | **Skip** that CG (mark as played; toast once) |

Rationale:

1. One video asset serves everyone; no per-user render farm.
2. Customization remains a real feature on the still VN stage (majority of play).
3. Avoids shipping a broken “two faces” product moment.
4. Environment / prop / back-silhouette videos can stay later without this rule
   if tagged non-lead-face (future metadata).

## Consequences

- Runtime: `hasCustomPortraitPack` gates cutscene start in the play orchestrator.
- Docs / Help must say this explicitly so players do not think CG is broken.
- Future: optional scene flag `cutsceneShowsLeadFace: boolean` for finer control.
- Does **not** block E21 image-gen pipeline; gen still produces still packs only.

## Alternatives rejected (for now)

| Option | Why not now |
| --- | --- |
| Always show official video | Breaks custom-face promise |
| Re-render all videos per pack | Cost / latency |
| Live face swap into video | Ethics + infra + review |
| Drop all Event CG forever | Loses cinema pitch for official path |

## Implementation notes

- Code: `apps/web/src/persistence/portraitPack.ts` + play cutscene effect.
- Achievement: uploading a pack unlocks `custom_pack_active`.
