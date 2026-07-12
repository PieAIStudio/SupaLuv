---
id: LEARNING-SEPARATE-LOCAL-ENV-TRUST-BOUNDARY
title: Separate local env files at the browser trust boundary
type: reference
status: stable
canonical: true
owner: project
created: 2026-07-11
last_reviewed: 2026-07-12
domain: security
tags:
  - security
  - environment
  - secrets
  - vite
  - trust-boundary
pinned: false
related: []
---

# Separate local env files at the browser trust boundary

## Context

SupaLuv previously loaded one mixed local env file from both its Vite config
and AI server. Vite filtered keys in code, but a future filtering regression
would have exposed a much larger set of values.

## Guidance

Store VITE_* browser-safe values in a public env file and all other runtime values in a server env file. Reject misplaced keys when loading. A server process may load both files in one direction, while the Vite/browser build must load only the public file. Preserve shell and deployment-platform values over local files, test missing-file behavior, and scan built client assets for server-only values.

## Why This Matters

Vite variables are compiled into browser assets and must be treated as public.
Separating the files makes the trust boundary structural instead of depending
only on a prefix filter. A server may safely read public configuration in
addition to private configuration; the reverse direction is forbidden. Build
asset scanning proves the boundary using real local values without printing
them.

## When to Apply

- A browser build and server share configuration names or storage.
- Local files materialize values that are injected separately in production.
- The framework exposes a public prefix such as `VITE_*`.
- A migration needs to preserve injected environment variables as the highest
  priority and tolerate missing local files in cloud deployments.

## Examples

```text
server process -> local.server.env + local.public.env
Vite build     -> local.public.env only
```
