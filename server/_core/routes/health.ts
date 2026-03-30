<<<<<<< HEAD
import { Router } from "express";
=======
import express from "express";
>>>>>>> 239838d55221719296931ff07f7a90abc2564772
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
