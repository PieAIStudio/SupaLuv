---
id: REF-OWNER-APPROVED-AUDIT-EXTRACT-2026-07
title: Owner-approved extract from 2026-07 commercial audit
type: archive
status: archived
canonical: false
owner: human
created: 2026-07-10
last_reviewed: 2026-07-12
domain: strategy
tags:
  - audit
  - product
  - ux
pinned: false
related:
  - ADR-0003
  - REF-CURRENT-WORK
  - REF-FEATURE-STATUS-ROADMAP
  - ARCH-COMMERCIAL-COMPLETION-AUDIT-2026-07
archive_reason: Accepted findings have either shipped or moved into current-work; keep as audit history.
---

# Owner-approved extract (2026-07 commercial audit)

> Full external audit is **archived** (not default AI truth). This file keeps
> only findings the owner accepted or engineering verified as real bugs.

## Rejected from the audit (do not re-litigate)

| Claim | Why rejected |
| --- | --- |
| Sell story at `$12.99 / $14.99 / $17.99` | Owner freemium: free story, battery AI (ADR-0003). |
| Free AI samples / Demo without battery | Owner: **no free AI quota**; studio does not pay free users’ compute. |
| Freeze all “peripheral” systems for 90 days | Novels advance in parallel; framework must be ready when content lands. Only hard conflicts defer work. |
| Hide achievements / gallery / co-play by default | Owner: keep visible for now; hide only if later evidence demands. |
| “黑色**爱情**喜剧” / disaster **rom-com** as pitch | Owner: **black humor / sex comedy**, not romance (ADR-0004). Do not pull story toward sweet love. |

## Accepted engineering / UX findings (fix these)

1. **Choice panel clipping** at desktop 16:9 — first/four-option choices can be
   cut off (`overflow` + low `max-height` on dialogue box).
2. **Portrait mobile is shrink-not-adapt** — phase policy: landscape-first +
   rotate hint; do not claim full portrait product.
3. **Continue can restore a blank scene** — Ink state loads but presentation
   (text/scene) is not always recoverable at choice boundaries; save must store
   presentation snapshot.
4. **Scroll position leaks** across meta screens — reset scroll/focus on navigate.
5. **Settings is a developer cockpit** — split player vs lab over time (not a
   freeze-all mandate).
6. **Help / copy drift** — player-facing text must match runtime (e.g. mock
   only when force-mock).
7. **Cutscene overlay too “demo-explanatory”** — prefer discreet skip.
8. **English UI ready ≠ English story ready** — do not use unedited EN story
   as overseas quality proof.
9. **TTS open text endpoint is abuse-prone** — prefer lineId / server-approved
   hash eventually; fixed preview phrases for settings.
10. **Doc/runtime TTS conflict** — runtime is **ElevenLabs + MiniMax**, not
    OpenAI fallback; docs must match runtime.
11. **In-memory choice stats are not “global”** — label honestly or replace.
12. **E2E must dismiss Boot Splash** after splash was added.
13. **Stack keep** — Vite/React/TS/InkJS/Howler/Swimmer\* / PostHog; no forced
    Pixi’VN / Redux / Colyseus / SwimmerGameServerKit now.
14. **AI should leave a remembered token** when possible (commercial value of
    paid AI), still forced rejoin to Ink.
15. **Chapter-end “order/receipt” card** is a strong brand signature — keep
    investing.
16. **Do not burn Oct 2026 Steam Next Fest** if Ch1 is not yet the commercial
    representative (one attempt only).

## Build philosophy (owner)

- Content pipeline (novel → script → Ink) and runtime systems run **in
  parallel**.
- Prefer modular, AI-readable seams for co-play, stats, AI branch, TTS, wallet.
- Defer only on **serious conflict** (e.g. custom AI faces vs authored lead CG
  video — ADR-0002).

## Where the full audit went

`docs/archive/commercial-completion-audit-2026-07.md` (+ quality-loop artifacts
under `artifacts/quality-loop/tmp/…`, not governed AI startup path).
