# Dependency security patches

These patches are applied by the package manager and pinned in the lockfile.
Run `test:dependency-security` with this project's package manager after installation.
The regression tests fail on the original packages and pass on the patched copies.

## deepmerge 4.3.1

[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): reject `__proto__` when copying either input so an attacker cannot poison the returned object's prototype. Keep the existing arrays, symbols and custom merge API. No fixed upstream release was available on 2026-10-29. The source, CommonJS and browser bundles are patched.

## Zod 3.25.76

[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): backport early rejection of oversized **bounded** collections, following the behavior of [upstream PR 6652](https://github.com/colinhacks/zod/pull/6652). Keep the v3 API required by transitive consumers. Both v3 and bundled v4 runtime entry points (CommonJS and ESM) are patched. Tests cover synchronous/asynchronous parsing, valid transforms, sets and v4 overwrite ordering.

This does not add limits to unbounded schemas. Preserve request-body limits and explicit collection bounds; the patch is not a general resource-exhaustion guarantee. Oversized invalid inputs now stop before parsing their elements, so error aggregation and transform side effects on rejected elements intentionally differ.

## Maintenance

Version-only scanners, including Dependabot, may continue to report the original version. Do not dismiss an alert solely because a patch exists. Review its affected paths and tests, replace the patch with a compatible upstream release when available, and remove the matching regression-only direct dependency or alias when it is no longer needed. These checks do not establish what is deployed.
