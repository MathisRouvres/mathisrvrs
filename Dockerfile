# syntax=docker/dockerfile:1
# Image LOCALE de développement (voir compose.yaml). La production utilise deploy/site/Dockerfile.
#
#   dev      Vite + HMR, sources montées depuis l'hôte  → http://localhost:5173
#   preview  build de production servi par FrankenPHP avec le Caddyfile de prod
#            (fallback SPA, en-têtes, contact.php)       → http://localhost:8090

# --- Dépendances npm (Linux glibc : binaires natifs rolldown / tailwind / lightningcss) ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund \
    && sha256sum package-lock.json > node_modules/.lock-sha

# --- Développement : serveur Vite ---
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

# --- Build de production ---
FROM deps AS build
COPY . .
# Mêmes variables que le CI (.env.example) ; les .env locaux sont exclus par .dockerignore.
RUN cp .env.example .env && npm run build

# --- Preview : comme en production, sans relais SMTP (aucun mail réel envoyé) ---
FROM dunglas/frankenphp:1.13-php8.4-alpine AS preview
COPY deploy/site/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/www
EXPOSE 80
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
