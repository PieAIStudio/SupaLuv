# @supaluv/web

SupaLuv browser runtime: interactive cinema shell for the default draft package
(`draft-ch01` → `draft-ch02` → `draft-ch03`, see
`packages/content/catalog/story-catalog.json`). Production loads precompiled Ink
JSON; chapter checkpoints advance along that chain. Chapter 3 ends as
`draft_end` (no AI final chapter on the production draft path).

## Responsibility

- Own the playable product shell (title, play, save/load, settings, gallery, help).
- Compose SwimmerUIKit brand components for HUD / modals / history / callouts.
- Drive InkJS story snapshots into a 16:9 VN stage.
- Optional co-play (BroadcastChannel local + Realtime opt-in); solo offline always works.

## Not responsible

- Long-form canon writing (`packages/content/narrative/`).
- Shared brand component **implementation** (SwimmerUIKit — pin npm version or verified tarball).
- Cloud multiplayer authority servers / public free-form AI novel.

## Entrypoints (AI session map)

| Path                                      | Role                                                                                                                 | Keep thin?                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `src/main.tsx`                            | Providers + mount                                                                                                    | yes                                   |
| `src/App.tsx`                             | Screen routing, atomic load lock, co-play, shell chrome                                                              | yes — story domain in `story/session` |
| `src/story/session/*`                     | **StorySession**: runner, save/resume, chapter transition                                                            | deep module; React adapter only       |
| `src/views/VisualNovelPrototype.tsx`      | Play stage **composition only** (chrome/audio/runtime hooks + JSX)                                                   | **yes — do not re-grow grab bag**     |
| `src/views/VisualNovelPrototype.props.ts` | Stable public props type (shape frozen for App callers)                                                              | change only with App contract         |
| `src/views/play/experience/*`             | **Narrative + decision + surface lifecycle**: source/playback/decision, chrome, audio, path telemetry, stage runtime | deep; order before/after stage media  |
| `src/views/play/hooks/*`                  | Play-stage hooks (choice flow, stage media, pointers, prop cut-in)                                                   | no JSX                                |
| `src/views/play/lib/*`                    | Pure play helpers (accessibility, presentation, share card, host choice, robot slots)                                | no JSX                                |
| `src/views/play/*`                        | Play-stage React components (HUD, dialogue, portraits, system menu)                                                  | preferred growth zone                 |
| `src/coplay/*`                            | Protocol, presence, RPS, transports, pointer policy                                                                  | no Supabase in DialoguePanel          |
| `src/persistence/*`                       | save schema / settings / unlocks / achievements                                                                      | stable contracts                      |
| `src/audio/*`                             | Howler façade + reverb + dialogue TTS client/segmentation                                                            | only Howler import in howlerEngine    |
| `src/auth/*`                              | Browser auth adapter for shared backend; wallet **read via edge**                                                    | never service_role                    |
| `src/commerce/*`                          | Battery pitch copy + spend-receipt client (`aiBatteryPitch.ts`, `aiSpendClient.ts`)                                  | pure pitch strings; spend via edge    |
| `src/ai/*`                                | AI branch client providers                                                                                           | mock only if FORCE_MOCK               |
| `src/hooks/*`                             | Cross-view hooks (AI slot, typewriter, fullscreen…)                                                                  | no JSX                                |
| `src/story/*`                             | Multi-chapter Ink runner (compiled JSON) + map adapter                                                               | content-facing                        |

## Seam rules (refactor doctrine)

1. **Do not grow `VisualNovelPrototype.tsx` into a grab bag.**
   - Composition wires only: `usePlaySurfaceChrome` → `usePlaySurfaceAudio` → `usePlayStageRuntime` → JSX
   - Inside runtime, narrative order is fixed: `useNarrativeSource` → `useStageMedia` → `useNarrativePlayback`
     (AI/source first, real cutscene gates TTS/autoplay same-render; no cutscene mirror state)
   - Decision / run-outcome → `views/play/experience/useDecisionExperience.ts`
     (grouped input: source / viewer / narrative / actions; nested return choice / oracle / rps / ending / commands)
   - Surface chrome (system/history/devtools/save flash) → `usePlaySurfaceChrome.ts`
   - Surface audio (unlock / now-playing / local autoplay / mute) → `usePlaySurfaceAudio.ts`
   - Path-memory scene + AI-branch facts → `usePlayPathTelemetry.ts`
   - Reset / cutscene dismiss / dialogue activate / keyboard input → owned by `usePlayStageRuntime.ts`
   - AI-branch run marker: `chooseAi(notifyAiBranchUsed)` via path telemetry + panel — no order-bridge refs
   - Choice / RPS conflict adapter → `views/play/hooks/usePlayChoiceFlow.ts` (composed by decision experience)
   - Beds / CG / SFX → `views/play/hooks/useStageMedia.ts`
   - Co-play pointers → `views/play/hooks/useCoPlayPointers.ts`
   - Pure continue labels → `views/play/lib/vnHelpers.ts`
2. **Story domain lives in `StorySession`** (`story/session/createStorySession.ts`).
   App calls the session interface; it does not re-own runner/snapshot/save orchestration.
3. **Saves are written only through `writeStorySave`** (`persistence/saveWriter.ts`),
   invoked inside StorySession — never assembled field-by-field in App.
4. **Scene → gallery unlocks** via `persistence/sceneUnlocks.ts` (pure), applied by StorySession.
5. **SwimmerUIKit** for brand controls; **local `styles.css`** only for cinema stage theme.
6. **Behavior is the contract** — unit-test StorySession + pure modules; e2e for shell path.
7. **Content drop** = Ink + scene manifest + assets — not shell rewrite.
8. **Dynamic chunking** — never statically import the compiled Ink runtime into the entry bundle
   (`story/session/storyRuntime.ts` remains lazy).

## Module map (where to change what)

| If you need to…              | Edit                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Add a meta screen            | `views/<Screen>.tsx` + route in `App.tsx`                                                     |
| Play HUD / system menu       | `views/play/PlayHud.tsx`, `SystemMenu.tsx` + chrome via `usePlaySurfaceChrome.ts`             |
| Dialogue + AI choice UI      | `views/play/DialoguePanel.tsx`                                                                |
| Play stage composition       | `views/VisualNovelPrototype.tsx` (keep thin) + `usePlayStageRuntime.ts`                       |
| Narrative source / playback  | `views/play/experience/useNarrativeSource.ts` + `useNarrativePlayback.ts` + pure resolvers    |
| Decision / ending lifecycle  | `views/play/experience/useDecisionExperience.ts` + `resolveDecisionOutcome.ts`                |
| Surface audio chrome         | `views/play/experience/usePlaySurfaceAudio.ts` (beds stay in `useStageMedia`)                 |
| Path-memory play facts       | `views/play/experience/usePlayPathTelemetry.ts`                                               |
| Host/guest choice + RPS open | `views/play/hooks/usePlayChoiceFlow.ts` (owned via decision experience)                       |
| Cutscene / stage beds / SFX timing | `views/play/hooks/useStageMedia.ts`                                                       |
| Shared cursor / touch focus  | `coplay/pointerPolicy.ts` + `views/play/hooks/useCoPlayPointers.ts`                           |
| Save / resume / chapter flow | `story/session/*` + `persistence/gameSave.ts` + `saveWriter.ts`                               |
| Save schema                  | `persistence/gameSave.ts` + `saveWriter.ts` + tests                                           |
| Settings values              | `persistence/settings.ts` + `views/settings/*` (player vs lab)                                |
| Local cinema CSS             | `styles/{base,stage,meta,coplay,chrome}.css` (barrel `styles.css`)                            |
| Co-play RPS presentation     | `coplay/rpsViewModel.ts`                                                                      |
| Audio play/pan/reverb        | `audio/gameAudio.ts` + `howlerEngine.ts`                                                      |
| Settings → audio gains       | `audio/syncGameAudioFromSettings.ts` (owned by `App`; settings UI may preview optimistically) |
| Battery pitch / spend client | `commerce/aiBatteryPitch.ts` + `commerce/aiSpendClient.ts`                                    |
| AI edge HTTP                 | `services/ai-branch/src/routeTable.ts` (not `server.ts`)                                      |
| Wallet reserve/commit        | `services/ai-branch/src/wallet/walletMeter.ts`                                                       |
| TTS fixed phrases            | `services/ai-branch/src/tts/ttsCatalog.ts`                                                        |
| Story content                | **`packages/content`**                                                                        |

## AI edge map (`services/ai-branch`)

| File                             | Role                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `server.ts`                      | secrets + listen only                                                        |
| `routeTable.ts`                  | all HTTP endpoints                                                           |
| `commercialRouteRuntime.ts`      | lazy commercial deps: shared Supabase/persistence for character/ending/spend |
| `walletMeter.ts`                 | service_role reserve/commit/refund                                           |
| `persistence/`                   | commercial modules: character settle, ending settle, spend reader            |
| `ttsCatalog.ts`                  | trusted preview phrases                                                      |
| `authGate.ts`                    | JWT verify (publishable key)                                                 |
| `handler.ts` / `mastraBranch.ts` | constrained AI generation                                                    |

## Shared backend boundary

`@pieai/swimmer-backend-client` `0.4.0` is a server-side dependency of
`services/ai-branch`. SupaLuv uses it for shared bearer-token verification and
wallet operations. Browser auth adaptation, product orchestration, and service
adapters remain here; SupaLuv schema, RLS, private bucket, and migrations live
in SwimmerBackend.

## Stability

| Area                           | Stability                                           |
| ------------------------------ | --------------------------------------------------- |
| Solo play + save/settings      | stable                                              |
| Constrained AI side branch     | stable (auth + optional meter)                      |
| Local co-play BroadcastChannel | experimental                                        |
| Cloud Realtime co-play         | experimental                                        |
| Live battery debit             | requires SwimmerBackend server credentials + app id |

## Verify

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Last reviewed: 2026-07-17
