import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../env";

export type User = {
  id: string;
  name: string;
  username: string;
  role: string;
};

export type Context = {
  req?: unknown;
  user?: User;
};

const getHeader = (req: any, name: string): string | undefined => {
  if (!req?.headers) return undefined;

  // Fetch API (Headers.get)
  if (typeof req.headers.get === "function") {
    return req.headers.get(name) || req.headers.get(name.toLowerCase());
  }

  // Express / objeto plano (case-insensitive)
  const h = req.headers as Record<string, string>;
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()];
};

export async function createContext(
  opts?: FetchCreateContextFnOptions
): Promise<Context> {
  console.log('[createContext] Called | has req:', !!opts?.req);
  const req = opts?.req;
  let user: User | undefined = undefined;

  if (req) {
    try {
      const tokenRaw =
        getHeader(req, "x-jti") ||
        getHeader(req, "authorization") ||
        getHeader(req, "Authorization");

      const token = tokenRaw?.startsWith("Bearer ")
        ? tokenRaw.slice(7)
        : tokenRaw;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as User;
          user = decoded;
          console.log('[createContext] ✅ Token válido para:', user?.name, '| Role:', user?.role);
        } catch (e) {
          console.log('[createContext] ❌ JWT verification failed:', (e as Error).message);
        }
      } else {
        console.log('[createContext] ⚠️ Nenhum token encontrado');
      }
    } catch (error) {
      console.log('[createContext] General error:', (error as Error).message);
    }
  }

  console.log('[createContext] FINAL CONTEXT:', { hasUser: !!user });
  return { req, user };
}
