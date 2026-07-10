---
id: REF-PRODUCT-SHELL-SKELETON
title: Commercial Product Shell Skeleton
type: reference
status: active
canonical: false
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-10
domain: architecture
tags:
  - commercial
  - i18n
  - shell
pinned: false
related:
  - REF-CURRENT-WORK
  - REF-FEATURE-STATUS-ROADMAP
---

# Commercial product shell skeleton

From a commercial interactive-cinema lens, the playable demo needs a **shell**
around the story: account, money, language, safety, and discoverability.

## Landed (skeleton or live)

| Surface | Status |
| --- | --- |
| Boot splash (click → unlock audio) | live |
| Title + settings language switch | live (zh-CN / en; others WIP) |
| SwimmerCore guest login | live |
| AI requires auth | live |
| Battery wallet (read soft) | partial |
| Howler audio + reverb / stereo pan | live |
| Dual TTS edge | live when `dev:ai` running |
| Gallery music collection | live |
| Age / ToS / a11y copy slots | settings skeleton |

## Recommended next skeleton (not all code yet)

1. **Age gate** once per device before boot splash (adult comedy notice).
2. **Battery pack purchase UI** (Lemon Squeezy / Stripe) → `wallet_grant`.
3. **Cloud save optional** behind login (local remains default).
4. **Content warning** modal first launch.
5. **Patch notes** panel on title (version + changelog).
6. **Report / feedback** (link or form).
7. **Reduced motion** setting wired to CSS.
8. **Ink localization** packs per chapter (separate from UI i18n).

## Language switch placement

| Place | Why |
| --- | --- |
| Title (中文 / EN chips) | Immediate for global players |
| Settings full locale grid | Power users + future locales |
| Persist `supaluv.locale.v1` | Survive reloads |

Story Ink text stays authored language until content packs land.
