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
    
    // Se for SELECT, retornar as rows
    if (Array.isArray(result)) {
      // multipleStatements: array de resultados
      response.results = result.map((r: any) => ({
        rows: r[0] || [],
        affectedRows: r.affectedRows,
        insertId: r.insertId,
        fieldCount: r.fieldCount
      }));
    } else if (result.rows) {
      // SELECT single statement
      response.rows = result.rows;
      response.affectedRows = result.affectedRows || 0;
      response.fieldCount = result.fieldCount || 0;
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
