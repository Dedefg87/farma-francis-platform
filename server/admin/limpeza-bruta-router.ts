import { Router } from "express";
import { getDb } from "../db";

const router = Router();

/**
 * GET /api/admin/check-db
 * Diagnóstico rápido: verifica quantos clientes existem no banco ativo
 */
router.get("/check-db", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Contar clientes
    const result: any = await (db as any).execute("SELECT COUNT(*) as total FROM customers");
    const total = result.rows?.[0]?.total || 0;

    // Listar algumas tabelas para verificar conexão
    const tablesResult: any = await (db as any).execute("SHOW TABLES");
    const tables = tablesResult.rows?.map((row: any) => Object.values(row)[0]) || [];

    res.json({
      success: true,
      totalCustomers: total,
      database: "connected",
      tables: tables.slice(0, 10), // primeiras 10 tabelas
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[CheckDB] Erro:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Normaliza número para comparação (remove +, espaços, traços)
 * Se for brasileiro (55) com 13 dígitos, remove o 9 após DDD
 */
function normalizeToBaseNumber(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, '');
  if (!digits.startsWith('55')) return digits;
  if (digits.length === 13) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(5);
    digits = `55${ddd}${rest}`;
  }
  return digits;
}

/**
 * POST /api/admin/limpeza-bruta
 * Executa limpeza manual de clientes duplicados via SQL puro
 * ATENÇÃO: Rota temporária de emergência - usar com cuidado
 */
router.post("/limpeza-bruta", async (req, res) => {
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    // Buscar todos os clientes
    const allCustomers: any[] = await (db as any).execute("SELECT * FROM customers ORDER BY id ASC");

    // Agrupar por número base
    const groups = new Map<string, any[]>();
    for (const cust of allCustomers) {
      const baseNum = normalizeToBaseNumber(cust.phone);
      if (!baseNum) continue;
      if (!groups.has(baseNum)) groups.set(baseNum, []);
      groups.get(baseNum)!.push(cust);
    }

    // Filtrar duplicatas
    const duplicateGroups = Array.from(groups.values()).filter(g => g.length > 1);
    const logs: string[] = [];
    let totalDeleted = 0;
    let totalMerged = 0;

    // Processar cada grupo
    for (const group of duplicateGroups) {
      group.sort((a, b) => a.id - b.id);
      const mainCustomer = group[0];
      const duplicates = group.slice(1);

      logs.push(`👤 Grupo ${mainCustomer.phone} (base: ${normalizeToBaseNumber(mainCustomer.phone)})`);
      logs.push(`   Main: ID ${mainCustomer.id} - ${mainCustomer.name}`);
      logs.push(`   Duplicados: ${duplicates.map(d => `ID ${d.id} - ${d.name}`).join(", ")}`);

      for (const dup of duplicates) {
        try {
          // Atualiza todas as tabelas relacionadas
          const tables: [string, string, string][] = [
            ["conversations", "customer_id", "customer_id"],
            ["conversation_messages", "customer_id", "customer_id"],
            ["broadcast_members_sent", "customer_id", "customer_id"],
            ["customer_tags", "customer_id", "customer_id"],
            ["baby_shower_purchases", "guest_customer_id", "guest_customer_id"],
          ];

          for (const [table, field, where] of tables) {
            try {
              await (db as any).execute(
                `UPDATE ${table} SET ${field} = ? WHERE ${where} = ?`,
                [mainCustomer.id, dup.id]
              );
            } catch (e) {
              // Ignora silenciosamente se tabela não existir ou não houver registros
            }
          }

          // Deleta o cliente duplicado
          await (db as any).execute(
            "DELETE FROM customers WHERE id = ?",
            [dup.id]
          );

          totalDeleted++;
          logs.push(`   ✅ Processado ID ${dup.id} → Main ID ${mainCustomer.id}`);
        } catch (err: any) {
          logs.push(`   ❌ Erro ID ${dup.id}: ${err.message}`);
        }
      }

      totalMerged += duplicates.length;
    }

    logs.push("\n✅ Limpeza bruta concluída!");
    logs.push(`   Total mesclados: ${totalMerged}`);
    logs.push(`   Total deletados: ${totalDeleted}`);
    logs.push(`   Clientes restantes: ${allCustomers.length - totalDeleted}`);

    res.json({
      success: true,
      totalCustomers: allCustomers.length,
      duplicateGroups: duplicateGroups.length,
      totalMerged,
      totalDeleted,
      logs,
    });
  } catch (err: any) {
    console.error("[LimpezaBruta] Erro:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
