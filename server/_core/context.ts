import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const cookies = parseCookieHeader(opts.req.headers.cookie || '');
    const sessionCookie = cookies[COOKIE_NAME];

    if (sessionCookie) {
      try {
        const session = await sdk.verifySession(sessionCookie);
        if (session?.openId) {
          const foundUser = await sdk.getUserByOpenId(session.openId);
          if (foundUser) {
            user = foundUser;
            console.log('[Auth] Usuário autenticado:', user.email);
          }
        }
      } catch (err: any) {
        console.log('[Auth] verifySession ERRO:', err?.message ?? String(err));
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
