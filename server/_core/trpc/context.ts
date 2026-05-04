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

  // Extrair token do header Authorization ou x-jti (frontend)
  if (req) {
    try {
      let token: string | null = null;
      let headerSource = 'none';
      
      if (req.headers && typeof req.headers.get === "function") {
        // Fetch API Headers object (converte tudo para lowercase)
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
          headerSource = 'Authorization';
        }
        if (!token) {
          token = req.headers.get("x-jti");
          if (token) headerSource = 'x-jti';
        }
      } else if (req.headers && typeof req.headers === "object") {
        // Express-style headers
        const authHeader = req.headers.authorization || req.headers["authorization"];
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
          headerSource = 'Authorization';
        }
        if (!token) {
          token = req.headers["x-jti"] || req.headers["x-jti"];
          if (token) headerSource = 'x-jti';
        }
      }
      
      console.log('[Auth Debug] Token source:', headerSource, '| Token exists:', !!token);
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as User;
          user = decoded;
          console.log('[Auth Debug] Token verified for user:', user?.name, '| Role:', user?.role);
        } catch (error: unknown) {
          console.log('[Auth Debug] Token verification failed:', error.message);
          user = undefined;
        }
      }
    } catch (error) {
      console.log('[Auth Debug] General error:', error.message);
      user = undefined;
    }
  }

  return {
    req,
    user,
  };
}
