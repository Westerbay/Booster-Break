# Dependency security fixes

Reviewed against official releases on 2026-11-02. Prefer a compatible published
release over a local patch; keep the lockfile as the source of installed versions.

- `minimatch@11.0.4` replaces the backports for compatible consumers. The official
  fix for [CVE-2026-118764](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)
  is available from 11.0.1. Overrides exclude legacy major versions.

## Remaining local patches

- `deepmerge@4.3.1`: local guard rejecting `__proto__` keys on both merge inputs,
  based on [CVE-2026-93753](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
  The advisory lists no patched version and 4.3.1 remains the latest published release.
  This is a project-maintained mitigation, not an official upstream fix. Remove it
  after a compatible release passes the prototype-pollution and normal-merge tests.
- `zod@3.25.76`: adaptation of the early collection-length check from
  [upstream Zod 4 PR #6652](https://github.com/colinhacks/zod/pull/6652) to Zod 3.
  There is no newer published Zod 3 release; forcing Zod 4 into transitive Zod 3
  consumers changes their API. The patch keeps the v3 API and skips parsing oversized
  arrays. Remove it after those consumers migrate, then rerun the oversized-array
  and ordinary-validation tests.

## Validation and removal

Run the root `test:dependency-security` script after a full frozen installation.
It exercises the installed modules with synthetic inputs, checking both the
security boundary and normal behavior. Run the affected lint, typecheck and build
commands as well: a passing security regression alone does not prove compatibility.

Keep the remaining patch files in installation and Docker build contexts. Local
patches retain the original package version, so version-based advisories remain
visible; a proposed PR does not establish integration or deployment. Remove obsolete
patch files and manifest entries together with a package-manager-generated lockfile.
