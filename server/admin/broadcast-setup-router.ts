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
    CREATE TABLE IF NOT EXISTS \`broadcast_lists\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`name\` varchar(255) NOT NULL,
      \`description\` text,
      \`created_by\` int NOT NULL,
      \`last_sent_at\` timestamp NULL DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS \`broadcast_list_members\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`list_id\` int NOT NULL,
      \`customer_id\` int NOT NULL,
      \`added_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      FOREIGN KEY (\`list_id\`) REFERENCES \`broadcast_lists\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE KEY \`broadcast_list_members_list_customer_unique\` (\`list_id\`,\`customer_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
    console.error("[broadcast-setup] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erro ao criar tabelas broadcast"
    });
  }
});

export default router;
