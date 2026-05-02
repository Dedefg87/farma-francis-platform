import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

router.get("/broadcast-tables-exist", async (req, res) => {
  const db = await getDbRaw();
  if (!db) return res.status(500).json({ error: "DB unavailable" });

  try {
    const [rows] = await db.raw("SHOW TABLES LIKE 'broadcast_%'");
    const tables = rows.map((r: unknown) => Object.values(r)[0]);
    res.json({ success: true, broadcastTables: tables, count: tables.length });
  } catch (err: unknown) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
