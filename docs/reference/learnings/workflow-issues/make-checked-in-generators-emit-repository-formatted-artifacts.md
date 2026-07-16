---
id: REF-LEARNING-WORKFLOW-ISSUES-MAKE-CHECKED-IN-GENERATORS-EMIT-REPOSITORY-FORMATTED-ARTIFACTS
title: "Make checked-in generators emit repository-formatted artifacts"
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

# Make checked-in generators emit repository-formatted artifacts

## Guidance

Symptom: a candidate package passed its own validators, then pnpm verify failed at format:check on generated JSON/HTML and emitted lint warnings. Root cause: the generator wrote JSON.stringify output and the delegated package never ran the repository-wide formatter/linter. Proven fix: normalize all checked-in candidate artifacts with the repository formatter, remove lint warnings, and make any rerunnable generator invoke the pinned local formatter so regeneration is byte-stable and cannot recreate a dirty tree. Apply whenever scripts generate version-controlled JSON, HTML, or other formatter-owned artifacts.

## Applies When

- The work is complete and verified.
- The lesson is non-obvious, reusable, and not already documented.
