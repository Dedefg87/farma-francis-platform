import { Router } from "express";
import { getDb } from "../../db";
import { checkRedisHealth } from "./redis";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const redisHealth = await checkRedisHealth();
    
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: db ? "connected" : "unavailable",
      redis: redisHealth,
    };

    // Se algo estiver errado, retorna 503
    if (!db || redisHealth?.status === 'error') {
      return res.status(503).json({
        ...health,
        status: "error"
      });
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({ status: "error", message: String(error) });
  }
});

export default router;
