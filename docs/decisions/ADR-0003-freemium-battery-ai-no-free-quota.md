---
id: ADR-0003
title: Freemium model — free prefab story, battery-paid AI, no free AI quota
type: decision
status: accepted
canonical: true
owner: human
created: 2026-07-10
last_reviewed: 2026-07-10
domain: product
tags:
  - commercial
  - battery
  - ai
  - freemium
pinned: true
related:
  - ADR-0004
  - REF-CURRENT-WORK
  - REF-FEATURE-STATUS-ROADMAP
  - REF-AI-CONSTRAINED-BRANCH
  - REF-OWNER-APPROVED-AUDIT-EXTRACT-2026-07
---

# ADR-0003: Free prefab story + battery AI (no free AI quota)

## Context

An external commercial audit proposed traditional Steam pricing (`$12.99`–
`$17.99` buy-the-story) and “no battery in Demo / free AI samples.” That model
conflicts with the owner’s freemium product.

## Decision

1. **Prefab authored story is free** (main Ink path, saves, gallery of unlocked
   authored content, local dual-tab co-play demo).
2. **Live AI capabilities cost batteries** (constrained AI side branch, dynamic
   AI voice, future networked co-play extras, future face-gen). **No free AI
   quota** — the studio does not subsidize free users’ model/TTS spend.
3. **No subscription** as the primary model.
4. **When a free player hits an AI action**, show a short cost-transparency pitch:
   making the game cost real work; AI is paid compute; the studio only takes a
   thin margin so players feel they get a bargain — not a guilt trip, not a
   fake “free trial then trap.”
5. **Do not freeze systems work** while novels are written in parallel. Content
   and runtime framework advance together. Defer only when a feature has a
   **hard conflict** with another ship path (example: AI custom faces vs later
   authored video CG — see ADR-0002).
6. **Landscape-first** for the current vertical slice; no claim of full portrait
   mobile product yet.
7. Meta surfaces (achievements, gallery, co-play entry) **remain visible** until
   the owner decides otherwise — hide later if playtests demand it.

## Consequences

- Wallet path must grow toward reserve / commit / refund; soft balance read is
  not enough for production abuse control.
- Marketing must not promise free AI play.
- Traditional “pay once for the movie” pricing docs are **not** project truth.
- External audit full text is archived; only owner-approved extracts remain on
  the AI default reading path.

## Non-decisions

- Exact battery prices per action (still experimental).
- Steam / itch packaging SKUs (later).
- Whether authored (non-AI) TTS is free CDN or battery-metered (default: free
  prefab VO when pre-generated; live synthesis may meter later).
