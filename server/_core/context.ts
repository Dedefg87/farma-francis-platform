import { Request, Response } from "express";
import { Database } from "drizzle-orm/mysql2";

export interface Context {
  req: Request;
  res: Response;
  db: Database;
  user?: { id: number; role: string };
}
