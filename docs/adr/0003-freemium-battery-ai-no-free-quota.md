---
id: ADR-0003
title: Freemium model — free prefab story, battery-paid AI, no free AI quota
type: decision
status: accepted
canonical: true
owner: human
created: 2026-07-10
last_reviewed: 2026-07-12
domain: product
tags:
  - commercial
  - battery
  - ai
  - freemium
pinned: true
related:
  - ADR-0004
  - ADR-0005
  - REF-CURRENT-WORK
  - REF-AI-CONSTRAINED-BRANCH
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
   AI voice, character generation, AI endings, and later networked co-play extras). **No free AI
   quota** — the studio does not subsidize free users’ model/TTS spend.
3. **No subscription** as the primary model.
4. **When a free player hits an AI action**, show a short cost-transparency pitch:
   making the game cost real work; AI is paid compute; the studio only takes a
   thin margin so players feel they get a bargain — not a guilt trip, not a
   fake “free trial then trap.”
5. **Do not freeze systems work** while novels are written in parallel. Content
   and runtime framework advance together. Defer only when a feature has a
   **hard conflict** with another ship path. Human-containing fixed-face video
   was removed because it conflicts with generated character identity (ADR-0005).
6. **Landscape-first** for the current vertical slice; no claim of full portrait
   mobile product yet.
7. Meta surfaces (achievements, gallery, co-play entry) **remain visible** until
   the owner decides otherwise — hide later if playtests demand it.

## Consequences

- Wallet uses action-level commit/refund and keeps delivered actions aligned
  with visible spend receipts; a soft balance read alone is not sufficient.
- Marketing must not promise free AI play.
- Traditional “pay once for the movie” pricing docs are **not** project truth.
- Retired commercial audits remain archive-only and do not override this ADR.

## Non-decisions

- Exact battery prices per action (still experimental).
- Steam / itch packaging SKUs (later).
- Whether authored (non-AI) TTS is free CDN or battery-metered (default: free
  prefab VO when pre-generated; live synthesis may meter later).
