import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import * as db from "../db";

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
    // Tentar autenticação local primeiro
    const cookies = parseCookieHeader(opts.req.headers.cookie || '');
    const sessionCookie = cookies[COOKIE_NAME];
    
    if (sessionCookie) {
      try {
        // Verificar JWT local
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const { payload } = await jwtVerify(sessionCookie, secret, {
          algorithms: ["HS256"],
        });
        
        const openId = payload.openId as string;
        if (openId) {
          const foundUser = await db.getUserByOpenId(openId);
          if (foundUser) {
            user = foundUser;
            console.log('[Auth] Usuário autenticado via JWT local:', user.email);
          }
        }
      } catch (jwtError) {
        const err = jwtError as any;
        console.log('[Auth] JWT ERRO:', err?.message ?? String(err));
        console.log('[Auth] cookieSecret length:', (process.env.JWT_SECRET ?? '').length);
        console.log('[Auth] cookie preview:', sessionCookie?.substring(0, 30));
      }
    }
    
    // Se não conseguiu com JWT local, tentar OAuth
    if (!user) {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
