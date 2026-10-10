---
id: REF-LEARNING-WORKFLOW-ISSUES-BIND-REVIEWED-GENERATION-PLANS-TO-REQUESTS-BINARIES-AND-GOVERNANCE
title: "Bind reviewed generation plans to requests, binaries, and governance"
type: reference
status: stable
canonical: true
owner: ai-assisted
created: 2026-07-22
last_reviewed: 2026-07-22
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

# Bind reviewed generation plans to requests, binaries, and governance

## Guidance

Symptom: a reviewed paid voice-generation plan could authorize changed synthesis volume or replaced MP3 bytes, and successful generation could publish runtime catalog entries without matching ledger and provenance updates. Root cause: the digest covered desired keys but not the effective provider request, existing binary hashes and metadata, or governance artifacts; file, catalog, ledger, and provenance mutations also had no explicit commit point. Fix: derive request bodies and plan data from one immutable synthesis specification; bind every existing output SHA-256, byte count, audio metadata, ledger hash, provenance digest, and frozen legacy-debt fingerprint; stage and validate generated audio before activation; treat the runtime catalog as the commit point; update governance artifacts within a rollback-tested transaction and delete orphans only after activation. Prevention: any reviewed or paid asset pipeline should prove what will be requested, exactly which bytes are accepted, and how runtime plus governance state move together, with fault-injection tests around every activation phase.

## Applies When

- The work is complete and verified.
- The lesson is non-obvious, reusable, and not already documented.
