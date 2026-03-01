# Multi-stage build for production
FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Development stage
FROM base AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl ca-certificates

# Install pnpm
RUN npm install -g pnpm@10

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist/public ./client/dist
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
