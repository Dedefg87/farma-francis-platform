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
      
      // Tentar ler headers (Fetch API ou Express)
      if (req.headers) {
        // Fetch API: headers.get()
        if (typeof req.headers.get === 'function') {
          token = req.headers.get('x-jti') || req.headers.get('authorization');
        }
        // Express: req.headers['x-jti']
        else if (typeof req.headers === 'object') {
          const h = req.headers as Record<string, string>;
          token = h['x-jti'] || h['x-jti'] || h['authorization'] || h['Authorization'];
        }
        
        // Extrair token do Bearer se necessário
        if (token && token.startsWith('Bearer ')) {
          token = token.slice(7);
        }
        
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as User;
            user = decoded;
            console.log('[createContext] User set:', user?.username, '| Role:', user?.role);
          } catch (e: unknown) {
            console.log('[createContext] JWT verify failed:', (e as Error).message);
          }
        }
      }
    } catch (error) {
      console.log('[createContext] General error:', (error as Error).message);
    }
  }

  return { req, user };
}
