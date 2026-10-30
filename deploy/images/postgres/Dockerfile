# Preserve the official entrypoint, data directory, extensions and user IDs.
FROM golang:1.27.3-alpine3.24@sha256:b8c9b82affbbb82a020bbcf998dad2ba9516944ac7e883524642a481a9505e9c AS gosu
WORKDIR /src
ADD --checksum=sha256:cd9719b775dbfedae53923c9b0dc792b66d42c51e0b36652ed6f747fbadc0164 https://codeload.github.com/tianon/gosu/tar.gz/refs/tags/1.19 /tmp/source.tgz
RUN tar -xzf /tmp/source.tgz --strip-components=1
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    go get github.com/moby/sys/user@v0.4.1 golang.org/x/sys@v0.44.0 && \
    go build -trimpath -ldflags='-s -w' -o /gosu .

FROM postgres:17.11-alpine3.24@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b
COPY --from=gosu /gosu /usr/local/bin/gosu
RUN gosu nobody true
