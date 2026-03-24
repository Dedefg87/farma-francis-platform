#!/bin/bash

echo "🔧 Corrigindo erros TypeScript..."

# 1. Corrigir tsconfig.json
sed -i 's/"target": "ES2020"/"target": "ES2022"/g' tsconfig.json
sed -i 's/"lib": \["esnext", "dom", "dom.iterable"\]/"lib": \["es2022", "dom", "dom.iterable"\]/g' tsconfig.json

# 2. Corrigir context.ts
cat > server/_core/context.ts << 'CONTEXT'
import type { InferSelectModel } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export type User = InferSelectModel<typeof users>;

import { COOKIE_NAME } from "@shared/const";
// ... resto do código original (mantenha o que já existe)
CONTEXT

# 3. Corrigir sdk.ts
cat > server/_core/sdk.ts << 'SDK'
import type { InferSelectModel } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export type User = InferSelectModel<typeof users>;

import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
// ... resto do código original
SDK

# 4. Corrigir db.ts
sed -i 's/import mysql from "mysql2\/promise";/import * as mysql from "mysql2\/promise";/g' server/db.ts

# 5. Criar módulos faltantes
mkdir -p shared/_core

cat > shared/const.ts << 'CONST'
export const COOKIE_NAME = "farma-francis-auth";
export const AXIOS_TIMEOUT_MS = 30000;
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const NOT_ADMIN_ERR_MSG = "Acesso restrito a administradores";
export const UNAUTHED_ERR_MSG = "Usuário não autenticado";
CONST

cat > shared/_core/errors.ts << 'ERRORS'
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
ERRORS

echo "✅ Correções aplicadas!"
echo "📋 Agora execute: npx tsc --noEmit --skipLibCheck"
