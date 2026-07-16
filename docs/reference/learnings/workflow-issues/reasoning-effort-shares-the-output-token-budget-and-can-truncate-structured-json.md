---
id: REF-LEARNING-WORKFLOW-ISSUES-REASONING-EFFORT-SHARES-THE-OUTPUT-TOKEN-BUDGET-AND-CAN-TRUNCATE-STRUCTURED-JSON
title: "Reasoning effort shares the output token budget and can truncate structured JSON"
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

# Reasoning effort shares the output token budget and can truncate structured JSON

## Guidance

Symptom: ai-branch responses always carried provider=openrouter-fallback; server log said 'Mastra agent did not return JSON'. Root cause: agent.generate used maxOutputTokens 900 while OpenRouter/Gemini reasoning effort=high consumes the same completion budget, so the JSON tail truncated and parse failed on every call; the resilient fallback then re-billed a second model call silently (2x cost per AI branch). Fix: raise maxOutputTokens (2048) so answer tokens survive after reasoning; verified live probe returns provider=mastra+openrouter. Prevention: when any reasoning/thinking effort is enabled, size maxOutputTokens for reasoning+answer, and treat a permanently-firing fallback path as a billing bug, not resilience working.

## Applies When

- The work is complete and verified.
- The lesson is non-obvious, reusable, and not already documented.
