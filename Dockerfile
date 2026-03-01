FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install pnpm
RUN npm install -g pnpm@10

# Install ALL dependencies (including devDependencies)
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm run build

# Start
EXPOSE 3000
CMD ["pnpm", "start"]
