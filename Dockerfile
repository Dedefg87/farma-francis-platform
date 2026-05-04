# -------------------------
# STAGE 1 — BUILD
# -------------------------
FROM node:20-alpine AS builder

ARG CACHEBUST=20260504-1815

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm@10

# Copia arquivos de dependências
COPY package.json pnpm-lock.yaml .npmrc ./

# Instala TODAS as dependências (incluindo Vite)
RUN pnpm install --no-frozen-lockfile

# Copia o restante do projeto
COPY . .

# Builda frontend + backend
RUN pnpm run build


# -------------------------
# STAGE 2 — RUNTIME
# -------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@10

# Copia apenas package.json e lockfile
COPY package.json pnpm-lock.yaml .npmrc ./

# Instala SOMENTE dependências de produção
RUN pnpm install --prod --no-frozen-lockfile

# Copia o dist gerado no estágio de build
COPY --from=builder /app/dist ./dist

# Copia o frontend buildado (vite build fica em client/dist/)
COPY --from=builder /app/client/dist ./client/dist

# FORCE REDEPLOY: 2026-05-04 10:37 BRT (fix ENV NODE_ENV)

# Inicia o servidor
CMD ["node", "dist/index.js"]
# Rebuild: Mon May  4 16:25:27 -03 2026
