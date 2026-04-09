# Build: farma-francis-platform - Docker builder (após falha nixpacks)
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules (bcrypt, sharp, esbuild)
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install pnpm
RUN npm install -g pnpm@10

# Install ALL dependencies (including dev for build)
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Runtime image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies only (no dev)
COPY package.json pnpm-lock.yaml .npmrc ./
RUN npm install -g pnpm@10 && pnpm install --prod --no-frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
# Copy Drizzle schema files (for reference, not used at runtime since we removed drizzle-kit push)
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/drizzle ./drizzle
# Copy SQL migrations (used by server/_core/migrations.ts on startup)
COPY --from=builder /app/server/database/migrations ./server/database/migrations
# Note: public assets are inside dist/public (Vite output)
# .env files are optional (handled by Railway variables)

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000
CMD ["node", "dist/index.js"]