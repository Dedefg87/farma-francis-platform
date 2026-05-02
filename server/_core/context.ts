import { Request, Response } from "express";
import { Database } from "drizzle-orm/mysql2";
import jwt from "jsonwebtoken";
import { getDb } from "../db";

export interface Context {
  req: Request;
  res: Response;
  db: Database;
  user?: { id: number; role: string; email: string };
}

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Context] Database not available");
      throw new Error("Database not available");
    }

    const authHeader = req.headers.authorization || "";

    let user: { id: number; role: string; email: string } | undefined;

    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7).trim();

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          console.error("[Context] JWT_SECRET not configured");
          throw new Error("Server configuration error");
        }

        if (token && token !== "undefined" && token !== "null") {
          const decoded = jwt.verify(token, secret) as {
            sub: number;
            email: string;
            role: string;
          };

          user = {
            id: decoded.sub,
            role: decoded.role || "user",
            email: decoded.email,
          };
        } else {

        }
      } catch (error: unknown) {
        console.error("[Context] ❌ Token validation error:", error.message);
      }
    } else {

    }

    return { req, res, db, user };
  } catch (error) {
    console.error("[Context] ❌ createContext error:", error);
    throw error;
  }
}
