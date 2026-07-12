---
id: PLAN-0001
title: React InkJS Baseline and PixiVN Spike Plan
type: archive
status: archived
canonical: false
owner: ai-assisted
created: 2026-05-13
last_reviewed: 2026-07-12
domain: implementation
tags:
  - supaluv
  - react
  - inkjs
  - pixivn
  - prototype
  - story-map
pinned: false
related:
  - REF-CURRENT-WORK
  - REF-DOCUMENTATION-MAP
  - REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
  - ADR-0001
archive_reason: The React and InkJS baseline shipped; unexecuted PixiVN and editor spikes were deliberately not adopted.
---

# PLAN-0001: React InkJS Baseline and PixiVN Spike Plan

> **For agentic workers:** execute this plan task-by-task. Keep each checkbox
> small enough to verify. Do not implement public runtime AI, payments,
> accounts, multiplayer, Phaser, Colyseus, or Supa card-game systems.

## Goal

Build evidence for the first visible SupaLuv prototype path by comparing a
minimal React + InkJS baseline with a narrow Pixi'VN spike, while also proving
that the creator can see a branch overview of a story segment.

## Core Judgment

Use the current experimental first chapter only as a non-canonical pipeline
dummy. It is useful because it has scene locations, emotional beats, and a clear
purchase action, but it is explicitly not the final story and must not become
canon by accident.

Beginner version: this chapter is a cardboard stand-in on a rehearsal stage. It
helps test lighting, doors, props, and camera position. It is not the final
actor, script, or set.

## Research Baseline

Current May 2026 source check:

- Ink is an open-source scripting language for interactive narrative, designed
  for text-centric and graphical games with highly branching stories:
  <https://github.com/inkle/ink>.
- Ink can be compiled to JSON and run through a runtime API where the app
  continues text and renders current choices:
  <https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md>.
- InkJS is the JavaScript port used in browsers and Node.js:
  <https://github.com/y-lohse/inkjs>.
- Pixi'VN documents an Ink integration using `@drincs/pixi-vn-ink`, but its
  docs also list ignored or upcoming Ink syntax, so it must be proven with a
  spike before becoming the baseline: <https://pixi-vn.web.app/ink>.
- React Flow is a React library for node-based editors and interactive diagrams:
  <https://reactflow.dev/>.
- Twine's Story Map is a useful reference for creator-facing branch overview:
  passages as cards, links as arrowed lines:
  <https://twinery.org/reference/en/editing-stories/navigating.html>.
- Mermaid flowcharts are a cheap text-first way to render branch maps before a
  custom editor exists:
  <https://mermaid.ai/open-source/syntax/flowchart.html>.
- articy:draft is a professional external reference for visual branching
  narrative design, but it should not be introduced into P0 unless the local
  map approach fails: <https://www.articy.com/en/articydraft/feature-list/>.

## Scope

In scope:

- Add a minimal InkJS story runtime to the existing React / Vite app.
- Convert a short, rough segment from the experimental chapter into a tiny Ink
  fixture with scene IDs and 2-3 choices.
- Add a creator-facing static story map generated from the fixture metadata.
- Add a React Flow spike only after the Mermaid/static map proves useful.
- Generate or place temporary non-canonical visual placeholders only if the
  story runtime is already visible and tested.
- Run a small Pixi'VN spike with the same story beats and compare evidence.

Out of scope:

- Final chapter adaptation.
- Large-scale prose rewriting.
- Public runtime AI branches.
- Explicit sexual content or pornographic asset generation.
- Payment, login, cloud save, mobile packaging, Steam/App Store work.
- Phaser, Colyseus, Supa card rules, Boss Race, multiplayer match loop.

## Source Material Rules

- Do not edit the Obsidian experimental chapter.
- Do not copy the full experimental chapter into SupaLuv.
- If a local sample is needed, write a short derived fixture with new scene IDs,
  not a verbatim project copy.
- Mark every derived fixture as `noncanonical: true`.
- When the official chapter is ready, replace the fixture through a new content
  adaptation task instead of silently editing this spike.

## Proposed Trial Segment

Use 5-6 story cards, not the full chapter:

| Scene ID | Purpose | Visual placeholder |
| --- | --- | --- |
| `act1_office_shame_test` | Show Su Ming testing an empathy reply at work | Office desk, monitor glow |
| `act1_lunch_forum_hint` | Introduce the companion-machine market as background noise | Food court / phone screen |
| `act1_property_pickup` | Show breakup logistics and erased access | Apartment lobby / white bag |
| `act1_rental_room_search` | Move from public shame to private search | Small rented room |
| `act1_product_page` | Reveal the product page and familiar phrase | Clean product UI |
| `act1_payment` | End on irreversible order/payment action | Phone payment confirmation |

The point is to test transformation, not to preserve wrong draft quality.

## Architecture

```text
packages/content/
  ink/
    prototype-act1.ink
  manifests/
    prototype-scenes.ts
    prototype-assets.ts
  src/
    index.ts

packages/shared/
  src/
    story-types.ts
    story-map.ts

apps/web/
  src/
    story/
      inkStoryRunner.ts
      storyMapAdapter.ts
    views/
      VisualNovelPrototype.tsx
      StoryMapPreview.tsx
```

Data flow:

```text
experimental chapter summary
  -> short noncanonical scene cards
  -> Ink fixture plus scene metadata
  -> React + InkJS player
  -> generated Mermaid map
  -> optional React Flow map
  -> Pixi'VN spike comparison
```

## Tasks

### Task 1: Lock The Noncanonical Trial Boundary

**Files:**

- Modify: `docs/reference/execution/current-work.md`
- Modify: `docs/reference/documentation-map.md`
- Create: `packages/content/manifests/prototype-scenes.ts`

- [x] Add wording that the experimental chapter is a pipeline dummy, not canon.
- [x] Create scene metadata with `noncanonical: true`.
- [x] Verify with `pnpm typecheck`.
- [x] Verify with `pnpm governance:check`.

### Task 2: Add A Tiny Ink Fixture

**Files:**

- Create: `packages/content/ink/prototype-act1.ink`
- Modify: `packages/content/src/index.ts`
- Create: `tests/unit/prototype-ink-fixture.test.ts`

- [x] Add an Ink file with 5-6 short scenes and 2-3 choices.
- [x] Keep text short and clearly placeholder-grade.
- [x] Add tests that assert expected scene IDs and noncanonical metadata.
- [x] Verify with `pnpm test`.

### Task 3: Add InkJS Runtime Adapter

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/story/inkStoryRunner.ts`
- Create: `tests/unit/ink-story-runner.test.ts`

- [x] Add `inkjs`.
- [x] Load the compiled or parsed prototype story in a deterministic adapter.
- [x] Expose current text, choices, and choose-by-index behavior.
- [x] Test the first screen and one branch path.
- [x] Verify with `pnpm typecheck` and `pnpm test`.

### Task 4: Make The Prototype Visible In React

**Files:**

- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/views/VisualNovelPrototype.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `tests/e2e/web-smoke.spec.ts`

- [x] Render current story text.
- [x] Render choices as buttons.
- [x] Let the user advance through at least one branch.
- [x] Keep all UI copy honest: placeholder, noncanonical, prototype.
- [x] Verify with `pnpm test:e2e`.

### Task 5: Add Static Story Overview

**Files:**

- Create: `packages/shared/src/story-map.ts`
- Create: `apps/web/src/story/storyMapAdapter.ts`
- Create: `apps/web/src/views/StoryMapPreview.tsx`
- Create: `tests/unit/story-map.test.ts`

- [x] Convert scene metadata into nodes and edges.
- [x] Render a creator-facing Mermaid-compatible flowchart string.
- [x] Display a simple readable map in the app before adding React Flow.
- [x] Verify map output in unit tests.

### Task 6: Optional React Flow Spike

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/views/ReactFlowStoryMapSpike.tsx`
- Create: `tests/e2e/story-map-spike.spec.ts`

- [ ] Add `@xyflow/react` only after Task 5 is useful.
- [ ] Render the same scene graph as draggable/zoomable nodes.
- [ ] Keep it read-only for P0; no node editing yet.
- [ ] Compare whether this helps the creator understand branches better than
      Mermaid.

### Task 7: Temporary Visual Asset Spike

**Files:**

- Create: `packages/content/manifests/prototype-assets.ts`
- Create: `packages/content/assets/prototype/README.md` only if this path is
  explicitly opted in as product artifact outside governed docs.
- Modify: `apps/web/src/views/VisualNovelPrototype.tsx`

- [ ] Generate or place safe placeholder backgrounds and stand-ins for the 5-6
      story cards.
- [ ] Record generated media provenance in the asset manifest.
- [ ] Avoid explicit sexual images, fetish imagery, or realistic deepfake-like
      people.
- [ ] Verify assets load in browser e2e.

### Task 8: Pixi'VN Spike

**Files:**

- Create: `apps/web/src/spikes/pixivn/README.md`
- Create: `apps/web/src/spikes/pixivn/pixiVnSpike.ts`
- Create: `tests/unit/pixivn-spike-boundary.test.ts`

- [ ] Add Pixi'VN dependencies only inside the spike task.
- [ ] Try the same scene cards with Pixi'VN + Ink integration.
- [ ] Record which Ink syntax works, which syntax is ignored, and which runtime
      behavior needs custom glue.
- [ ] Do not replace the React + InkJS baseline unless the evidence clearly
      favors Pixi'VN.

### Task 9: Compare And Decide

**Files:**

- Create: `docs/decisions/ADR-0002-accept-react-inkjs-baseline-or-pixivn.md`
  only after `pnpm doc-gov find "react inkjs pixivn decision"` finds no better
  existing decision.
- Modify: `docs/reference/execution/current-work.md`

- [ ] Compare setup time, code size, creator visibility, story portability,
      visual polish, testability, and migration risk.
- [ ] Recommend one baseline for the first playable prototype.
- [ ] Keep rejected option notes as evidence, not as dead code.

## Acceptance

- [ ] The owner can open the web app and see a rough visual-novel-like flow.
- [ ] The owner can click at least one choice and see the story branch or merge.
- [ ] The owner can see a story overview showing scenes and choices.
- [x] The experimental chapter is clearly marked noncanonical everywhere it is
      used.
- [ ] React + InkJS and Pixi'VN are compared with the same scene material.
- [x] The project still has no Phaser, Colyseus, card rules, multiplayer,
      accounts, payments, or public runtime AI.
- [x] `pnpm governance:check`, `pnpm format:check`, `pnpm lint`,
      `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, and
      `git diff --check` pass before closeout.

## Loopholes And Fixes

| Loophole | Why It Hurts | Fix |
| --- | --- | --- |
| The wrong chapter becomes canon because it appears in the app | The creator may start judging the product through known-bad prose | Use short derived scene cards and `noncanonical: true`; label the UI as prototype |
| Asset generation becomes the main task | Visual polish can eat the whole prototype budget | Generate only 5-6 safe placeholders after the story click path works |
| React Flow becomes a full editor too early | Building an editor can outrun the game | P0 map is read-only; editing comes after story runtime proof |
| Pixi'VN looks cooler, so it gets locked without evidence | A smaller ecosystem or syntax limitation may cost more later | Same-scene spike, explicit comparison table, no dependency promotion without ADR |
| Ink graph and visual graph drift apart | Creator overview stops matching playable story | Generate map from scene metadata used by runtime, not from a separate drawing |
| Public runtime AI sneaks into the prototype | Safety and platform risk explode before story proof | Only editing-time AI and generated assets; no player free-text AI in PLAN-0001 |

## Closeout

When complete:

- Move this file to `docs/plans/completed/`.
- Set `status: completed`.
- Update `docs/reference/execution/current-work.md`.
- Record the accepted baseline in a decision document if the evidence is strong
  enough.
