import { Router } from "express";
import { getSession } from "./db";
import { sseManager, type SseEvent } from "./_core/sse";
import { db } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export default function createSSERouter(): Router {
  const router = Router();

  // Middleware de autenticação SSE (JWT token do header Authorization)
  const sseAuth = async (req: any, res: any, next: () => void) => {
    try {
      // Tentar obter JWT token do header Authorization
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const token = authHeader.slice(7); // Remove "Bearer "
      const jwt = require("jsonwebtoken");
      const { JWT_SECRET } = require("./_core/env");

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.id;

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
      } catch (jwtError) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
    } catch (error) {
      console.error("[SSE Auth] Error:", error);
      res.status(500).json({ error: "Authentication error" });
    }
  };

  router.get("/events", sseAuth, (req: any, res: any) => {
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
