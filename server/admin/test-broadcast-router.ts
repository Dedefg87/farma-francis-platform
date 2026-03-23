import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

router.get("/test-broadcast-tables", async (req, res) => {
  const db = await getDbRaw();
  if (!db) return res.status(500).json({ error: "DB unavailable" });

  try {
    // Verificar se as tabelas de broadcast existem
    const [rows] = await db.raw("SHOW TABLES LIKE 'broadcast_%'");
    // rows é um array de objetos, extrair o nome da tabela
    const broadcastTables = rows.map((row: any) => {
      const tableName = Object.values(row)[0];
      return tableName;
    });

    // Contar registros em cada tabela se existir
    const counts = {};
    for (const table of broadcastTables) {
      try {
        const [countRows] = await db.raw(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        counts[table] = countRows[0].cnt;
      } catch (e) {
        counts[table] = `error: ${e.message}`;
      }
    }

    res.json({
      success: true,
      broadcastTables,
      counts,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
