import { Request, Response, Router } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/admin/check-db
router.get("/check-db", async (req, res) => {
  const { getDbRaw } = await import("../db");
  const dbRaw = await getDbRaw();

  const dbUrl = process.env.DATABASE_URL || "NÃO DEFINIDA";
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@");

  if (!dbRaw) return res.status(500).json({ error: "Database not available", dbUrl: maskedUrl });
  try {
    const [countResult] = await dbRaw.execute("SELECT COUNT(*) as total FROM customers");
    const total = countResult?.[0]?.total || 0;

    const [tablesResult] = await dbRaw.execute("SHOW TABLES");
    const tables = tablesResult?.map((row: any) => Object.values(row)[0]) || [];

    const broadcastTables = tables.filter((t: string) => t.includes("broadcast"));

    const [sampleCustomers] = await dbRaw.execute("SELECT id, name, phone FROM customers LIMIT 5");

    res.json({
      success: true,
      totalCustomers: Number(total),
      tables,
      broadcastTables,
      sampleCustomers,
      dbUrl: maskedUrl,
      dbType: "mysql2-raw",
    });
  } catch (err: any) {
    console.error("[check-db] Erro:", err);
    res.status(500).json({ error: err.message, dbUrl: maskedUrl });
  }
});

// POST /api/admin/merge-duplicate-customers (stub)
router.post("/merge-duplicate-customers", async (req, res) => {
  res.json({ message: "Not implemented in new router yet" });
});

export default router;
