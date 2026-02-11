import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { users } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
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
    // Update
    await db
      .update(users)
      .set({
        ...(userData.name !== undefined && { name: userData.name }),
        ...(userData.email !== undefined && { email: userData.email }),
        ...(userData.loginMethod !== undefined && {
          loginMethod: userData.loginMethod,
        }),
        ...(userData.lastSignedIn !== undefined && {
          lastSignedIn: userData.lastSignedIn,
        }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    return await getUserByOpenId(userData.openId);
  } else {
    // Insert
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

  const mysql = (db as any).$client;

  return {
    raw: (sql: string, values?: any[]) => mysql.execute(sql, values),
    ...db,
  };
}
