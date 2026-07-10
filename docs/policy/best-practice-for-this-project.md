---
id: POLICY-PROJECT-BEST-PRACTICE
title: SupaLuv Project Policy
type: policy
status: stable
canonical: true
owner: project
created: 2026-05-13
last_reviewed: 2026-07-10
domain: project-policy
tags:
  - project-policy
  - ai-development
  - supaluv
pinned: true
related:
  - POLICY-DOC-AGENT-RULES
  - POLICY-DOC-TYPES
  - REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
  - ADR-0001
  - ADR-0004
supersedes: []
superseded_by: null
---

# SupaLuv Project Policy

This file is project-local. Cross-project governance rules belong upstream in
`project-governance-system`; SupaLuv-specific product, runtime, and content
rules live here.

## Product Boundary

SupaLuv is an independent interactive cinema / visual-novel-like game based on
超级爱人. It is not the Supa card game and must not inherit Supa's card rules,
Boss Race, or multiplayer match loop by accident.

The first playable goal is a 20-30 minute prototype proving that the authored
story, choices, visual tone, and AI-assisted production workflow feel
compelling. Public runtime AI branches should not block the first proof.

## Current Product Hypothesis

- 80% authored mainline VN / interactive cinema story.
- 10% authored cinematic moments, primarily still CG first.
- 10% AI-assisted authoring output, approved by the human owner.
- 0% public runtime AI in P0; one hidden/dev-only spike is allowed.

This mix is a working hypothesis for discussion. It should not be treated as a
locked final spec until promoted through an accepted decision or active spec.

## Stack Direction Under Discussion

- Authoring: Ink first, with project metadata beside it.
- Runtime: InkJS in a React / Vite / TypeScript app.
- Presentation: start with React; add Pixi'VN or a thin Pixi layer when visual
  staging needs it.
- Video: use ordinary web video first.
- AI: editing-time branch authoring first; later server-side runtime branch
  generation only with structured output, moderation, cost controls, caching,
  and hard return-to-mainline rules.
- Packaging: Web/PWA first; desktop via Tauri or Electron; mobile via
  Capacitor or Tauri mobile only after the prototype proves itself.

These choices are current candidates, not final architecture.

## Content And AI Rules

- AI may draft Ink scenes, metadata, summaries, and short side branches during
  authoring.
- AI must not rewrite the main story graph at runtime.
- Public live AI branches are post-P0 and must have a maximum length, a fixed
  return node, and a safety policy.
- User free text must be treated as user-generated input and moderated before
  it affects generated content.
- Adult material is **sex comedy / black humor comedy / AI intimacy ethics**
  (ADR-0004; matches public site energy). Spicy jokes, awkward desire, and
  sex-adjacent young-audience beats are **in-scope and expected** when not dirty.
  Do **not** reframe as romance, rom-com, or sweet “believe in love” pairing.
  Do not ship explicit nude cutscenes, non-consensual material, or free-form
  porn generation as the product purpose.

## Asset Rules

- Authored videos, images, sound, and music need stable asset IDs.
- Generated media provenance should be recorded before public release.
- Runtime asset paths should be manifest-driven once the app exists.

## Verification

Current governance-only ladder:

```bash
pnpm governance:check
git diff --check
```

Future runtime ladder should add:

- typecheck
- unit tests for story graph / Ink integration
- schema validation for metadata
- browser smoke proof for story, video, save, and AI branch flows
- AI moderation / guardrail samples
- platform packaging checks when applicable
