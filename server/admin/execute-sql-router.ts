import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

/**
 * POST /api/admin/execute-sql
 * Executa SQL raw no banco (APENAS PARA MANUTENÇÃO)
 * Nota: Usa multipleStatements=true para permitir múltiplos comandos
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
    //Executa com multipleStatements=true para suportar múltiplos comandos
    const [result] = await db.raw(sql, [], { multipleStatements: true });
    res.json({
      success: true,
      affectedRows: result?.affectedRows || 0,
      insertId: result?.insertId || null,
      message: "SQL executado com sucesso"
    });
  } catch (err: any) {
    console.error("[ExecuteSQL] Erro:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
