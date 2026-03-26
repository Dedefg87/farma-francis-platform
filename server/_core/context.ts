import { Request, Response } from "express";
import { Database } from "drizzle-orm/mysql2";
import { getDb } from "../db";

export interface Context {
  req: Request;
  res: Response;
  db: Database;
  user?: { id: number; role: string };
}

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const authHeader = req.headers.authorization || "";
  const user = authHeader ? { id: 1, role: "admin" as const } : undefined;
  return { req, res, db, user };
}
