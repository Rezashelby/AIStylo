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

# ── Serve ────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# nginx's own user already exists in the base image; drop root for the workers.
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
