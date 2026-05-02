import { Router } from "express";
import { getDbRaw } from "../db";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const router = Router();

/**
 * POST /api/admin/run-migrations
 * Executa todas as migrações Drizzle SQL (arquivos .sql em drizzle/ e server/database/broadcast-migrations/)
 * USO DE EMERGÊNCIA - apenas quando o banco está vazio
 * 
 * v2 - Suporta migrações de broadcast em pasta separada
 */
router.post("/run-migrations", async (req, res) => {
  const dbRaw = await getDbRaw();
  if (!dbRaw) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    // Determinar caminhos dos diretórios de migração
    const drizzleDir = join(process.cwd(), "drizzle");
    const broadcastDir = join(process.cwd(), "server/database/broadcast-migrations");
    
    // Ler todos os arquivos .sql e ordenar, mantendo origem
    const drizzleFiles = (await readdir(drizzleDir).catch(() => [])).map(f => ({ file: f, dir: drizzleDir }));
    const broadcastFiles = (await readdir(broadcastDir).catch(() => [])).map(f => ({ file: f, dir: broadcastDir }));
    
    const sqlFiles = [
      ...drizzleFiles.filter(f => f.file.endsWith(".sql") && /^\d+_/.test(f.file)),
      ...broadcastFiles.filter(f => f.file.endsWith(".sql") && /^\d+_/.test(f.file))
    ].sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));

    console.log(`[Migration] Executando ${sqlFiles.length} arquivos SQL...`);

    const results: { file: string; statements: number; success: boolean; error?: string }[] = [];
    
    for (const item of sqlFiles) {
      const filePath = join(item.dir, item.file);
      const content = await readFile(filePath, "utf-8");
      
      // Dividir por statement-breakpoint
      const statements = content.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s);
      
      let fileSuccess = true;
      for (const stmt of statements) {
        if (!stmt) continue;
        try {
          await dbRaw.execute(stmt);
        } catch (err: unknown) {
          // Se for erro de tabela já existe, ignorar (idempotente)
          if (err.message.includes("already exists") || err.message.includes("Duplicate")) {
            console.log(`[Migration] Tabela/coluna já existe: ${item.file}`);
          } else {
            fileSuccess = false;
            console.error(`[Migration] Erro em ${item.file}:`, err.message);
            results.push({ file: item.file, statements: statements.length, success: false, error: err.message });
            break;
          }
        }
      }
      
      if (fileSuccess) {
        results.push({ file: item.file, statements: statements.length, success: true });
      }
    }

    const totalSuccess = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    res.json({
      success: totalFailed === 0,
      message: `Migrações concluídas: ${totalSuccess} sucesso, ${totalFailed} falha`,
      totalFiles: sqlFiles.length,
      results,
    });
  } catch (err: unknown) {
    console.error("[Migration] Erro crítico:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
// Build timestamp: 2026-03-16T19:56:08-03:00
