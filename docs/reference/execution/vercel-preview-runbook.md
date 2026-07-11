---
id: REF-VERCEL-PREVIEW-RUNBOOK
title: SupaLuv Vercel Deployment Runbook
type: reference
status: active
canonical: false
owner: ai-assisted
created: 2026-07-11
last_reviewed: 2026-07-11
domain: operations
tags:
  - vercel
  - preview
  - deployment
  - wallet
pinned: false
related:
  - REF-CURRENT-WORK
  - REF-FRAMEWORK-SHELL-2026-07
---

# SupaLuv Vercel Deployment Runbook

## Deployment contract

- Vercel project: `supaluv`.
- Architecture: one Vercel Services deployment with `web` (Vite) and
  `ai-branch` (Node).
- Public routes: `/api/*` goes to `ai-branch`; all other paths go to `web`.
- Preview protection stays enabled. Use authenticated `vercel curl` for
  automation; do not disable protection merely to make plain `curl` pass.
- Use Vercel CLI `55.0.0` or newer. Older CLI `54.14.5` generates the obsolete
  `experimentalServices` key and cannot validate GA service destinations.
- Production domain: `https://supaluv.pieaistudio.com`.
- Namecheap remains the authoritative DNS provider. The `supaluv` CNAME points
  to `cname.vercel-dns.com`; changing the whole domain to Vercel nameservers is
  not required.

## Build and deploy

```bash
pnpm cloud:check
pnpm test:e2e
pnpm build:vercel
pnpm verify:vercel-output
pnpm vercel deploy --target=preview --yes
# Explicit owner approval is required before:
pnpm vercel deploy --prod --yes
```

The repository test suite includes the service-routing contract. A deployment is
not accepted solely because the local build succeeds; inspect the READY
deployment and run the checks below against its deployment ID.

## Environment groups

Never print or commit values. Preview and Production need:

- AI and safety: `OPENROUTER_API_KEY`, `SUPALUV_OPENROUTER_MODEL`,
  `SUPALUV_THINKING_LEVEL`, `SIGHTENGINE_API_USER`,
  `SIGHTENGINE_API_SECRET`.
- SwimmerCore browser/auth: `VITE_SWIMMER_CORE_SUPABASE_URL`,
  `VITE_SWIMMER_CORE_PUBLISHABLE_KEY` and their server equivalents.
- Wallet server: product-specific `SWIMMER_CORE_SECRET_KEY` plus
  `SUPALUV_SWIMMER_APP_ID=supaluv`. Do not reuse a test key or another product's
  secret key.
- TTS: `ELEVENLABS_API_KEY`, `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`,
  `MINIMAX_GROUP_ID`, `SUPALUV_TTS_DEFAULT_LANG`.
- Product analytics: `VITE_ENABLE_POSTHOG`, `VITE_POSTHOG_KEY`,
  `VITE_POSTHOG_HOST`.

Store secret values as Vercel Sensitive variables. Production promotion was
approved and completed on 2026-07-11. `MINIMAX_GROUP_ID` remains absent, so
Chinese TTS must not be advertised as live yet.

## Acceptance checks

1. `GET /api/ai/health` returns 200 and reports configuration state plus non-sensitive runtime metadata,
   never secret values.
2. An unauthenticated `POST /api/ai/branch` returns 401 before provider or local
   configuration details.
3. An authenticated zero-balance user gets wallet 200 with zero balance and AI
   402 `INSUFFICIENT_BATTERIES`; no silent unmetered call is allowed.
4. `POST /api/tts/preview` requires authentication. English ElevenLabs Preview
   is verified. Chinese MiniMax is incomplete while `MINIMAX_GROUP_ID` is empty.
5. `GET /api/choice-stats` returns 200, but its current `source: memory` is demo
   state only and is not durable across server instances or deployments.
6. Unknown `/api/*` routes return the AI service's 404 rather than the SPA HTML.

## Verified evidence (2026-07-11)

- READY protected Preview: deployment `dpl_3ujeofHfHjbMYzLQ5Y2MSUiY8NXe`.
- READY Production: deployment `dpl_FcLXhdhiS5oGBjRTeQfdYHKy5iUJ`, aliased to
  `https://supaluv.pieaistudio.com` with a valid HTTPS certificate.
- Routing/auth regression tests: 11 focused tests passed before deployment.
- Live health: OpenRouter, Sightengine, ElevenLabs, MiniMax key and wallet meter
  detected; MiniMax group ID absent.
- Live wallet: authenticated new user returned zero available/reserved units.
- Live AI gate: authenticated zero-balance user returned 402.
- Live English TTS: 200 with a parsed audio payload; the temporary smoke user was
  deleted afterward.
- Production repeated the same acceptance contract: home 200, API root 404,
  wallet 200 with zero batteries, AI 402 `INSUFFICIENT`, and English TTS 200.
