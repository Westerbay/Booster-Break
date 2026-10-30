# Rebuild the stable Caddy release with compatible security dependency updates.
FROM golang:1.27.3-alpine3.24@sha256:b8c9b82affbbb82a020bbcf998dad2ba9516944ac7e883524642a481a9505e9c AS build
WORKDIR /src
ADD --checksum=sha256:86e39de5fa0bc433a9cd574a00e7751059903401f3389c61f8937fd0ad0180f5 https://codeload.github.com/caddyserver/caddy/tar.gz/refs/tags/v2.11.7 /tmp/source.tgz
RUN tar -xzf /tmp/source.tgz --strip-components=1
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    go get github.com/go-chi/chi/v5@v5.4.0 github.com/go-jose/go-jose/v4@v4.1.6 golang.org/x/net@v0.62.0 && \
    go build -trimpath -ldflags='-s -w -X github.com/caddyserver/caddy/v2.CustomVersion=v2.11.7-security.1' -o /caddy ./cmd/caddy && \
    go list -deps ./cmd/caddy > /caddy-package-list.txt

FROM caddy:2.11.7-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f
# Update only the affected OS packages within the pinned Alpine release.
RUN apk upgrade --no-cache brotli-libs curl libcurl
COPY --from=build /caddy /usr/bin/caddy
