import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

/**
 * POST /api/admin/execute-sql
 * Executa SQL raw no banco (APENAS PARA MANUTENÇÃO)
 */
router.post("/execute-sql", async (req, res) => {
  const db = await getDbRaw();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  const { sql } = req.body;
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ success: false, error: "Campo 'sql' é obrigatório" });
  }

  try {
    // Detecta se há múltiplos statements separados por ;;
    const hasMultiple = (sql.match(/;;+/g) || []).length > 0;
    const result: any = await db.raw(sql, [], { multipleStatements: hasMultiple });
    
    let response: any = { success: true, message: "SQL executado com sucesso" };
    
    if (Array.isArray(result)) {
      response.results = result.map((r: any) => ({
        affectedRows: r.affectedRows,
        insertId: r.insertId
      }));
    } else {
      response.affectedRows = result?.affectedRows || 0;
      response.insertId = result?.insertId || null;
    }
    
    res.json(response);
  } catch (err: any) {
    console.error("[ExecuteSQL] Erro:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
