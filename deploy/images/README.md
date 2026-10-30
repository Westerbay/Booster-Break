# Runtime security images

The Compose files build two local images. Keep this `images/` directory alongside
the server Compose file when copying the deployment configuration.

- PostgreSQL stays on major 17, updated to 17.11. The official entrypoint, data
  directory and extensions are retained. `gosu` 1.19 is rebuilt with Go 1.27.3 and
  the corrected `moby/sys/user` and `x/sys` dependencies.
- Caddy stays on the stable 2.11 line, updated to 2.11.7. Its binary is rebuilt
  with Go 1.27.3, chi 5.4.0, go-jose/v4 4.1.6 and x/net 0.62.0. The image also
  updates Brotli and curl from the existing Alpine release's security repository.

Base images and source archives are pinned by digest/checksum. Alpine security
packages are intentionally resolved during the build; record and rescan the final
image before deployment. This does not claim that all transitive advisories have
a compatible fix or that the application is deployed.

From the directory containing `docker-compose.server.yml`, build explicitly:

```sh
docker compose -f docker-compose.server.yml build --pull postgres caddy
```

These commands only build images; they do not replace running services or migrate
a database. Apply the normal backup, staging and controlled restart procedure
before deploying a PostgreSQL image update. Do not use `down -v` on existing data.
`pull_policy: build` also makes Compose build these local images during startup,
instead of trying to pull a nonexistent public image.

CI builds both images, checks PostgreSQL startup and SQL on disposable data, and
checks the real Caddy configuration with synthetic TLS certificates and upstreams:

```sh
docker build -t booster-break-postgres:ci deploy/images/postgres
docker build -t booster-break-caddy:ci deploy/images/caddy
bash scripts/security/runtime-images.sh
```

Source advisories: [PostgreSQL 17](https://www.postgresql.org/support/security/17/),
[Caddy connection reuse](https://github.com/caddyserver/caddy/security/advisories/GHSA-6365-7ppr-5r92),
[Caddy 2.11.7](https://github.com/caddyserver/caddy/releases/tag/v2.11.7).

## Remaining upstream advisories

The rebuilt Caddy binary still includes go-jose/v3 3.0.5. There is no published
v3 fix for CVE-2026-116585, CVE-2026-116586 and CVE-2026-116587. These affect
CBC-HMAC decryption, deeply nested JSON or hostile RSA JWK parsing respectively.
The repository proxy configuration uses static certificates and does not enable
an ACME server or JOSE authentication handler; deployed configuration is not
verified. Do not treat the dependency version as corrected. Replacing the
cryptographic dependency chain requires a separate upstream-compatible change.

Trivy also reports GO-2026-5932 for the unmaintained `x/crypto/openpgp` package.
The compiled package list contains no `golang.org/x/crypto/openpgp` package,
so this notice does not affect this exact binary. The build stage records that
list at `/caddy-package-list.txt`; reassess it after changing dependencies.
No ignore file suppresses these scan results.
