# Pinned Unpublished Shared Package

This tarball makes SupaLuv installable without a sibling SwimmerAIKit checkout.
It is a generated package artifact, not a fork. Product code and prompts remain
in SupaLuv; shared package source remains in its owning repository.

| Package | Version | Upstream commit | SHA-256 |
| --- | --- | --- | --- |
| `@pieai/swimmer-ai-kit` | `0.2.0` | `f44601f91804deb778778e56172b564971c9a138` | `c2bb1ba1282a19002f661cdeab84750ce61506d1c35f6e5d3d2c800ec93c1ddb` |

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
