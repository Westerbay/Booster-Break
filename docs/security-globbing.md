# Dependency security backports

The minimatch and glob backports preserve the installed major versions and public APIs.

- [CVE-2026-118764](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249): cap `**/..` expansion and skip quadratic deduplication above 1,000 patterns. Adapted from upstream commit `77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8` to the shipped CommonJS and ESM files. Versions 9 and 10 use the upstream 100,000-pattern default; the public matching API is unchanged.
- [CVE-2026-118773](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4): stop pending directory walks after cancellation and complete resumed callbacks. Adapted from upstream commit `4682e8c9babee1b385202ede36389634e12076d7` to the shipped CommonJS and ESM files.

Run `node --test scripts/security/dependency-dos.test.cjs` after a full installation. Tests exercise bounded matching, ordinary matching, abort during filesystem traversal, and all patched installed versions. Temporary files and HTTP requests use synthetic data on the local machine only.

Keep the patch files in installation and Docker build contexts. Version-based scanners will still report the original versions: these are local mitigations, not upstream fixed releases. Remove each patch only after upgrading to a compatible official fix and passing these regressions. No deployment or exploitability is inferred from the lockfile.
