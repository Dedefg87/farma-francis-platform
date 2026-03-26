import express from "express";
import { getDb } from "./db";

const router = express.Router();

router.get("/health", async (req, res) => {
  const health: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      redis: "unknown",
    },
  };

  // Test database
  try {
    const db = await getDb();
    if (db) {
      // Simple query
      await db.execute("SELECT 1 as test");
      health.services.database = "ok";
    } else {
      health.services.database = "disconnected";
      health.status = "degraded";
    }
  } catch (err: any) {
    health.services.database = "error";
    health.status = "degraded";
    health.errors = health.errors || [];
    health.errors.push(`Database: ${err.message}`);
  }

  // Test Redis (optional)
  try {
    // Import dynamically to avoid requiring redis when not configured
    const redisEnabled = process.env.REDIS_PUBLIC_URL || process.env.REDIS_URL || process.env.REDISCLOUD_URL;
    if (redisEnabled) {
      const { Redis } = await import("ioredis");
      const redis = new Redis(redisEnabled);
      await redis.ping();
      health.services.redis = "ok";
      await redis.quit();
    } else {
      health.services.redis = "not_configured";
    }
  } catch (err: any) {
    health.services.redis = "error";
    health.status = "degraded";
    health.errors = health.errors || [];
    health.errors.push(`Redis: ${err.message}`);
  }

  const code = health.status === "ok" ? 200 : health.status === "degraded" ? 503 : 500;
  res.status(code).json(health);
});

export default router;
