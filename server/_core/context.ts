import { Request, Response } from "express";
import { Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { schema } from "../drizzle/schema";
import { drizzle } from "drizzle-orm/mysql2";

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB,
      });
      return drizzle({ client: connection as any, schema });
    })();
  }
  return dbPromise;
}

export interface Context {
  req: Request;
  res: Response;
  db: Database;
  user?: { id: number; role: string };
}

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  const db = await getDb();
  const authHeader = req.headers.authorization || "";
  const user = authHeader ? { id: 1, role: "admin" as const } : undefined;
  return { req, res, db, user };
}
