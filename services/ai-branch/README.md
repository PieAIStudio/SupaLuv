# @supaluv/ai-branch

Server edge for constrained AI side branches, TTS, wallet metering, character
packs/references, and AI ending sessions. Product docs live under `docs/**`;
this file is a **handoff map for the next AI/human** working in this package.

Last reviewed: 2026-07-19 (domain dir grouping).

## Responsibility

- HTTP API for AI branch generation, preview/catalog TTS, wallet balance,
  commercial character/ending/spend routes.
- Auth via bearer JWT (`authGate.ts`); commercial wallet via service_role only
  (`wallet/walletMeter.ts` + `commercialServerConfig.ts`).
- Content safety on AI branch input/output (`safetyGate.ts`).

## Not responsible

- Browser UI, Ink story topology, or client save state (`apps/web`, `packages/content`).
- Product policy ADRs (see `docs/adr/`).

## Module map

| File / dir                      | One-line job                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `src/server.ts`                 | Load secret/public env files, listen, dispatch only — no product logic       |
| `src/routeTable.ts`             | All HTTP endpoints (`handleAiBranchRequest`)                                 |
| `src/handler.ts`                | `generateAiBranch`: prefer Mastra path, fall back to direct OpenRouter       |
| `src/branch/`                   | Side-branch types, prompts, Mastra gen, choice-stats store                   |
| `src/character/`                | Pack generation, image providers, safety, asset routes                       |
| `src/ending/`                   | Final-chapter session, prompts, schemas, routes                              |
| `src/tts/`                      | Dual-locale TTS + preview catalog                                            |
| `src/wallet/`                   | Battery meter + spend receipt routes                                         |
| `src/safetyGate.ts`             | Pre/post moderation for AI branch text (SwimmerAIKit + optional Sightengine) |
| `src/persistence/`              | Commercial domain stores (character / ending / spend reader); see its README |
| `src/commercialRouteRuntime.ts` | Lazy wire-up of character/ending/spend deps from credentials                 |
| `src/authGate.ts`               | Verify `Authorization: Bearer` against Swimmer Core publishable key          |

## HTTP surface (from `routeTable.ts`)

| Method   | Path                                                       | Notes                                                                      |
| -------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| GET      | `/health`, `/`                                             | Health snapshot; `tts.providers` + `tts.freeformEnabled` (capability only) |
| GET      | `/wallet/balance`                                          | Auth required                                                              |
| POST     | `/tts/preview`                                             | Auth; catalog `previewId` only; not billed                                 |
| POST     | `/tts/synthesize`                                          | Auth; free-form text only if env allows (below)                            |
| POST     | `/ai/branch`, `/`                                          | Auth + reserve/settle when metering on                                     |
| GET/POST | `/choice-stats`, `/choice-stats/record`                    | Aggregate choice counts                                                    |
| *        | `/ai/characters/*`, `/ai/endings/sessions/*`, spend routes | Commercial modules via `commercialRouteRuntime`                            |

## Env switches (code defaults)

| Variable                                                | Default / rule                    | Meaning in code                                                                                                          |
| ------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SUPALUV_TTS_ALLOW_FREEFORM`                            | **off** unless exactly `"1"`      | When unset/≠`1`, free-form synthesize returns 400; `/health` reports `tts.freeformEnabled: false` so clients can degrade |
| `SUPALUV_WALLET_OPTIONAL`                               | off unless `"1"`                  | If wallet secrets missing: optional mode allows unmetered local use; otherwise spend denied                              |
| `SWIMMER_CORE_SUPABASE_URL` + `SWIMMER_CORE_SECRET_KEY` | required for meter                | Only credentials that enable `walletMeter` / commercial settle                                                           |
| `OPENROUTER_API_KEY`                                    | required for generation           | Branch / ending model calls                                                                                              |
| `SUPALUV_OPENROUTER_MODEL`                              | `google/gemini-3.5-flash`         | Branch model id                                                                                                          |
| `SUPALUV_THINKING_LEVEL`                                | `high`                            | Exposed in health + branch call options                                                                                  |
| `SUPALUV_AI_BRANCH_COST_BATTERIES`                      | `1`                               | Batteries reserved per branch                                                                                            |
| `SUPALUV_TTS_COST_BATTERIES`                            | `0`                               | Batteries reserved per paid TTS                                                                                          |
| `SUPALUV_TTS_DEFAULT_LANG`                              | `zh-CN`                           | Default TTS language                                                                                                     |
| `SUPALUV_AI_BRANCH_PORT` / `PORT`                       | `8787`                            | Listen port                                                                                                              |
| `SUPALUV_AI_BRANCH_HOST`                                | `127.0.0.1`                       | Listen host                                                                                                              |
| `SUPALUV_SERVER_ENV_FILE` / `SUPALUV_PUBLIC_ENV_FILE`   | optional                          | Override default `~/PieAI/.secrets/supaluv/local.{server,public}.env`                                                    |
| `SIGHTENGINE_API_USER` + `SIGHTENGINE_API_SECRET`       | optional                          | Extra moderation backend for safety gate                                                                                 |
| `SUPALUV_CHARACTER_IMAGE_PROVIDER`                      | `openrouter` (or unset); `gemini` | Character image provider selection                                                                                       |
| `GEMINI_API_KEY`                                        | when provider needs it            | Character image / review                                                                                                 |

Server vs public env boundary: `localServerEnv.ts` rejects `VITE_*` in server
files and non-`VITE_*` in public files.

## Local run

```bash
# from repo root
pnpm dev:ai
# or
pnpm --filter @supaluv/ai-branch dev

# production-style one-shot
pnpm --filter @supaluv/ai-branch start
```

Default URL: `http://127.0.0.1:8787`. Pair with `pnpm dev:web` or `pnpm dev:full`.

Secrets: place server keys in `local.server.env` (or `SUPALUV_SERVER_ENV_FILE`);
browser-prefixed values only in `local.public.env`.

## Verify

```bash
pnpm --filter @supaluv/ai-branch typecheck
# targeted commercial / AI unit tests (repo root)
pnpm exec vitest run tests/unit/commercial-persistence.test.ts \
  tests/unit/character-generation.test.ts \
  tests/unit/ai-ending-service.test.ts
pnpm typecheck
```

## Stability

Evolving service boundary. Prefer extending `routeTable` / domain modules over
growing `server.ts`. Free-form TTS stays closed unless an owner sets
`SUPALUV_TTS_ALLOW_FREEFORM=1`.
