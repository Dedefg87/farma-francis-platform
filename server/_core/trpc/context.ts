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
  req?: Request;
  user?: User;
};

export async function createContext(
  opts?: FetchCreateContextFnOptions
): Promise<Context> {
  const req = opts?.req;
  let user: User | undefined = undefined;

  // Extrair token do header Authorization
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7); // Remove "Bearer "
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as User;
        user = decoded;
      } catch (error) {
        // Token inválido ou expirado
        user = undefined;
      }
    }
  }

  return {
    req,
    user,
  };
}
