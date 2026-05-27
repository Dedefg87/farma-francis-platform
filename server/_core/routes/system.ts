import express from "express";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";
import type { Pool } from "mysql2/promise";

export const systemRouter = express.Router();

// GET /api/system/storage (unchanged - uses shell commands)
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

// GET /api/system/database/size (MySQL version)
systemRouter.get("/database/size", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    // MySQL: total size from information_schema
    const result = await db.execute(sql`
      SELECT
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `);

    const rows = (result as any).rows || result || [];
    const size_mb = Number(rows[0]?.size_mb || 0);

    res.json({ success: true, size_mb, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Size] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/system/database/tables (MySQL version)
systemRouter.get("/database/tables", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const result = await db.execute(sql`
      SELECT
        table_name,
        ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb,
        table_rows
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name NOT LIKE '\\_%'
        AND table_name NOT IN ('schema_migrations', 'migrations', '_migrations_applied')
      ORDER BY (data_length + index_length) DESC
    `);

    const rows = (result as any).rows || result || [];
    const tables = rows.map((row: unknown) => ({
      table_name: row.table_name,
      size_mb: Number(row.size_mb || 0),
      table_rows: Number(row.table_rows || 0),
    }));

    res.json({ success: true, tables, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Tables] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Helper: check if table exists
async function tableExists(db: unknown, tableName: string): Promise<boolean> {
  try {
    const r = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ${tableName}
    `);
    const rows = (r as any).rows || r || [];
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Helper: count rows in table
async function countRows(db: unknown, tableName: string): Promise<number> {
  try {
    const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM ${tableName}`);
    const rows = (r as any).rows || r || [];
    return Number(rows[0]?.cnt || 0);
  } catch {
    return 0;
  }
}

// Helper: delete old rows from table
async function deleteOld(db: unknown, tableName: string, cutoff: Date): Promise<number> {
  try {
    const r = await db.execute(sql`DELETE FROM ${tableName} WHERE created_at < ${cutoff}`);
    return (r as any).affectedRows || 0;
  } catch (error: unknown) {
    // Se tabela não tem created_at, ignorar
    if (error.message?.includes('Unknown column')) {
      return 0;
    }
    throw error;
  }
}

// POST /api/system/clean (MySQL version - cleans logs and sessions)
systemRouter.post("/clean", async (req, res) => {
  try {
    const { types } = req.body;
    const results: unknown[] = [];
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    // Clean logs (older than 30 days)
    if (!types || types.includes('logs')) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const logTables = ['system_logs', 'audit_logs', 'crm_audit_logs', 'workflow_executions', 'execution_data'];
      let totalDeleted = 0, tablesFound = 0;

      for (const tableName of logTables) {
        try {
          if (await tableExists(db, tableName)) {
            // Check if table has created_at column
            const deleted = await deleteOld(db, tableName, cutoffDate);
            tablesFound++;
            totalDeleted += deleted;
          }
        } catch (e: unknown) {
          if (!e.message?.includes('does not exist')) {
            console.log(`[System/Clean] Erro ${tableName}: ${e.message}`);
          }
        }
      }
      results.push({
        type: 'logs',
        deleted: totalDeleted,
        message: `Removidos ${totalDeleted} logs de ${tablesFound} tabela${tablesFound !== 1 ? 's' : ''}`
      });
    }

    // Clean sessions (older than 7 days)
    if (!types || types.includes('sessions')) {
      const exists = await tableExists(db, 'sessions');
      if (exists) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        try {
          const deleted = await deleteOld(db, 'sessions', cutoffDate);
          results.push({ type: 'sessions', deleted, message: `Removidas ${deleted} sessões` });
        } catch (e: unknown) {
          // sessions pode ter expires_at em vez de created_at
          try {
            const r = await db.execute(sql`DELETE FROM sessions WHERE expires_at < ${cutoffDate}`);
            const deleted = (r as any).affectedRows || 0;
            results.push({ type: 'sessions', deleted, message: `Removidas ${deleted} sessões` });
          } catch (e2) {
            results.push({ type: 'sessions', deleted: 0, message: `Erro: ${e2.message}` });
          }
        }
      } else {
        results.push({ type: 'sessions', deleted: 0, message: 'Tabela de sessões não encontrada' });
      }
    }

    res.json({ success: true, results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Clean] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-messages (MySQL version)
systemRouter.post("/clean-messages", async (req, res) => {
  try {
    const { days = 90, dryRun = false } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    // Count stats
    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT conversation_id) as affected_conversations,
        SUM(CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END) as with_media
      FROM conversation_messages
      WHERE created_at < ${cutoffDate}
    `);
    const statsRows = (statsResult as any).rows || statsResult || [];
    const stats = statsRows[0];

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        stats: {
          messages: Number(stats.total_messages || 0),
          conversations: Number(stats.affected_conversations || 0),
          withMedia: Number(stats.with_media || 0),
          cutoffDate: cutoffDate.toISOString(),
        },
        message: `Simulação: ${stats.total_messages || 0} mensagens em ${stats.affected_conversations || 0} conversas seriam deletadas`
      });
    }

    // Delete messages
    const deleteResult = await db.execute(sql`
      DELETE FROM conversation_messages
      WHERE created_at < ${cutoffDate}
    `);

    const deletedCount = (deleteResult as any).affectedRows || 0;

    res.json({
      success: true,
      stats: {
        messages: Number(deletedCount),
        conversations: Number(stats.affected_conversations || 0),
        withMedia: Number(stats.with_media || 0),
        cutoffDate: cutoffDate.toISOString(),
      },
      message: `Removidas ${deletedCount} mensagens antigas`
    });
  } catch (error) {
    console.error("[System/CleanMessages] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-database (MySQL version - drops multiple tables)
systemRouter.post("/clean-database", async (req, res) => {
  try {
    const { confirm } = req.body;
    if (!confirm) {
      return res.status(400).json({ error: "Confirmação necessária" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    // Tables that can be safely truncated (non-critical data)
    const tables = [
      'conversation_messages',
      'received_messages',
      'system_logs',
      'audit_logs',
      'notifications',
      'sessions',
      'flow_executions',
      'execution_logs',
      'broadcast_messages',
      'quick_replies_cache',
      'webhook_logs',
    ];

    const results: unknown[] = [];

    for (const tableName of tables) {
      try {
        const exists = await tableExists(db, tableName);
        if (exists) {
          const beforeCount = await countRows(db, tableName);

          // Truncate is faster than DELETE for full table clear
          try {
            await db.execute(sql`TRUNCATE TABLE ${tableName}`);
            results.push({
              table: tableName,
              success: true,
              rows: beforeCount,
              message: `Tabela ${tableName}: ${beforeCount} linha${beforeCount !== 1 ? 's' : ''} removida${beforeCount !== 1 ? 's' : ''}`
            });
          } catch (truncateError) {
            // Fallback to DELETE if TRUNCATE fails (e.g., foreign key constraints)
            await db.execute(sql`DELETE FROM ${tableName}`);
            results.push({
              table: tableName,
              success: true,
              rows: beforeCount,
              message: `Tabela ${tableName}: ${beforeCount} linha${beforeCount !== 1 ? 's' : ''} removida${beforeCount !== 1 ? 's' : ''} (via DELETE)`
            });
          }
        } else {
          results.push({ table: tableName, success: false, error: 'Tabela não encontrada' });
        }
      } catch (e: unknown) {
        results.push({ table: tableName, success: false, error: e.message });
      }
    }

    // OPTIMIZE tables to reclaim space (best-effort, non-blocking)
    for (const tableName of tables) {
      try {
        if (await tableExists(db, tableName)) {
          await db.execute(sql`OPTIMIZE TABLE ${tableName}`);
        }
      } catch (optimizeError) {
        // OPTIMIZE can fail on large tables or replicas — ignore
        console.warn(`[System/Optimize] ${tableName}: ${optimizeError.message}`);
      }
    }

    res.json({
      success: true,
      results,
      message: "Limpeza do banco de dados concluída"
    });
  } catch (error) {
    console.error("[System/CleanDatabase] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

systemRouter.post("/close-conversations", async (req, res) => {
  try {
    const db = await getDb();
// POST /api/system/close-conversations - Fecha todas as conversas abertas
systemRouter.post("/close-conversations", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const now = new Date();
    const result = await db.execute(sql`UPDATE conversations SET status = 'closed', closedAt = ${now} WHERE status IN ('open', 'assigned')`);
    res.json({ success: true, closed: (result as any).affectedRows || 0 });
  } catch (error: unknown) {
    res.status(500).json({ error: String(error) });
  }
});
export default systemRouter;
