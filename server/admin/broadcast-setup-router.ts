import { Router } from "express";
import { getDb } from "../db";

const router = Router();

/**
 * POST /api/admin/setup-broadcast-tables
 * Cria as tabelas broadcast_lists e broadcast_list_members se não existirem
 * APENAS PARA MANUTENÇÃO - requer environment variable ADMIN_SETUP_SECRET
 */
router.post("/", async (req, res) => {
  // Verificar secret de segurança
  const secret = process.env.ADMIN_SETUP_SECRET;
  const providedSecret = req.headers["x-setup-secret"];
  if (secret && providedSecret !== secret) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  const sql = `
    CREATE TABLE IF NOT EXISTS broadcast_lists (
      id int AUTO_INCREMENT PRIMARY KEY,
      name varchar(255) NOT NULL,
      description text,
      created_by int NOT NULL,
      last_sent_at timestamp NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS broadcast_list_members (
      id int AUTO_INCREMENT PRIMARY KEY,
      list_id int NOT NULL,
      customer_id int NOT NULL,
      added_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(list_id, customer_id)
    ) ENGINE=InnoDB;
  `;

  try {
    await db.execute(sql);
    // Adicional: verificar estrutura das tabelas
    const [cols] = await db.execute("DESCRIBE broadcast_lists");
    const [cols2] = await db.execute("DESCRIBE broadcast_list_members");
    res.json({
      success: true,
      message: "Tabelas broadcast criadas/verificadas com sucesso",
      broadcast_lists_columns: cols,
      broadcast_list_members_columns: cols2
    });
  } catch (error: any) {
    console.error("[broadcast-setup] Error:", {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code,
      errno: error.errno,
      sql: sql.substring(0, 500)
    });
    res.status(500).json({
      success: false,
      error: error.message || "Erro ao criar tabelas broadcast",
      details: error.sqlMessage || ""
    });
  }
});

export default router;
