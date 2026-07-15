# Visual asset intake

This directory separates three facts that must not be conflated:

- `RUNTIME-ASSET-LEDGER.csv` fingerprints files already loaded by the runtime, including audio.
- `VISUAL-ASSET-INTAKE.json` records the two draft chapters' visual intake candidates, present files, known missing files, provenance, structured rights review records, and release status.
- `ATTRIBUTION.md` explains the human-readable provenance and unresolved rights evidence.

Ink and scene manifests remain the story and presentation topology. Production necessity is derived from independent truth sources: scene manifests, the frozen current-character mapping backed by the runtime registry, the archive record contract, the formal Su Ming portrait-matte allowlist, the boot runtime source, and the runtime asset ledger. The visual intake references those stable IDs and paths; it must not become a second scene graph, character registry, or authority that can opt required work out of release review.

## Status model

Every visual asset has independent status fields:

- `fileStatus`: whether the exact file exists now.
- `qualityStatus`: `production_ready`, `prototype_only`, `legacy_only`, or `missing`.
- `rightsStatus`: `cleared`, `pending`, or `not_required`.
- `requiredForProduction`: a human-readable mirror of the independently derived production requirement. A mismatched value produces a warning and cannot disable a production check.

`prototype_only` and `rightsStatus=pending` are deliberate blockers. Presence in the playable draft is not release approval.

## Rights evidence

`source.type`, `source.owner`, and `source.evidence` describe provenance only. They do not clear commercial, generation, assignment, or likeness rights. A public HTTPS policy URL is also provenance only.

`rightsStatus=cleared` requires at least one valid object in the top-level `rightsEvidence` array for the same `assetId`:

- `kind`: `project_ownership`, `commercial_license`, `commission_assignment`, `generation_terms`, `likeness_release`, or `public_domain`;
- `ownerOrLicensor`: the identified rights holder or licensor (substantive text; placeholders and filler such as all-x are rejected);
- `reference`: an existing non-symlink regular file under `packages/content/assets/rights-evidence/` (HTTPS URLs cannot clear rights);
- `sha256`: lowercase SHA-256 of those exact bytes;
- `reviewedAt`: a real UTC `YYYY-MM-DD` date not later than the audit clock day;
- `reviewer`: the identified human reviewer.

The reference is resolved with symlink-safe workspace containment. Symlinks are rejected. The final realpath must not be the intake, attribution, README, audit implementation, or its tests. Byte digest must match `sha256`.

Pending, placeholder, self-referential, future-dated, or arbitrary values such as `ok` are rejected. The current `rightsEvidence: []` is intentional: no receipt, license, account-session record, assignment, or likeness release has been supplied and reviewed for the existing visuals, so those assets remain `pending`. Machine acceptance of structured evidence is not legal authenticity; human review remains required.

## Gap resolutions

Formal production gaps (`gap-background-shot-list`, `gap-npc-mood-matrix`, `gap-commercial-rights-evidence`) are independently required. Intake `gap.status=resolved` is non-authoritative and never suppresses a blocker by itself.

A formal gap stops blocking only when a matching top-level `gapResolutions` record passes every check:

- `gapId`: existing intake gap id (unknown and duplicate ids fail closed);
- `approvedBy`: identified human approver (substantive non-placeholder text);
- `reviewedAt`: real UTC `YYYY-MM-DD` not later than the audit clock day;
- `reference`: existing non-symlink regular file under `packages/content/assets/release-evidence/`;
- `sha256`: lowercase SHA-256 matching those exact bytes.

The current `gapResolutions: []` is intentional. Do not fabricate approvals, shot-list freezes, or rights-review closeout records.

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

Truth-required production portraits using `portrait-runtime-2x3` reuse the calibrated `tools/portrait-matte` gate (coverage, probes, partial alpha, topology, magenta edges), even when an intake record incorrectly says `requiredForProduction=false`. Legacy/placeholder portraits outside the production truth map keep only basic size/MIME/alpha checks.

Every CLI input and `--report` destination is workspace-contained after symlink resolution. Existing path components are resolved one by one. When the final file or parent directories do not yet exist, the audit starts from the nearest existing real parent, rejects any symlink escape, and only then permits safe directory creation.

## Intake workflow

1. Allocate or reuse one stable asset ID.
2. Add the intended usage and contract before importing a file.
3. Record `path`, byte size, SHA-256, and provenance only after the real file exists.
4. Keep `fileStatus=missing`, `path=null`, `sha256=null`, and `bytes=null` for an unresolved delivery.
5. Set `qualityStatus=production_ready` only after the file passes the contract and human art review.
6. Add truthful structured `rightsEvidence` (local file + SHA-256 + identified reviewer + non-future date) only after a human has reviewed the applicable ownership, license, account terms, assignment, and likeness permissions. Then, and only then, set `rightsStatus=cleared`.
7. Close a formal production gap only with a truthful `gapResolutions` record under `release-evidence/`. Never rely on `gap.status=resolved` alone.
8. Re-run intake mode and production mode. Do not silence a blocker by pointing a new character ID at a legacy placeholder.

`Temp/` is never an asset source of truth. No secret, cloud receipt, or private account data belongs in this ledger.
