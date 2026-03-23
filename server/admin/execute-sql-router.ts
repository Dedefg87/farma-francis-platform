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
    // Usar execute que retorna [rows, fields] para SELECT
    const result = await db.execute(sql);
    
    res.json({
      success: true,
      message: "SQL executado com sucesso",
      result // retorna完整 para debug
    });
  } catch (err: any) {
    console.error("[ExecuteSQL] Erro:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
