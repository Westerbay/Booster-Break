FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS deps

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN bun install --frozen-lockfile

FROM deps AS build

COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web

ENV VITE_BASE_PATH=/
ENV VITE_API_ORIGIN=
ENV VITE_LOCAL_API_ORIGIN=

RUN bun --cwd apps/api prisma:generate
RUN bun --cwd apps/web build

FROM nginx:1.30.3-alpine@sha256:0d3b80406a13a767339fbe2f41406d6c7da727ab89cf8fae399e81f780f814d1 AS runtime

RUN apk upgrade --no-cache

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html/radio \
    && chown -R nginx:nginx /etc/nginx/conf.d /run /var/cache/nginx

EXPOSE 80

USER nginx

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "--quiet", "--spider", "http://127.0.0.1/"]
