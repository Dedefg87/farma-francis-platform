import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";

import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import {
  users,
  customers,
  leads,
  tickets,
  visualFlows,
  automationFlows,
  uraMenus,
} from "../drizzle/schema";
import { formatPhoneBR } from "./utils/phone";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let _dbHealthCheck: number = 0;

// Exportações para compatibilidade com routers-sse.ts e outros
export { _db as db }; // Exportar a referência interna como named export 'db'

export async function getDb() {
  // Se temos um DB cacheado, verificar se ainda está saudável (health check a cada 30s)
  if (_db && Date.now() - _dbHealthCheck < 30000) {
    try {
      // Teste rápido
      if (_pool) {
        const connection = await _pool.getConnection();
        await connection.ping();
        connection.release();
        return _db;
      }
    } catch (e) {
      console.log("[Database] Health check failed, recreating pool...", e);
      _db = null;
      _pool = null;
    }
  }

  // Se não temos DB cacheado ou health check falhou, criar novo
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Parse DATABASE_URL: mysql://user:password@host:port/database
      const url = new URL(process.env.DATABASE_URL);
      
      _pool = mysql.createPool({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        port: url.port ? parseInt(url.port) : 3306,
        waitForConnections: true,
        connectionLimit: 50,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        charset: 'utf8mb4',
        timezone: 'Z',
      });

      _db = drizzle(_pool, { mode: "default" });
      _dbHealthCheck = Date.now();
      console.log("[Database] New connection pool created (50 connections)");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }

  return _db;
}

export type DbType = ReturnType<typeof drizzle>;

export async function getDbRaw() {
  const db = await getDb();
  if (!db) {
    console.error("[Database] Database not available");
    return null;
  }
  return db;
}

// USER QUERIES
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const rawResult = await db.execute(
    sql`SELECT * FROM users WHERE openId = ${openId} LIMIT 1`
  );
  const rows = (rawResult as any).rows ?? (rawResult as any)[0] ?? rawResult;
  const rawUser = Array.isArray(rows) ? rows[0] : undefined;
  if (!rawUser) return null;

  return {
    id: rawUser.id,
    openId: rawUser.openId ?? rawUser.open_id,
    name: rawUser.name,
    email: rawUser.email,
    passwordHash: rawUser.passwordHash ?? rawUser.password_hash,
    loginMethod: rawUser.loginMethod ?? rawUser.login_method,
    role: rawUser.role,
    createdAt: rawUser.createdAt ?? rawUser.created_at,
    updatedAt: rawUser.updatedAt ?? rawUser.updated_at,
    lastSignedIn: rawUser.lastSignedIn ?? rawUser.last_signed_in,
  };
}

export async function upsertUser(userData: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserByOpenId(userData.openId);

  if (existing) {
    await db
      .update(users)
      .set({
        ...(userData.name !== undefined && { name: userData.name }),
        ...(userData.email !== undefined && { email: userData.email }),
        ...(userData.loginMethod !== undefined && {
          loginMethod: userData.loginMethod,
        }),
        ...(userData.lastSignedIn != null && {
          lastSignedIn: userData.lastSignedIn,
        }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    return await getUserByOpenId(userData.openId);
  } else {
    const result = await db.insert(users).values({
      openId: userData.openId,
      name: userData.name || null,
      email: userData.email || null,
      loginMethod: userData.loginMethod || null,
      lastSignedIn: userData.lastSignedIn || new Date(),
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await getUserByOpenId(userData.openId);
  }
}

// SESSION HELPER para routers-sse.ts
// Retorna { userId: string } ou null
export async function getSession(sessionId: string): Promise<{ userId: string } | null> {
  try {
    const session = await sdk.verifySession(sessionId);
    if (!session) {
      return null;
    }
    // Verificar se usuário existe no banco (opcional, mas sseAuth já faz essa verificação)
    // Aqui retornamos apenas o openId como userId
    return {
      userId: session.openId,
    };
  } catch (error) {
    console.error("[Session] Error verifying session:", error);
    return null;
  }
}
