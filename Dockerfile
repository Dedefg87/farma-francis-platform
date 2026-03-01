# Multi-stage build for production - Node.js 20 Alpine
FROM node:20-alpine AS base

# Install dependencies for native modules (bindings)
RUN apk add --no-cache libc6-compat python3 make g++ curl

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@10

# Copy package files first (for better caching)
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build
COPY . .
ENV NODE_ENV=production
RUN pnpm run build

# Production stage - minimal image
FROM node:20-alpine AS production
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache curl ca-certificates

# Install pnpm for migrations
RUN npm install -g pnpm@10

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Copy drizzle config for migrations
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Run migrations and start server
CMD ["sh", "-c", "pnpm run db:push && node dist/index.js"]
