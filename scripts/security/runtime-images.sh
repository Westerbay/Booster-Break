#!/usr/bin/env bash
set -euo pipefail

# Only disposable containers and synthetic fixtures are used. No Compose env file,
# existing database, host port, production certificate or persistent volume is read.
root="$(cd "$(dirname "$0")/../.." && pwd)"
fixture="$(mktemp -d)"
prefix="booster-runtime-check-$$"
postgres_image="${POSTGRES_IMAGE:-booster-break-postgres:ci}"
caddy_image="${CADDY_IMAGE:-booster-break-caddy:ci}"
cleanup() {
  docker rm -f "$prefix-postgres" "$prefix-proxy" "$prefix-upstream" >/dev/null 2>&1 || true
  docker network rm "$prefix" >/dev/null 2>&1 || true
  rm -f "$fixture/upstream.Caddyfile" "$fixture/fullchain.pem" "$fixture/privkey.pem"
  rmdir "$fixture"
}
trap cleanup EXIT

docker run --detach --name "$prefix-postgres" --network none \
  --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_USER=fixture -e POSTGRES_DB=fixture -e POSTGRES_PASSWORD=fixture-only \
  "$postgres_image" >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$prefix-postgres" pg_isready -U fixture -d fixture >/dev/null; then break; fi
  sleep 1
done
docker exec "$prefix-postgres" psql -U fixture -d fixture -v ON_ERROR_STOP=1 -c \
  "CREATE TABLE smoke (id integer PRIMARY KEY, value text); INSERT INTO smoke VALUES (1, 'synthetic'); SELECT value FROM smoke WHERE id = 1;" | grep -q synthetic
test "$(docker exec "$prefix-postgres" psql -U fixture -d fixture -Atc 'SHOW server_version_num')" = 170011

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost' \
  -keyout "$fixture/privkey.pem" -out "$fixture/fullchain.pem" >/dev/null 2>&1
cat > "$fixture/upstream.Caddyfile" <<'EOF'
:3100 {
  respond "api:{uri}"
}
:80 {
  respond "web:{uri}"
}
EOF
docker network create --internal "$prefix" >/dev/null
docker run --detach --name "$prefix-upstream" --network "$prefix" \
  --network-alias api --network-alias web \
  --mount "type=bind,src=$fixture/upstream.Caddyfile,dst=/etc/caddy/Caddyfile,readonly" \
  "$caddy_image" >/dev/null
docker run --rm --network none -e API_DOMAIN=localhost \
  --mount "type=bind,src=$root/deploy/Caddyfile,dst=/etc/caddy/Caddyfile,readonly" \
  --mount "type=bind,src=$fixture,dst=/certs,readonly" \
  "$caddy_image" caddy validate --config /etc/caddy/Caddyfile
docker run --detach --name "$prefix-proxy" --network "$prefix" -e API_DOMAIN=localhost \
  --mount "type=bind,src=$root/deploy/Caddyfile,dst=/etc/caddy/Caddyfile,readonly" \
  --mount "type=bind,src=$fixture,dst=/certs,readonly" \
  "$caddy_image" >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$prefix-proxy" curl --silent --fail --cacert /certs/fullchain.pem https://localhost/api/health >/dev/null; then break; fi
  sleep 1
done
test "$(docker exec "$prefix-proxy" curl --silent --fail --cacert /certs/fullchain.pem https://localhost/api/health)" = 'api:/health'
test "$(docker exec "$prefix-proxy" curl --silent --fail --cacert /certs/fullchain.pem https://localhost/index)" = 'web:/index'
echo 'PostgreSQL startup/SQL and Caddy TLS/API/web routing passed.'
