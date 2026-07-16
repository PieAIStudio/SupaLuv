---
id: REF-LEARNING-WORKFLOW-ISSUES-MODULE-LEVEL-PROVIDER-CONSTRUCTION-CAPTURES-ENV-BEFORE-LOCAL-SECRETS-LOAD
title: "Module-level provider construction captures env before local secrets load"
type: reference
status: stable
canonical: true
owner: ai-assisted
created: 2026-07-16
last_reviewed: 2026-07-16
domain: learning
tags:
  - learning-recall
  - workflow-issues
pinned: false
related: []
category: workflow-issues
module: "PGS learning capture"
capture_mode: pgs-native
---

# Module-level provider construction captures env before local secrets load

## Guidance

Symptom: local TTS always failed with 'TTS provider not configured for route=chinese want=minimax' while /health reported minimax:true. Root cause: services/ai-branch server.ts loads ~/.secrets env files in its module body, but ttsRoute.ts built the TTS router at module scope; ES module imports run before the loader body, so the router captured an env without provider keys. /health lied because it re-read process.env per request. Production hid the bug (Vercel injects env before import). Fix: build the router lazily on first use (routerInstance ??= buildRouter()). Prevention: in services that late-load secret env files, never construct provider clients at module scope; use lazy memoized getters, and distrust health snapshots that read env on a different code path than the consumer.

## Applies When

- The work is complete and verified.
- The lesson is non-obvious, reusable, and not already documented.
