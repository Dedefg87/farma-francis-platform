// System Monitoring Endpoints (PostgreSQL)
import express from "express";

export const systemRouter = express.Router();

// GET /api/system/storage
systemRouter.get("/storage", async (req, res) => {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync("df -h /");
    const lines = stdout.trim().split("\n");
    const diskInfo = lines.slice(1).map(line => {
      const [filesystem, size, used, available, usePct, mounted] = line.split(/\s+/);
      return { filesystem, size, used, available, usePct, mounted };
    })[0] || {};
    const appPath = process.cwd();
    const { stdout: duStdout } = await execAsync(`du -sh ${appPath}`);
    const appSize = duStdout.trim().split("\t")[0];
    res.json({ success: true, disk: diskInfo, appSize, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/system/database/size
systemRouter.get("/database/size", async (req, res) => {
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const result = await client.query(
        `SELECT ROUND(SUM(pg_total_relation_size(quote_ident(table_name)) / 1024.0 / 1024.0), 2) as size_mb FROM information_schema.tables WHERE table_schema = 'public'`
      );
      res.json({ success: true, size_mb: Number(result.rows[0]?.size_mb || 0), timestamp: new Date().toISOString() });
    } finally {
      await client.end();
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/system/database/tables
systemRouter.get("/database/tables", async (req, res) => {
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const query = `
        SELECT 
          table_name,
          ROUND(pg_total_relation_size(quote_ident(table_name)) / 1024.0 / 1024.0, 2) as size_mb,
          (SELECT COUNT(*) FROM "${table_name}") as table_rows
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
      `;
      const result = await client.query(query);
      const tables = result.rows.map((row) => ({
        table_name: row.table_name,
        size_mb: Number(row.size_mb),
        table_rows: Number(row.table_rows)
      }));
      res.json({ success: true, tables, timestamp: new Date().toISOString() });
    } finally {
      await client.end();
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean
systemRouter.post("/clean", async (req, res) => {
  try {
    const { types } = req.body;
    const results = [];
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      // Logs
      if (!types || types.includes('logs')) {
        const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 30);
        const logTables = ['system_logs', 'audit_logs', 'crm_audit_logs', 'workflow_executions', 'execution_data'];
        let totalDeleted = 0, tablesFound = 0;
        for (const tableName of logTables) {
          try {
            const columnCheck = await client.query(
              `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = 'created_at'`
            );
            if (columnCheck.rows.length > 0) {
              tablesFound++;
              const result = await client.query(`DELETE FROM "${tableName}" WHERE created_at < $1`, [cutoffDate]);
              totalDeleted += result.rowCount;
            }
          } catch (e) {
            if (!e.message.includes('does not exist')) console.log(`[System/Clean] Erro ${tableName}: ${e.message}`);
          }
        }
        results.push({ type: 'logs', deleted: totalDeleted, message: `Removidos ${totalDeleted} logs de ${tablesFound} tabela${tablesFound !== 1 ? 's' : ''}` });
      }

      // Sessões
      if (!types || types.includes('sessions')) {
        try {
          const [tablesCheck] = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'sessions'");
          if (tablesCheck.rows.length > 0) {
            const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 7);
            const result = await client.query('DELETE FROM sessions WHERE expires_at < $1', [cutoffDate]);
            results.push({ type: 'sessions', deleted: result.rowCount, message: `Removidas ${result.rowCount} sessões` });
          } else {
            results.push({ type: 'sessions', deleted: 0, message: 'Tabela de sessões não encontrada' });
          }
        } catch (e) {
          results.push({ type: 'sessions', deleted: 0, message: `Erro: ${e.message}` });
        }
      }
    } finally {
      await client.end();
    }
    res.json({ success: true, results, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-messages - Limpa mensagens antigas (cuidado!)
systemRouter.post("/clean-messages", async (req, res) => {
  try {
    const { days = 90, dryRun = false } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      // 1. Contar quantas mensagens serão afetadas
      const countQuery = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT conversation_id) as affected_conversations,
          SUM(CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END) as with_media
        FROM conversation_messages 
        WHERE created_at < $1
      `;
      const countResult = await client.query(countQuery, [cutoffDate]);
      const stats = countResult.rows[0];

      if (dryRun) {
        return res.json({
          success: true,
          dryRun: true,
          stats: {
            messages: Number(stats.total_messages),
            conversations: Number(stats.affected_conversations),
            withMedia: Number(stats.with_media),
            cutoffDate: cutoffDate.toISOString(),
          },
          message: `Simulação: ${stats.total_messages} mensagens em ${stats.affected_conversations} conversas seriam deletadas`
        });
      }

      // 2. Deletar mensagens antigas
      const deleteResult = await client.query(
        'DELETE FROM conversation_messages WHERE created_at < $1 RETURNING id',
        [cutoffDate]
      );

      const deletedCount = deleteResult.rowCount;

      res.json({
        success: true,
        stats: {
          messages: Number(deletedCount),
          conversations: Number(stats.affected_conversations),
          withMedia: Number(stats.with_media),
          cutoffDate: cutoffDate.toISOString(),
        },
        message: `Removidas ${deletedCount} mensagens antigas`
      });
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error("[System/CleanMessages] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-database
systemRouter.post("/clean-database", async (req, res) => {
  res.status(501).json({ error: "Limpeza completa do banco não disponível para PostgreSQL. Use ferramentas de backup/restore." });
});

export default systemRouter;
