import { Router } from "express";
import { getDbRaw } from "../db";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const router = Router();

/**
 * POST /api/admin/run-migrations
 * Executa todas as migrações Drizzle SQL (arquivos .sql em drizzle/)
 * USO DE EMERGÊNCIA - apenas quando o banco está vazio
 */
router.post("/run-migrations", async (req, res) => {
  const dbRaw = await getDbRaw();
  if (!dbRaw) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    // Determinar caminho do diretório drizzle
    const drizzleDir = join(process.cwd(), "drizzle");
    
    // Ler todos os arquivos .sql e ordenar
    const files = await readdir(drizzleDir);
    const sqlFiles = files
      .filter(f => f.endsWith(".sql") && /^\d+_/.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    console.log(`[Migration] Executando ${sqlFiles.length} arquivos SQL...`);

    const results: { file: string; statements: number; success: boolean; error?: string }[] = [];
    
    for (const file of sqlFiles) {
      const filePath = join(drizzleDir, file);
      const content = await readFile(filePath, "utf-8");
      
      // Dividir por statement-breakpoint
      const statements = content.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s);
      
      let fileSuccess = true;
      for (const stmt of statements) {
        if (!stmt) continue;
        try {
          await dbRaw.raw(stmt);
        } catch (err: any) {
          // Se for erro de tabela já existe, ignorar (idempotente)
          if (err.message.includes("already exists") || err.message.includes("Duplicate")) {
            console.log(`[Migration] Tabela/coluna já existe: ${file}`);
          } else {
            fileSuccess = false;
            console.error(`[Migration] Erro em ${file}:`, err.message);
            results.push({ file, statements: statements.length, success: false, error: err.message });
            break;
          }
        }
      }
      
      if (fileSuccess) {
        results.push({ file, statements: statements.length, success: true });
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
  } catch (err: any) {
    console.error("[Migration] Erro crítico:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
// Build timestamp: 2026-03-16T19:56:08-03:00
