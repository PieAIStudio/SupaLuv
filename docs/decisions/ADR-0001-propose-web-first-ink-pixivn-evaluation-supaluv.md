---
id: ADR-0001
title: Propose Web-first Ink Strategy with PixiVN Evaluation for SupaLuv
type: decision
status: proposed
canonical: false
owner: human
created: 2026-05-13
last_reviewed: 2026-05-13
domain: architecture
tags:
  - supaluv
  - architecture
  - engine-choice
  - ai-branching
pinned: true
related:
  - REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
  - POLICY-PROJECT-BEST-PRACTICE
supersedes: []
superseded_by: null
---

# ADR-0001: Propose Web-first Ink Strategy with PixiVN Evaluation for SupaLuv

## Context

SupaLuv is an independent interactive cinema game based on 超级爱人. It should
not inherit Supa card-game systems. The intended experience includes authored
interactive narrative, a small amount of AIGC video cutscenes, and a constrained
amount of live AI-generated short side branches based on user choices or text
input.

The project also wants broad future platform reach, but the first priority is a
fast 20-30 minute playable prototype that can prove story pull, visual tone, and
AI branch safety.

This decision is not accepted yet. It records the current proposal so another
AI or future session can critique it without mistaking it for locked
architecture.

## Proposed Decision

Propose a Web-first strategy:

- Use Ink as the primary authored narrative format.
- Use InkJS as the browser/runtime bridge.
- Use React / Vite / TypeScript as the app shell.
- Evaluate Pixi'VN with a short spike before treating it as the visual-novel
  presentation layer.
- Keep React + InkJS as the minimum P0 baseline if Pixi'VN does not clearly
  reduce implementation work.
- Keep SupaLuv-specific metadata beside the Ink story for videos, assets, AI
  permissions, branch return rules, content rating, and migration hints.
- Keep live AI branches as a constrained service, not as the main story engine.
- Package later to Web/PWA, desktop, and mobile after prototype validation.

## Consequences

If accepted, likely positives:

- Fastest route for the current TypeScript/Web skill base.
- Ink gives AI a proven, learnable narrative authoring format.
- React keeps the project compatible with modern Web UI, while the Pixi'VN spike
  prevents locking a smaller ecosystem before proof.
- SupaLuv metadata keeps videos, AI branch rules, and platform policy outside
  raw prose.
- Later engine migration remains possible because story and metadata stay
  portable.

If accepted, likely tradeoffs:

- This is not the maximum-platform route from day one.
- Unity or Godot may still become useful later if the project becomes more
  mechanically game-like.
- Ren'Py or WebGAL may still be useful for comparison, but adopting them first
  would move the project away from the current TypeScript/Web strengths.

Alternatives currently being challenged:

- Use Supa card-game systems directly: likely wrong because SupaLuv is
  independent and has no card system.
- Build a custom narrative engine from scratch: likely inefficient because Ink
  and Pixi'VN already cover much of the authoring and presentation need.
- Start with Unity/Godot: possibly useful later, but probably slower for first
  validation.
- Let AI generate arbitrary live story: high risk because adult subject matter,
  platform rules, and player safety require a constrained branch sandbox.

## Approval Boundary

This ADR should become `accepted` only after the owner confirms the strategy
has survived discussion and the active spec or implementation plan is ready to
be written from it.
