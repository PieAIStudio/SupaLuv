---
id: REF-LEARNING-WORKFLOW-ISSUES-SCOPE-PLAYWRIGHT-API-MOCKS-TO-THE-API-NAMESPACE
title: "Scope Playwright API mocks to the API namespace"
type: reference
status: stable
canonical: true
owner: ai-assisted
created: 2026-07-15
last_reviewed: 2026-07-15
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

# Scope Playwright API mocks to the API namespace

## Guidance

Symptom: Playwright E2E opened a blank white/black page and waited forever for title-new-game or locale controls. Verified root cause: route glob **/choice-stats** also matched Vite source module /packages/shared/src/choice-stats-catalog.ts and fulfilled JavaScript with application/json. Proven fix: scope mocks to **/api/choice-stats**; the three failed E2E cases then passed and the full 29-test suite passed. Prevention: API mocks must include the concrete /api/ namespace (and preferably method/path assertions), especially when endpoint names can also appear in source filenames or @fs module URLs.

## Applies When

- The work is complete and verified.
- The lesson is non-obvious, reusable, and not already documented.
