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

  // Extrair token do header Authorization
  if (req) {
    try {
      // Tentar como Request do Fetch API
      let authHeader: string | null = null;
      
      if (req.headers && typeof req.headers.get === "function") {
        // É um objeto Headers do Fetch API
        authHeader = req.headers.get("authorization");
      } else if (req.headers && typeof req.headers === "object") {
        // É um objeto simples com headers
        authHeader = req.headers.authorization || req.headers["authorization"];
      }

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7); // Remove "Bearer "
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
