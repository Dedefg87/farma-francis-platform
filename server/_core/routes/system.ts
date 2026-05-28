import express, { Request, Response, NextFunction } from "express";
import { getDb } from "../../db";
import jwt from "jsonwebtoken";
import { sql } from "drizzle-orm";

// Middleware to verify admin authentication
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autenticação requerido" });
    }

    const token = authHeader.substring(7).trim();
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      return res.status(500).json({ error: "Configuração inválida: JWT_SECRET" });
    }

    try {
      const decoded = jwt.verify(token, secret) as { role?: string };
      if (decoded.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado: requer permissão de admin" });
      }
      next();
    } catch {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
  } catch {
    return res.status(401).json({ error: "Erro de autenticação" });
  }
}

const systemRouter = express.Router();

// Helper: normalize rows from MySQL2 raw mode (can be array of arrays or array of objects)
function normalizeRows(rawResult: unknown): any[] {
  // Drizzle raw mode returns { rows: [...] } or [[rows], fields]
  let rows = rawResult;
  if (rawResult && typeof rawResult === 'object') {
    if ('rows' in rawResult) {
      rows = (rawResult as any).rows;
    } else if (Array.isArray(rawResult) && Array.isArray((rawResult as any)[0])) {
      rows = (rawResult as any)[0]; // [[rows], fields] format
    }
  }
  return Array.isArray(rows) ? rows : [];
}

// Helper: normalize a single row (array or object format)
function normalizeRow(row: any): any {
  if (Array.isArray(row)) {
    // MySQL2 raw format: [table_name, size_mb, table_rows]
    return {
      table_name: row[0],
      size_mb: row[1],
      table_rows: row[2],
    };
  }
  return row;
}

// GET /api/system/storage (public - uses shell commands)
systemRouter.get("/storage", async (req, res) => {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync("df -h /");
    const lines = stdout.trim().split("\\n");
    const diskInfo = lines.slice(1).map(line => {
      const [filesystem, size, used, available, usePct, mounted] = line.split(/\\s+/);
      return { filesystem, size, used, available, usePct, mounted };
    })[0] || {};
    const appPath = process.cwd();
    const { stdout: duStdout } = await execAsync(`du -sh ${appPath}`);
    const appSize = duStdout.trim().split("\\t")[0];
    res.json({ success: true, disk: diskInfo, appSize, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/system/database/size (requires admin)
systemRouter.get("/database/size", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const rawResult = await db.execute(
      sql`SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const rows = normalizeRows(rawResult);
    const size_mb = Number(normalizeRow(rows[0])?.size_mb || 0);

    res.json({ success: true, size_mb, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Size] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/system/database/tables (requires admin)
systemRouter.get("/database/tables", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const rawResult = await db.execute(
      sql`SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb, table_rows FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name NOT LIKE '\\_%' AND table_name NOT IN ('schema_migrations', 'migrations', '_migrations_applied') ORDER BY (data_length + index_length) DESC`
    );
    
    const rows = normalizeRows(rawResult);
    const tables = rows.map((row: any) => {
      const normalized = normalizeRow(row);
      return {
        table_name: normalized.table_name || "unknown",
        size_mb: Number(normalized.size_mb || 0),
        table_rows: Number(normalized.table_rows || 0),
      };
    });

    console.log("[System/Tables] Normalized tables count:", tables.length, "first:", tables[0]?.table_name);

    res.json({ success: true, tables, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Tables] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Helper: check if table exists
async function tableExists(db: any, tableName: string): Promise<boolean> {
  try {
    const rawResult = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${tableName}`
    );
    const rows = normalizeRows(rawResult);
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Helper: count rows in table
async function countRows(db: any, tableName: string): Promise<number> {
  try {
    const rawResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM ${sql.identifier(tableName)}`);
    const rows = normalizeRows(rawResult);
    const normalized = normalizeRow(rows[0]);
    return Number(normalized?.cnt || 0);
  } catch {
    return 0;
  }
}

// Helper: delete old rows from table
async function deleteOld(db: any, tableName: string, cutoff: Date): Promise<number> {
  try {
    const result = await db.execute(sql`DELETE FROM ${sql.identifier(tableName)} WHERE created_at < ${sql.raw(cutoff.toISOString().slice(0, 19).replace('T', ' '))}`);
    return (result as any).affectedRows || 0;
  } catch (error: any) {
    if (error.message?.includes('Unknown column') || error.message?.includes('no such column')) {
      return 0;
    }
    throw error;
  }
}

// POST /api/system/clean (requires admin)
systemRouter.post("/clean", requireAdmin, async (req, res) => {
  try {
    const { types } = req.body;
    const results: any[] = [];
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    if (!types || types.includes('logs')) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const logTables = ['system_logs', 'audit_logs', 'crm_audit_logs', 'workflow_executions', 'execution_data'];
      let totalDeleted = 0, tablesFound = 0;

      for (const tableName of logTables) {
        try {
          if (await tableExists(db, tableName)) {
            const deleted = await deleteOld(db, tableName, cutoffDate);
            tablesFound++;
            totalDeleted += deleted;
          }
        } catch (e: any) {
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

    if (!types || types.includes('sessions')) {
      const exists = await tableExists(db, 'sessions');
      if (exists) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        try {
          const deleted = await deleteOld(db, 'sessions', cutoffDate);
          results.push({ type: 'sessions', deleted, message: `Removidas ${deleted} sessões` });
        } catch (e: any) {
          try {
            await db.execute(sql`DELETE FROM sessions WHERE expires_at < ${sql.raw(cutoffDate.toISOString().slice(0, 19).replace('T', ' '))}`);
            results.push({ type: 'sessions', deleted: 0, message: `Removidas sessões (via DELETE)` });
          } catch (e2) {
            results.push({ type: 'sessions', deleted: 0, message: `Erro: ${e2.message}` });
          }
        }
      } else {
        results.push({ type: 'sessions', deleted: 0, message: 'Tabela de sessões não encontrada' });
      }
    }

    res.json({ success: true, results, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("[System/Clean] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-messages (requires admin)
systemRouter.post("/clean-messages", requireAdmin, async (req, res) => {
  try {
    const { days = 90, dryRun = false } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        stats: {
          messages: 0,
          conversations: 0,
          withMedia: 0,
          cutoffDate: cutoffDate.toISOString(),
        },
        message: "Simulação - não autenticado"
      });
    }

    await db.execute(sql`DELETE FROM conversation_messages WHERE created_at < ${sql.raw(cutoffDate.toISOString().slice(0, 19).replace('T', ' '))}`);

    res.json({
      success: true,
      stats: {
        messages: 0,
        conversations: 0,
        withMedia: 0,
        cutoffDate: cutoffDate.toISOString(),
      },
      message: "Mensagens antigas removidas"
    });
  } catch (error: any) {
    console.error("[System/CleanMessages] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-database (REQUIRES ADMIN - MySQL version)
systemRouter.post("/clean-database", requireAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    if (!confirm) {
      return res.status(400).json({ error: "Confirmação necessária" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

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

    const results: any[] = [];

    for (const tableName of tables) {
      try {
        const exists = await tableExists(db, tableName);
        if (exists) {
          const beforeCount = await countRows(db, tableName);
          try {
            await db.execute(sql.raw(`TRUNCATE TABLE ${tableName}`));
            results.push({
              table: tableName,
              success: true,
              rows: beforeCount,
              message: `Tabela ${tableName}: ${beforeCount} linha${beforeCount !== 1 ? 's' : ''} removida${beforeCount !== 1 ? 's' : ''}`
            });
          } catch (truncateError: any) {
            await db.execute(sql.raw(`DELETE FROM ${tableName}`));
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
      } catch (e: any) {
        results.push({ table: tableName, success: false, error: e.message });
      }
    }

    for (const tableName of tables) {
      try {
        if (await tableExists(db, tableName)) {
          await db.execute(sql.raw(`OPTIMIZE TABLE ${tableName}`));
        }
      } catch (optimizeError: any) {
        console.warn(`[System/Optimize] ${tableName}: ${optimizeError.message}`);
      }
    }

    res.json({
      success: true,
      results,
      message: "Limpeza do banco de dados concluída"
    });
  } catch (error: any) {
    console.error("[System/CleanDatabase] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/close-conversations (requires admin)
systemRouter.post("/close-conversations", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const now = new Date();
    await db.execute(sql`UPDATE conversations SET status = 'closed', closed_at = ${sql.raw(now.toISOString().slice(0, 19).replace('T', ' '))} WHERE status IN ('open', 'assigned')`);
    res.json({ success: true, closed: 0 });
  } catch (error: any) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/system/health - health check (public)
systemRouter.get("/health", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ db: "unavailable" });

    await db.execute(sql`SELECT 1 as ok`);
    res.json({
      success: true,
      db: "ok",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default systemRouter;