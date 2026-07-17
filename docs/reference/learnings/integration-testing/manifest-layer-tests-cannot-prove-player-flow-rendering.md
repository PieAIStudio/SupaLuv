---
id: REF-LEARNING-INTEGRATION-TESTING-MANIFEST-LAYER-TESTS-CANNOT-PROVE-PLAYER-FLOW-RENDERING
title: "Manifest-layer tests cannot prove player-flow rendering"
type: reference
status: stable
canonical: true
owner: ai-assisted
created: 2026-07-17
last_reviewed: 2026-07-17
domain: learning
tags:
  - learning-recall
  - integration-testing
pinned: false
related: []
category: integration-testing
module: "PGS learning capture"
capture_mode: pgs-native
---

# Manifest-layer tests cannot prove player-flow rendering

## Guidance

596 unit tests plus e2e all passed while every authored mood portrait was flattened to the base face in real play: the character studio's official-cast binding (moodUrls: {}) intercepted portrait resolution after the manifest layer, and no test covered the manifest→binding→stage composition path players actually hit. Lesson: for any layered override system (casting, portrait packs, display names), add at least one test that walks the full player path with the DEFAULT onboarding choices, and verify visually in-browser once per art/meter feature. Found by browser playtest at dch03_s029; fixed by passing authored art through for official: bindings (apps/web/src/characters/portraitResolver.ts).

## Applies When

- The work is complete and verified.
- The lesson is non-obvious, reusable, and not already documented.
