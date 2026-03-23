import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

router.get("/debug-phone-test", async (req, res) => {
  const db = await getDbRaw();
  if (!db) return res.status(500).json({ error: "DB unavailable" });

  try {
    // Teste direto da query de phoneVariations
    const [rows] = await db.raw(`
      SELECT 
        last8,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT phone ORDER BY phone SEPARATOR ' | ') as phones,
        GROUP_CONCAT(DISTINCT id) as ids
      FROM (
        SELECT 
          id,
          phone,
          SUBSTRING(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''),
            -8
          ) as last8
        FROM customers
        WHERE phone IS NOT NULL
      ) AS normalized
      GROUP BY last8
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Também pegar amostra de customers com IDs específicos mencionados
    const [sample] = await db.raw(`
      SELECT id, name, phone FROM customers WHERE id IN (2,3,4) OR phone LIKE '55%' LIMIT 10
    `);
    
    res.json({
      success: true,
      phoneVariations: rows,
      sampleCustomers: sample,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
