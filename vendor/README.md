# Pinned Shared Packages

These tarballs make SupaLuv installable without sibling checkouts on one
developer machine. They are generated package artifacts, not forks of the
shared packages. Product code and prompts remain in SupaLuv; shared package
source remains in its owning repository.

| Package | Version | Upstream commit | SHA-256 |
| --- | --- | --- | --- |
| `@pieai/swimmer-ai-kit` | `0.2.0` | `f44601f91804deb778778e56172b564971c9a138` | `c2bb1ba1282a19002f661cdeab84750ce61506d1c35f6e5d3d2c800ec93c1ddb` |
| `@pieai/swimmer-ui-kit` | `1.0.1` | `c5c8a8ab31dd719fd387e5cb972aa9d7af70632c` | `381111e53c4713fdf49d1ab172981f0253b1aff7d5f1d7d70be9d46100cd93fd` |

The commit suffix in each filename is an audit hint; the SHA-256 is the
artifact integrity proof. When a package is published through its trusted
release workflow, SupaLuv may replace the tarball with that exact registry
version after its own full regression gate passes.

Regeneration must happen from a clean checkout at the recorded commit:

```bash
pnpm build
pnpm pack --pack-destination /path/to/SupaLuv/vendor
shasum -a 256 /path/to/SupaLuv/vendor/*.tgz
```
