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

    console.log('[AuthDebug] Path:', opts.req.path, '| Cookie present:', !!sessionCookie);

    if (sessionCookie) {
      try {
        // Verificar JWT local
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        console.log('[AuthDebug] JWT secret length:', secret.length);
        const { payload } = await jwtVerify(sessionCookie, secret, {
          algorithms: ["HS256"],
        });

        console.log('[AuthDebug] JWT payload:', payload);

        const openId = payload.openId as string;
        if (openId) {
          const foundUser = await db.getUserByOpenId(openId);
          console.log('[AuthDebug] User lookup result:', foundUser ? 'FOUND' : 'NOT FOUND', '| openId:', openId);
          if (foundUser) {
            user = foundUser;
            console.log('[AuthDebug] Usuário autenticado via JWT local:', user.email, '| id:', user.id);
          }
        } else {
          console.log('[AuthDebug] JWT payload has no openId');
        }
      } catch (jwtError: any) {
        console.log('[AuthDebug] JWT local inválido:', jwtError.message);
      }
    } else {
      console.log('[AuthDebug] No session cookie found, will try OAuth fallback');
    }

    // Se não conseguiu com JWT local, tentar OAuth
    if (!user) {
      console.log('[AuthDebug] Falling back to OAuth SDK...');
      user = await sdk.authenticateRequest(opts.req);
      console.log('[AuthDebug] OAuth result:', user ? 'SUCCESS' : 'FAILED');
    }
  } catch (error: any) {
    // Authentication is optional for public procedures.
    console.log('[AuthDebug] Context creation error:', error.message);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
