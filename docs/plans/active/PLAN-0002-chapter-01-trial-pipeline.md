---
id: PLAN-0002
title: Chapter 01 Trial Pipeline Plan
type: plan
status: active
canonical: true
owner: ai-assisted
created: 2026-05-14
last_reviewed: 2026-05-14
domain: implementation
tags:
  - supaluv
  - chapter-01
  - ink
  - canvas
  - pipeline
  - noncanonical
related:
  - REF-CURRENT-WORK
  - REF-DOCUMENTATION-MAP
  - SPEC-0001
  - PLAN-0001
---

# PLAN-0002: Chapter 01 Trial Pipeline

> **For agentic workers:** execute this plan task-by-task. Keep each checkbox
> small enough to verify. Do not implement public runtime AI, payments,
> accounts, multiplayer, Phaser, Colyseus, Supa card-game systems, React Flow,
> or Pixi'VN.

## Goal

Build the smallest useful Chapter 01 trial pipeline from read-only source text
to scene cards, Ink, React VN story selection, and generated Obsidian Canvas
overview.

## Noncanonical Boundary

The trial chapter is a **noncanonical pipeline dummy** only.

- Do not edit the Obsidian source file.
- Do not copy the full chapter into the repo.
- Do not rewrite it into polished final prose.
- Do not treat the generated Canvas as runtime truth.
- Keep all derived scene cards marked `noncanonical: true`.
- Use `source: "chapter-01-trial-pipeline-dummy"` on all Chapter 01 trial
  scene cards.

## Scope

In scope:

- Create 12-20 short scene cards from the Chapter 01 source.
- Create a placeholder Ink file with branch, merge, and return/loop.
- Keep `prototype-act1` while adding `chapter-01-trial` to the player.
- Generate a JSON Canvas overview for creator use.
- Add tests that keep metadata, Ink, Canvas, and player wiring aligned.

Out of scope:

- Canonical chapter writing.
- Runtime art asset import.
- React Flow.
- Pixi'VN.
- Phaser, Colyseus, Supabase, accounts, payments, or public runtime AI.

## Tasks

### Task 1: Create Trial Content Manifest

- [ ] Create `packages/content/manifests/chapter-01-trial-scenes.ts`.
- [ ] Extract 12-20 short noncanonical scene cards from the read-only source.
- [ ] Keep only minimal pipeline fields: id, title, purpose, speaker, mood,
      backgroundKey, choices, autoNext, noncanonical, source.

### Task 2: Create Chapter 01 Trial Ink

- [ ] Create `packages/content/ink/chapter-01-trial.ink`.
- [ ] Use scene ids as knots and `# scene:<id>` tags.
- [ ] Keep text placeholder-grade and short.
- [ ] Include at least one branch, one merge, and one return or loop.

### Task 3: Wire Trial Story Into The Player

- [ ] Export the Chapter 01 trial content from `packages/content/src/index.ts`.
- [ ] Add a simple story selector to the React VN player.
- [ ] Keep `prototype-act1` as the default story.
- [ ] Verify the player can switch to `chapter-01-trial`.

### Task 4: Generate Obsidian Canvas Overview

- [ ] Create a generator at `tools/storygraph/ink-to-canvas.ts`.
- [ ] Generate `packages/content/canvas/chapter-01-trial.canvas`.
- [ ] Keep Canvas as generated overview only, not canonical runtime source.

### Task 5: Tests And Documentation

- [ ] Add unit tests for scene ids, Ink knots, metadata targets, and Canvas
      structure.
- [ ] Update e2e to switch to `chapter-01-trial` and take at least one choice.
- [ ] Update `docs/reference/execution/current-work.md`.
- [ ] Update `docs/reference/documentation-map.md`.
- [ ] Run `pnpm doc-gov scan`.

## Acceptance

- [ ] Chapter 01 trial scene metadata exists and is clearly noncanonical.
- [ ] Chapter 01 trial Ink exists and matches the scene ids.
- [ ] The player can switch between `prototype-act1` and `chapter-01-trial`.
- [ ] `chapter-01-trial.canvas` exists as a generated creator overview.
- [ ] Canvas is not used as canonical runtime source.
- [ ] `pnpm doc-gov scan`, `pnpm governance:check`, `pnpm format:check`,
      `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm test:e2e`, and `git diff --check` pass before closeout.
