# Visual asset intake

This directory separates three facts that must not be conflated:

- `RUNTIME-ASSET-LEDGER.csv` fingerprints files already loaded by the runtime, including audio.
- `VISUAL-ASSET-INTAKE.json` records the two draft chapters' visual production contract, present files, known missing files, source/ownership evidence, and release status.
- `ATTRIBUTION.md` explains the human-readable provenance and unresolved rights evidence.

Ink and scene manifests remain the story and presentation topology. The visual intake references their stable keys only; it must not become a second scene graph or chapter catalog.

## Status model

Every visual asset has independent status fields:

- `fileStatus`: whether the exact file exists now.
- `qualityStatus`: `production_ready`, `prototype_only`, `legacy_only`, or `missing`.
- `rightsStatus`: `cleared`, `pending`, or `not_required`.
- `requiredForProduction`: whether production mode must block until all three gates are satisfied.

`prototype_only` and `rightsStatus=pending` are deliberate blockers. Presence in the playable draft is not release approval.

## Contracts

The intake uses reusable contracts for backgrounds, UI stills, transparent portraits, source references, and prop UI. Each contract fixes:

- allowed extension and decoded MIME;
- pixel dimensions and aspect-ratio budget;
- byte budget;
- alpha policy;
- visible-magenta threshold for runtime portraits.

Missing assets still reference a contract so the expected delivery format is known before a file arrives.

## Commands

Validate the runtime hash ledger, then the visual intake (structure, reverse coverage, present-file quality):

```bash
pnpm assets:check
# equivalent pieces:
#   hash + duplicate check, then
pnpm assets:intake
# node tools/asset-audit.mjs --mode=intake
```

`assets:check` is part of `cloud:check`, so structural/coverage regressions fail before build. Draft development stays buildable while formal art is still incomplete.

Run the formal release gate. This intentionally fails until all required files are present, quality is approved, rights are cleared, and open production gaps are resolved:

```bash
pnpm assets:production
# node tools/asset-audit.mjs --mode=production
```

**正式发行候选必须显式跑 `assets:production`。** It is not wired into the default draft `build` / `cloud:check` chain, because real production materials are not all delivered yet. Shipping or paid-release review must invoke it and treat a non-zero exit as a release blocker.

Write machine-readable evidence without changing source assets:

```bash
node tools/asset-audit.mjs --mode=intake --json \
  --report .devspace-visual/round-11-assets/asset-audit-intake.json
```

The focused unit test runs the same current-workspace intake and proves the production gate remains blocked for named IDs:

```bash
pnpm exec vitest run tests/unit/content-assets.test.ts --config vitest.config.ts
```

Production portraits (`portrait-runtime-2x3` + `requiredForProduction=true`) reuse the calibrated `tools/portrait-matte` gate (coverage, probes, partial alpha, topology, magenta edges). Legacy/placeholder portraits keep only basic size/MIME/alpha checks.

## Intake workflow

1. Allocate or reuse one stable asset ID.
2. Add the intended usage and contract before importing a file.
3. Record `path`, byte size, SHA-256, source, owner, and evidence only after the real file exists.
4. Keep `fileStatus=missing`, `path=null`, `sha256=null`, and `bytes=null` for an unresolved delivery.
5. Set `qualityStatus=production_ready` only after the file passes the contract and human art review.
6. Set `rightsStatus=cleared` only after owner review of the applicable source, license, account terms, and likeness permissions.
7. Re-run intake mode and production mode. Do not silence a blocker by pointing a new character ID at a legacy placeholder.

`Temp/` is never an asset source of truth. No secret, cloud receipt, or private account data belongs in this ledger.
