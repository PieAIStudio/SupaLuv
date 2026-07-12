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

| Path                                                      | Role                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `sources/draft-2026-07/`                                  | Byte-identical snapshots of `Temp/draft01.md` / `draft02.md` + SHA-256 manifest |
| `ledgers/draft-2026-07-coverage.json`                     | Body-paragraph coverage (169 entries) + structure titles/separators             |
| `ink/draft-ch01.ink` / `ink/draft-ch02.ink`               | Production Ink topology SSOT                                                    |
| `compiled/draft-ch01.json` / `draft-ch02.json`            | Precompiled Ink for async player load                                           |
| `manifests/draft-ch01-scenes.ts` / `draft-ch02-scenes.ts` | Presentation-only scene metadata                                                |
| `src/chapters/*.ts`                                       | Per-chapter dynamic import modules (compiled JSON + scenes)                     |
| `ink/legacy/ch01.ink`                                     | Retired demo archive (not in production catalog)                                |

Default story id: `draft-ch01`. Chapter 1 checkpoint → `draft-ch02`. Chapter 2 is draft end (no AI final chapter).

## Entrypoints

| Path                            | Role                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `src/index.ts`                  | Metadata catalog + `loadStoryChapter` (no static raw Ink)    |
| `src/chapters/<id>.ts`          | One chapter payload; loaded only when that chapter is chosen |
| `scripts/compile-ink.mjs`       | Precompile Ink → `compiled/*.json` (oxfmt-stable)            |
| `scripts/generate-coverage.mjs` | Rebuild coverage ledger from snapshots (oxfmt-stable)        |
| `characters/registry.ts`        | Speaker → stage side / default portrait                      |

## Content pipeline

```text
Temp/draftXX.md (read-only import source)
  -> sources/draft-YYYY-MM/draftXX.md (byte-identical snapshot + SOURCE-MANIFEST.json)
  -> ledgers/*-coverage.json (body paragraph id/hash/scene/status + structure field)
  -> ink/draft-chXX.ink with # scene:<id> and # choice:<id>
  -> manifests/draft-chXX-scenes.ts (presentation only; no choices/autoNext edges)
  -> pnpm --filter @supaluv/content compile-ink
  -> pnpm --filter @supaluv/content generate-coverage
  -> productionStoryCatalog metadata + loadStoryChapter("draft-chXX")
```

Ink is the only story topology SSOT. Scene manifests must not re-author `choices` / `autoNext`.

Production runtime loads **one chapter at a time** via `loadStoryChapter`. Players receive `inkjs` Story runtime only — never the compiler package.

## Verify

```bash
pnpm --filter @supaluv/content compile-ink
pnpm --filter @supaluv/content generate-coverage
pnpm test   # includes source hash, coverage, topology, path, and production-graph tests
```

## Stability

`evolving` for draft-2026-07; legacy `ch01` is archived and not player-selectable.

Last reviewed: 2026-07-13
