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

export async function createContext(
  opts?: FetchCreateContextFnOptions
): Promise<Context> {
  console.log('[createContext] Called | has req:', !!opts?.req);
  const req = opts?.req;
  let user: User | undefined = undefined;

  if (req) {
    try {
      let token: string | null = null;
      
      // Log RAW headers (Fetch API)
      if (req.headers && typeof req.headers.entries === 'function') {
        const allHeaders = Object.fromEntries(req.headers);
        console.log('[CTX] RAW HEADERS:', allHeaders);
        token = allHeaders['x-jti'] || allHeaders['authorization'] || allHeaders['Authorization'];
      } else if (req.headers && typeof req.headers === 'object') {
        const h = req.headers as Record<string, string>;
        token = h['x-jti'] || h['x-jti'] || h['authorization'] || h['Authorization'];
      }
        
      // Extrair token do Bearer se necessário
      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      
      console.log('[CTX] Token found:', !!token, '| Source:', token ? 'header' : 'none');
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as User;
          user = decoded;
          console.log('[createContext] User set:', user?.username, '| Role:', user?.role);
        } catch (e: unknown) {
          console.log('[createContext] JWT verify failed:', (e as Error).message);
        }
      } else {
        console.log('[CTX] No token found in headers');
      }
    } catch (error) {
      console.log('[createContext] General error:', (error as Error).message);
    }
  }

  console.log('[CTX] FINAL CONTEXT:', { hasUser: !!user });
  return { req, user };
}
