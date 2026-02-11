import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
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
  
  // Agora temos acesso direto ao MySQL Pool para queries brutas
  const mysql = (db as any).getClient().getClient();
  
  return {
    raw: (sql: string, values?: any[]) => mysql.execute(sql, values),
    ...db
  };
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
  
  // Agora temos acesso direto ao MySQL Pool para queries brutas
  const mysql = (db as any).getClient().getClient();
  
  return {
    raw: (sql: string, values?: any[]) => mysql.execute(sql, values),
    ...db
  };
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
