import { Router } from "express";
import { getSession } from "./db";
import { sseManager, type SseEvent } from "./_core/sse";
import { db } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export default function createSSERouter(): Router {
  const router = Router();

  // Middleware de autenticação SSE (baseado em session cookie)
  const sseAuth = async (req: any, res: any, next: () => void) => {
    try {
      // Tentar obter session ID do cookie
      const sessionId = req.cookies?.session;
      if (!sessionId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const session = await getSession(sessionId);
      if (!session?.userId) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }

      // Buscar user para ter certeza que existe
      const userRows = await db.select().from(users).where(eq(users.id, session.userId));
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

  router.get("/", sseAuth, (req: any, res: any) => {
    const userId = req.userId;

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");

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

    req.on("error", (err: any) => {
      console.error(`[SSE] Error for userId=${userId}:`, err);
      clearInterval(heartbeat);
    });
  });

  return router;
}
