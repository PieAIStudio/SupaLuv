# Pinned Unpublished Shared Package

This tarball makes SupaLuv installable without a sibling SwimmerAIKit checkout.
It is a generated package artifact, not a fork. Product code and prompts remain
in SupaLuv; shared package source remains in its owning repository.

| Package | Version | Upstream commit | SHA-256 |
| --- | --- | --- | --- |
| `@pieai/swimmer-ai-kit` | `0.2.1` | `ff9adeb49264b42fe8dbd5f14e695a4d33a9e859` | `7f32fbe1ff00297383e0f92c1dd5d5fa2390597dc051b904f6fe1f2036afd6b8` |

The commit suffix in the filename is an audit hint; the SHA-256 is the artifact
integrity proof. `@pieai/swimmer-ui-kit` is no longer vendored: SupaLuv pins the
trusted-published npm version `1.0.1` exactly. When SwimmerAIKit completes its
own public-package bootstrap and trusted release, SupaLuv may replace this
remaining tarball after its full regression gate passes.

Regeneration must happen from a clean checkout at the recorded commit:

```bash
pnpm build
pnpm pack --pack-destination /path/to/SupaLuv/vendor
shasum -a 256 /path/to/SupaLuv/vendor/*.tgz
```
