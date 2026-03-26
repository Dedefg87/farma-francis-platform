import { Request, Response } from "express";
import { Database } from "drizzle-orm/mysql2";

export interface Context {
  req: Request;
  res: Response;
  db: Database;
  user?: { id: number; role: string };
}

export function createContext({ req, res }: { req: Request; res: Response }): Context {
  const db = (globalThis as any).__DB__;
  if (!db) {
    throw new Error("Database not initialized");
  }
  const authHeader = req.headers.authorization || "";
  const user = authHeader ? { id: 1, role: "admin" as const } : undefined;
  return { req, res, db, user };
}
