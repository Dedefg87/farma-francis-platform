import { Router } from "express";
import { getSession } from "./db";
import { sseManager, type SseEvent } from "./_core/sse";
import { db } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./_core/env";

export default function createSSERouter(): Router {
  const router = Router();

  // Middleware de autenticação SSE (suporta tanto JWT quanto cookies)
  const sseAuth = async (req: unknown, res: unknown, next: () => void) => {
    try {
      let userId: number | null = null;

      // Primeiro tentar JWT token do header Authorization
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7); // Remove "Bearer "

        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        } catch (jwtError) {
          console.log("[SSE Auth] JWT token invalid, trying cookies");
        }
      }

      // Se não conseguiu com JWT, tentar cookie de sessão
      if (!userId) {
        const sessionId = req.cookies?.session;
        if (sessionId) {
          try {
            const session = await getSession(sessionId);
            if (session?.userId) {
              userId = session.userId;
            }
          } catch (sessionError) {
            console.log("[SSE Auth] Session invalid, trying localStorage token");
          }
        }
      }

      // Se ainda não conseguiu, tentar token do localStorage (via cookie especial)
      if (!userId) {
        const tokenCookie = req.cookies?.authToken;
        if (tokenCookie) {
          try {
            const decoded = jwt.verify(tokenCookie, JWT_SECRET) as any;
            userId = decoded.id;
          } catch (tokenError) {
            console.log("[SSE Auth] Auth token cookie invalid");
          }
        }
      }

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Buscar user para ter certeza que existe
      const userRows = await db.select().from(users).where(eq(users.id, userId));
      const user = userRows[0];
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      // Anexar userId ao request
      (req as any).userId = user.id;
      (req as any).user = user;
      next();
    } catch (error) {
      console.error("[SSE Auth] Error:", error);
      res.status(500).json({ error: "Authentication error" });
    }
  };

  router.get("/", sseAuth, (req: unknown, res: unknown) => {
    const userId = req.userId;

    // Set headers for SSE — CRITICAL for Railway (Fastly HTTP/2 CDN)
    // X-Accel-Buffering: no prevents proxy buffering (nginx/Fastly)
    // Connection: keep-alive + Transfer-Encoding ensures streaming works
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    // Flush headers immediately — don't let the proxy buffer them
    res.flushHeaders();

    console.log(`[SSE] Client connected for userId=${userId}`);

    // Registrar cliente no sseManager
    sseManager.addClient(String(userId), res);

    // Send initial message
    res.write(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`);

    // Heartbeat a cada 15 segundos para manter conexão viva
    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 15000);

    // Cleanup on disconnect
    req.on("close", () => {
      console.log(`[SSE] Client disconnected userId=${userId}`);
      clearInterval(heartbeat);
      // sseManager.removeClient é feito pelo event listener no addClient
    });

    req.on("error", (err: unknown) => {
      console.error(`[SSE] Error for userId=${userId}:`, err);
      clearInterval(heartbeat);
    });
  });

  return router;
}
