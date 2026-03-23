import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

/**
 * POST /api/admin/execute-sql
 * Executa SQL raw no banco (APENAS PARA MANUTENÇÃO)
 */
router.post("/", async (req, res) => {
  const db = await getDbRaw();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  const { sql } = req.body;
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ success: false, error: "Campo 'sql' é obrigatório" });
  }

  try {
    // Usar execute (mais confiável para DDL e múltiplos statements)
    const result: any = await db.execute(sql);
    
    const response: any = { success: true, message: "SQL executado com sucesso" };
    
    if (Array.isArray(result)) {
      response.results = result.map((r: any) => ({
        rows: r[0] || [],
        affectedRows: r.affectedRows || 0,
        insertId: r.insertId || null,
        fieldCount: r.fieldCount || 0
      }));
    } else {
      response.rows = result.rows || [];
      response.affectedRows = result.affectedRows || 0;
      response.insertId = result.insertId || null;
      response.fieldCount = result.fieldCount || 0;
    }
    
    res.json(response);
  } catch (err: any) {
    console.error("[ExecuteSQL] Erro:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
