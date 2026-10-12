# ─────────────────────────────────────────────────────────────────────────
# AIStylo app — self-contained.
#
# Builds the SPA and serves it over Node. No nginx here: this image runs on
# its own with nothing else present.
#
#   docker build -t aistylo/app .
#   docker run -p 3000:3000 aistylo/app     → http://localhost:3000
#
# The nginx reverse proxy in docker-compose.yml is optional and sits in
# front of this; it is not required for the app to run.
# ─────────────────────────────────────────────────────────────────────────

# ── Build ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install against the lockfile alone so this layer caches across source edits.
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Baked in at build time: Vite inlines VITE_* into the bundle, so these are
# build args rather than runtime env.
ARG VITE_STYLIST_API
ARG VITE_STYLIST_API_KEY
ENV VITE_STYLIST_API=$VITE_STYLIST_API \
    VITE_STYLIST_API_KEY=$VITE_STYLIST_API_KEY

RUN npm run build

# ── Dev (docker compose --profile dev) ───────────────────────────────────
# Dependencies are baked into the image; source is bind-mounted at runtime.
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Runtime ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Only the static server's own source and the built bundle ship here — no
# node_modules, no build toolchain, no shell utilities beyond the base image.
COPY --from=build /app/dist ./dist
COPY docker/server.mjs ./server.mjs

# `node` (uid 1000) ships with the base image. Drop root.
USER node

EXPOSE 3000

# Node's own fetch, so the image needs no curl or wget.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
