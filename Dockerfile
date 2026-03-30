# Build: forced rebuild - Mon Mar 30 13:45 GMT-3 2026
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install pnpm
RUN npm install -g pnpm@10

# Install ALL dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build with verbose output
RUN pnpm run build 2>&1

# Start
EXPOSE 3000
CMD ["pnpm", "start"]
