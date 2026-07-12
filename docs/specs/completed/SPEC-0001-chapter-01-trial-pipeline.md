---
id: SPEC-0001
title: Chapter 01 Trial Pipeline Spec
type: spec
status: completed
canonical: true
owner: ai-assisted
created: 2026-05-14
last_reviewed: 2026-07-12
domain: implementation
tags:
  - supaluv
  - chapter-01
  - ink
  - canvas
  - pipeline
related:
  - REF-CURRENT-WORK
  - REF-DOCUMENTATION-MAP
  - PLAN-0001
---

# SPEC-0001: Chapter 01 Trial Pipeline

## Goal

Prove a minimal Chapter 01 trial pipeline from read-only novel source text to
scene cards, Ink, React VN player selection, and generated Obsidian Canvas
overview, without promoting the trial material into SupaLuv canon.

## Noncanonical Boundary

- The Obsidian `chapter-01.md` source file is read-only provenance.
- The local Chapter 01 trial is a **noncanonical pipeline dummy**.
- Do not copy the full chapter into the repo.
- Do not rewrite the material into a long-form polished screenplay or novel
  chapter.
- All derived scene metadata must keep `noncanonical: true`.
- All derived scene metadata must use
  `source: "chapter-01-trial-pipeline-dummy"`.

## Deliverables

1. A governed implementation plan for this pipeline (`PLAN-0002`) if no better
   existing plan matches the work.
2. A noncanonical scene manifest with 12-20 short trial scenes at
   `packages/content/manifests/chapter-01-trial-scenes.ts`.
3. A placeholder-grade Ink file at `packages/content/ink/chapter-01-trial.ink`
   using scene ids as knots and `# scene:<id>` tags.
4. React VN player support for switching between `prototype-act1` and
   `chapter-01-trial`, with `prototype-act1` remaining the default story.
5. A generated JSON Canvas overview at
   `packages/content/canvas/chapter-01-trial.canvas`.
6. Tests that keep scene metadata, Ink, Canvas, and player wiring from drifting
   apart.

## Scene Card Requirements

Each trial scene card must stay compact and include only minimal pipeline data:

- `id`
- `title`
- `purpose`
- `speaker`
- `mood`
- `backgroundKey`
- `choices` and/or `autoNext`
- `noncanonical: true`
- `source: "chapter-01-trial-pipeline-dummy"`

Short placeholder text is allowed. Full source-paragraph copying is not.

## Ink Requirements

- Use one knot per scene id.
- Add `# scene:<id>` to every knot.
- Keep dialogue and narration short and placeholder-grade.
- Include at least:
  - one branch
  - one merge
  - one return or loop

## React Player Requirements

- Keep the current `prototype-act1` story available.
- Add a simple story selector in the existing VN HUD.
- Keep `prototype-act1` as the default selection.
- Let the Chapter 01 trial run through the same player shell and choice flow.

## Canvas Requirements

- Generate the Canvas from local metadata and Ink graph data.
- Use JSON Canvas format.
- Show node title, purpose, speaker, and mood.
- Show edge label from choice text or `continue`.
- Canvas is a **generated creator overview**, not runtime truth and not a
  canonical source.

## Verification Requirements

- Scene metadata ids and Ink knots must match one-to-one.
- Metadata targets from `choices` and `autoNext` must resolve to known scene ids.
- Generated Canvas must contain nodes and edges.
- E2E must prove the app can switch to `chapter-01-trial` and take at least one
  choice.

## Out Of Scope

- Editing the Obsidian source file.
- Treating the trial chapter as canon.
- PSD or runtime art pipeline import.
- React Flow.
- Pixi'VN.
- Phaser, Colyseus, Supabase, accounts, payments, or public runtime AI.
