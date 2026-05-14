---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-05-14
domain: meta
tags:
  - current-work
  - navigation
  - supaluv
pinned: true
related:
  - REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
  - REF-DOCUMENTATION-MAP
  - ADR-0001
  - PLAN-0001
  - SPEC-0001
  - PLAN-0002
---

# SupaLuv Current Work

This file is the current project work index. It is not the agents-routing algorithm.

## Current Focus

- Current phase: project governance installed; minimal engineering bootstrap is
  in place for a Web-first React / Vite / TypeScript baseline, plus a
  noncanonical Chapter 01 trial pipeline.
- Current active plan: `docs/plans/active/PLAN-0002-chapter-01-trial-pipeline.md`.
- Current active spec: `docs/specs/active/SPEC-0001-chapter-01-trial-pipeline.md`.
- Current discussion brief: `docs/reference/strategy/supaluv-interactive-cinema-discussion-brief.md`.
- Current proposed decision: `docs/decisions/ADR-0001-propose-web-first-ink-pixivn-evaluation-supaluv.md`.
- Current source material entry: `docs/reference/source-material/super-lover-outline.md`
  is a symlink to the Obsidian vault outline for 超级爱人. Treat it as
  read-only provenance, not as a project work draft.
- Current proof target: keep the bootstrap small enough to run governance,
  formatting, lint, typecheck, unit tests, build, and e2e smoke while proving a
  read-only Chapter 01 trial path from scene cards to Ink, React selection, and
  generated Canvas overview, without importing Supa card-game systems or
  locking Pixi'VN before a spike.
- Current prototype content rule: the experimental first chapter at the
  Obsidian `proxy-love` manuscript path may be used only as a non-canonical
  pipeline dummy. Do not copy it wholesale, do not edit it in place, and do not
  treat its story choices as final SupaLuv canon. The local prototype artifacts
  derived from it must stay short, placeholder-grade, and explicitly
  noncanonical.

## Current Runtime Bootstrap

The current engineering baseline is intentionally thin:

- Root package: `supaluv`.
- Workspace packages: `@supaluv/web`, `@supaluv/content`,
  `@supaluv/shared`, plus the existing `@pieai/doc-gov` tool package.
- Web app: React / Vite / TypeScript shell only.
- Content package: minimal source-material manifest for 超级爱人, with the
  source outline marked read-only, plus noncanonical prototype and Chapter 01
  trial scene manifests, Ink fixtures, and a generated Canvas overview for the
  current pipeline proof.
- Shared package: small runtime/content types used by the app and tests.
- Testing: Vitest unit tests and a Playwright web smoke test, including story
  switching and Canvas alignment checks.
- Active plan: keep `prototype-act1` as the default VN shell while adding a
  noncanonical Chapter 01 trial selector and generated creator overview.

Not included in this baseline:

- Phaser.
- Colyseus.
- Supabase runtime integration.
- Supa card rules, Boss Race, or multiplayer authority.
- Public runtime AI, payments, or account/login work.
- Pixi'VN dependency before a spike plan exists.
- Any chapter-01 experiment text as canonical content.
- Canvas as runtime truth; it remains a generated creator overview only.

## Startup Notes For The Next AI Session

1. Read `AGENTS.md` first.
2. Read `docs/policy/best-practice-for-this-project.md`.
3. Read the discussion brief and proposed ADR listed above.
4. Do not pull in Supa card-game runtime assumptions.
5. Treat the current strategy as a working hypothesis, not final architecture.
6. Do not edit `docs/reference/source-material/super-lover-outline.md`; edits
   through that symlink would modify the Obsidian vault source file.
7. Treat `packages/content/canvas/chapter-01-trial.canvas` as generated
   creator-facing output, not as the canonical story source.
8. Keep `prototype-act1` available as the default story even while trial
   pipeline work is active.
9. Do not start Unity, Godot, Ren'Py, Steam, App Store, or mobile packaging
   work before the 20-30 minute Web prototype direction has an accepted
   decision and implementation plan.

## Completed Proof History

Completed plans and specs live in:

- `docs/plans/completed/`
- `docs/specs/completed/`

Do not move completed work back into active. Create a new plan and link the completed record as provenance.
