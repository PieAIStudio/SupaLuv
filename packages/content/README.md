# @supaluv/content

Story packages, scene manifests, character locks, and Ink sources for SupaLuv.

## Responsibility

- Ship playable story sources (`ink/`, `manifests/`, `compiled/`).
- Keep source snapshots + coverage ledger for draft imports (`sources/`, `ledgers/`).
- Keep character lock packs (`characters/`) for consistent portraits.
- Hold noncanonical narrative drafts (`narrative/`).
- Expose **lightweight production catalog metadata** plus **async per-chapter loaders**.

## Not responsible

- React UI / audio playback / save system (web app).
- Canon finalization (still noncanonical drafts unless owner promotes).
- Shipping the Ink compiler (`inkjs/full`) to players.

## Current default package

Production package id `draft-2026-07` (catalog label: **草稿三章 · 2026-07**).
Chapter chain SSOT is `catalog/story-catalog.json` only.

| Path                                                                               | Role                                                                        |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `sources/draft-2026-07/`                                                           | Snapshots `draft01.md` / `draft02.md` / `draft03.md` + SHA-256 manifest     |
| `ledgers/draft-2026-07-coverage.json`                                              | Derived coverage: 434 body paragraphs + 33 structure titles/separators      |
| `ledgers/draft-2026-07-coverage-overrides.json`                                    | Reviewed adaptation/disambiguation receipts, pinned to source hashes        |
| `ink/draft-ch01.ink` / `draft-ch02.ink` / `draft-ch03.ink`                         | Production Ink topology sources                                             |
| `compiled/draft-ch01.json` / `draft-ch02.json` / `draft-ch03.json`                 | Precompiled Ink for async player load                                       |
| `catalog/story-catalog.json`                                                       | Data-only catalog SSOT (chapters, bilingual labels, features, voice, files) |
| `generated/narrative-graph-player.json`                                            | Production-safe NarrativeGraph skeleton (opaque handles / structure only)   |
| `generated/narrative-graph-creator.json`                                           | Full creator graph (Node/dev only; semantic ids, titles, excerpts, ranges)  |
| `manifests/draft-ch01-scenes.ts` / `draft-ch02-scenes.ts` / `draft-ch03-scenes.ts` | Presentation-only scene metadata                                            |
| `src/chapters/draft-ch01.ts` / `draft-ch02.ts` / `draft-ch03.ts` (+ dev chapters)  | Per-chapter dynamic import modules (compiled JSON + scenes)                 |
| `ink/legacy/ch01.ink`                                                              | Retired demo archive (not in production catalog)                            |

Default start chapter: `draft-ch01`. Checkpoints: `draft-ch01` → `draft-ch02` →
`draft-ch03`. Chapter 3 is `draft_end` (no AI final chapter on this production
draft chain).

## Entrypoints

| Path                                   | Role                                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| `src/index.ts`                         | Metadata catalog + `loadStoryChapter` (no static raw Ink)    |
| `src/story-catalog.generated.ts`       | Checked type IDs/defaults generated from catalog JSON        |
| `src/chapters/<id>.ts`                 | One chapter payload; loaded only when that chapter is chosen |
| `scripts/compile-ink.mjs`              | Precompile Ink → `compiled/*.json` (oxfmt-stable)            |
| `scripts/generate-coverage.mjs`        | Rebuild coverage ledger from snapshots (oxfmt-stable)        |
| `scripts/verify-fidelity.mjs`          | Verify source → Ink → compiled runtime fidelity in zh-CN/en  |
| `scripts/generate-narrative-graph.mjs` | Ink runtime → creator + player NarrativeGraph (oxfmt-stable) |
| `src/narrative-graph-player.ts`        | Safe production export of player skeleton                    |
| `src/narrative-graph-creator.node.ts`  | Node/dev-only creator loader (not in production web graph)   |
| `characters/registry.ts`               | Speaker → stage side / default portrait                      |

## Content pipeline

```text
Temp/draftXX.md (read-only import source)
  -> sources/draft-YYYY-MM/draftXX.md (byte-identical snapshot + SOURCE-MANIFEST.json)
  -> ledgers/*-coverage-overrides.json (reviewed migration baseline + sourceHash pins; not owner approval)
  -> ledgers/*-coverage.json (derived body id/hash/scene/status + structure field + digest)
  -> ink/draft-chXX.ink with # scene:<id> and # choice:<id>
  -> manifests/draft-chXX-scenes.ts (presentation only; no choices/autoNext edges)
  -> catalog/story-catalog.json (single catalog SSOT consumed by runtime + graph generation)
  -> pnpm --filter @supaluv/content compile-ink
  -> pnpm --filter @supaluv/content generate-coverage
  -> pnpm --filter @supaluv/content generate-narrative-graph
  -> productionStoryCatalog metadata + loadStoryChapter("draft-chXX")
  -> getNarrativeGraphPlayerSkeleton() for Player Path; Node creator loader for Studio
```

Ink is the only story topology SSOT. Scene manifests must not re-author `choices` / `autoNext`.
Package/chapter catalog truth lives in `catalog/story-catalog.json` only — both `src/index.ts`
and `scripts/generate-narrative-graph.mjs` read that file; do not hard-code a second chapter list.
NarrativeGraph is a derived, deterministic graph (scene/choice level) shared by later Creator Studio and Player Path — never hand-edited.

Production runtime loads **one chapter at a time** via `loadStoryChapter`. Players receive `inkjs` Story runtime only — never the compiler package. The player skeleton uses non-semantic opaque handles only (no stable scene/choice id fields, prose, source ranges, or labels). Runtime observations map `storyId + sceneId` / stable choice ids through shared opaque helpers without shipping a semantic lookup table.

## Verify

```bash
pnpm --filter @supaluv/content compile-ink
pnpm --filter @supaluv/content generate-coverage
pnpm --filter @supaluv/content generate-narrative-graph
pnpm --filter @supaluv/content fidelity
pnpm test   # includes source hash, coverage, topology, path, and production-graph tests
```

## Stability

`evolving` for draft-2026-07; legacy `ch01` is archived and not player-selectable.

The fidelity gate executes representative visible-menu traversals and records text that Ink actually
emits; it also checks every exact paragraph and reviewed adaptation target, duplicate literal
occurrence capacity, ambiguous-match source adjacency, compiled freshness, bilingual topology, and
reachable scene/terminal contracts. It is deliberately fail-closed: an unvisited line fails coverage
instead of being accepted because it merely exists in dead Ink source.

Last reviewed: 2026-07-22
