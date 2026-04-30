# Dockerfile multi-stage (jeito profissional)
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules (bcrypt, sharp, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install pnpm globally
RUN npm install -g pnpm@10

# Install ALL dependencies (including dev for build)
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install pnpm and runtime dependencies only (no dev)
RUN npm install -g pnpm@10 && pnpm install --prod --no-frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy Drizzle schema (for reference, not used at runtime)
COPY --from=builder /app/drizzle ./drizzle
# Copy SQL migrations (used by server/_core/migrations.ts on startup)
COPY --from=builder /app/server/database/migrations ./server/database/migrations

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000
CMD ["node", "dist/index.js"]
