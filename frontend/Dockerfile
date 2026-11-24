# syntax=docker/dockerfile:1

# ---- Build: install deps, type-check and build the static app into dist/ ----
FROM node:24-alpine AS build
WORKDIR /app

# Manifests first so the dependency layer is cached until they change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime: nginx serving the static files and proxying /api ----
FROM nginx:alpine AS runtime

# Replace the default site with ours; the headers snippet is included per location.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/catalogue.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# busybox wget ships with nginx:alpine.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
