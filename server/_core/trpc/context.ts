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
  const req = opts?.req;
  let user: User | undefined = undefined;

  // Extrair token do header Authorization ou x-jti (frontend)
  if (req) {
    try {
      let token: string | null = null;
      
      // Tentar como Authorization header (Bearer token)
      if (req.headers && typeof req.headers.get === "function") {
        // Fetch API Headers object
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
        }
        // Tentar x-jti header (frontend envia JWT aqui)
        if (!token) {
          token = req.headers.get("x-jti");
        }
      } else if (req.headers && typeof req.headers === "object") {
        // Express-style headers (snake_case or camelCase)
        const authHeader = req.headers.authorization || req.headers["authorization"];
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
        }
        // Tentar x-jti header
        if (!token) {
          token = req.headers["x-jti"] || req.headers["x-jti"];
        }
      }
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as User;
          user = decoded;
        } catch (error) {
          // Token inválido ou expirado
          user = undefined;
        }
      }
    } catch (error) {
      // Ignorar erros de parsing
      user = undefined;
    }
  }

  return {
    req,
    user,
  };
}
