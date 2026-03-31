import { Router } from "express";
import { getDb } from "../../db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ status: "error", message: "Database unavailable" });
    }
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: "error", message: String(error) });
  }
});

export default router;
