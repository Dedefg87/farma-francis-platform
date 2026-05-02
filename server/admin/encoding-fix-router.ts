import { Router, Request, Response } from "express";
import { getDbRaw } from "../db";
import { sdk } from "../_core/sdk";

const router = Router();

/**
 * POST /api/admin/fix-encoding
 * Converte o banco e todas as tabelas para utf8mb4
 * ATENÇÃO: Execute apenas uma vez, durante baixo tráfego
 * Requer autenticação e permissão de administrador
 */
router.post("/", async (req: Request, res: Response) => {
  // Authenticate using SDK (same as tRPC context)
  const user = await sdk.authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Não autorizado" });
  }

  // Only admins can run this
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ success: false, error: "Acesso negado" });
  }

  const db = await getDbRaw();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    // 1. Obter nome do banco atual
    const [dbRows] = await db.execute("SELECT DATABASE() as dbName");
    const dbName = (dbRows as any[])[0]?.dbName;
    if (!dbName) {
      throw new Error("Could not determine database name");
    }

    console.log(`[EncodingFix] Converting database: ${dbName}`);

    // 2. Alterar charset do banco
    await db.execute(
      `ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[EncodingFix] Database charset updated`);

    // 3. Buscar todas as tabelas
    const [tableRows] = await db.execute(
      "SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [dbName]
    );
    const tables = tableRows as any[];

    let convertedCount = 0;
    let skippedCount = 0;

    // 4. Converter cada tabela que não estiver em utf8mb4
    for (const row of tables) {
      const tableName = row.TABLE_NAME;
      const collation = row.TABLE_COLLATION || "";

      if (!collation.startsWith("utf8mb4")) {
        await db.execute(
          `ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        convertedCount++;
        console.log(`[EncodingFix] Converted table: ${tableName}`);
      } else {
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: `Encoding fix completed`,
      database: dbName,
      convertedTables: convertedCount,
      alreadyUtf8mb4: skippedCount,
      totalTables: tables.length,
    });
  } catch (err: unknown) {
    console.error("[EncodingFix] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
