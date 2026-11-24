# syntax=docker/dockerfile:1

# ---- Build: install all deps, compile TypeScript to dist/ ----
FROM node:24-alpine AS build
WORKDIR /app

# Manifests first so the dependency layer is cached until they change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Runtime: production deps + compiled output only ----
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ARG PORT=3000
ENV PORT=${PORT}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Owned by root and read-only to the app user: the process can't modify its own code.
COPY --from=build /app/dist ./dist

USER node
EXPOSE ${PORT}

# Uses Node's built-in fetch, so no curl/wget needed. Reads PORT at run time.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# Exec form: node is PID 1 and receives SIGTERM directly (server.ts closes gracefully).
CMD ["node", "--enable-source-maps", "dist/server.js"]
