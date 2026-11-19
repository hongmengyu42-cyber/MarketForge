# ──── Stage 1: Build Static Assets ────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build SPA
COPY . .
RUN npm run build

# ──── Stage 2: Serve with Nginx ────
FROM nginx:1.27-alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized production Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
