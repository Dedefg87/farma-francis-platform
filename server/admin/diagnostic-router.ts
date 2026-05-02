import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

/**
 * GET /api/admin/check-db
 * Diagnóstico do banco ativo - retorna contagem de clientes e variáveis de ambiente
 */
router.get("/check-db", async (req, res) => {
  const dbRaw = await getDbRaw();
  
  // Coletar variáveis de ambiente relacionadas a banco (mascaradas)
  const envVars: Record<string, string> = {};
  const dbKeys = Object.keys(process.env).filter(k => 
    k.includes('DATABASE') || k.includes('DB_') || k.includes('MYSQL') || 
    k.includes('POSTGRES') || k.includes('R2_') || k.includes('S3_')
  );
  for (const key of dbKeys) {
    const val = process.env[key] || '';
    if (val.length > 50) {
      envVars[key] = val.substring(0, 30) + '****' + val.substring(val.length - 10);
    } else {
      envVars[key] = val.replace(/:[^:@]+@/, ':****@');
    }
  }

  if (!dbRaw) {
    return res.status(500).json({ error: "Database not available", envVars });
  }

  try {
    const countResult = await dbRaw.raw("SELECT COUNT(*) as total FROM customers");
    const total = countResult?.[0]?.total || 0;
    
    const tablesResult = await dbRaw.raw("SHOW TABLES");
    const tables = tablesResult?.map((row: unknown) => Object.values(row)[0]) || [];
    
    const sampleCustomers = await dbRaw.raw("SELECT id, name, phone FROM customers LIMIT 5");
    
    // 🔍 Verificação de variações de telefone
    const [phoneVarRows] = await dbRaw.raw(`
      SELECT 
        last8,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT phone ORDER BY phone SEPARATOR ' | ') as phones,
        GROUP_CONCAT(DISTINCT id) as ids
      FROM (
        SELECT 
          id,
          phone,
          SUBSTRING(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''),
            -8
          ) as last8
        FROM customers
        WHERE phone IS NOT NULL
      ) AS normalized
      GROUP BY last8
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // 🔍 Teste específico: IDs 2,3,4 do check-db anterior
    const [testRows] = await dbRaw.raw(`
      SELECT id, name, phone,
        SUBSTRING(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), -8) as last8
      FROM customers
      WHERE id IN (2, 3, 4) OR id BETWEEN 1 AND 10
      ORDER BY id
    `);

    res.json({ 
      success: true, 
      totalCustomers: Number(total), 
      tables: tables.slice(0, 15),
      sampleCustomers,
      phoneVariationsSample: phoneVarRows,
      phoneTest: testRows,
      envVars,
      dbType: "mysql2-raw"
    });
  } catch (err: unknown) {
    console.error("[check-db] Erro:", err);
    res.status(500).json({ error: err.message, envVars });
  }
});

/**
 * POST /api/admin/limpeza-bruta
 * Executa limpeza manual de clientes duplicados via SQL puro
 * ATENÇÃO: Rota temporária de emergência - usar com cuidado
 */
router.post("/limpeza-bruta", async (req, res) => {
  const dbRaw = await getDbRaw();
  if (!dbRaw) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

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

  try {
    const allCustomers: unknown[] = await dbRaw.raw("SELECT * FROM customers ORDER BY id ASC");
    const groups = new Map<string, any[]>();
    for (const cust of allCustomers) {
      const baseNum = normalizeToBaseNumber(cust.phone);
      if (!baseNum) continue;
      if (!groups.has(baseNum)) groups.set(baseNum, []);
      groups.get(baseNum)!.push(cust);
    }

    const duplicateGroups = Array.from(groups.values()).filter(g => g.length > 1);
    const logs: string[] = [];
    let totalDeleted = 0;
    let totalMerged = 0;

    for (const group of duplicateGroups) {
      group.sort((a, b) => a.id - b.id);
      const mainCustomer = group[0];
      const duplicates = group.slice(1);

      logs.push(`👤 Grupo ${mainCustomer.phone} (base: ${normalizeToBaseNumber(mainCustomer.phone)})`);
      logs.push(`   Main: ID ${mainCustomer.id} - ${mainCustomer.name}`);
      logs.push(`   Duplicados: ${duplicates.map(d => `ID ${d.id} - ${d.name}`).join(", ")}`);

      for (const dup of duplicates) {
        try {
          const tables: [string, string, string][] = [
            ["conversations", "customer_id", "customer_id"],
            ["conversation_messages", "customer_id", "customer_id"],
            ["broadcast_members_sent", "customer_id", "customer_id"],
            ["customer_tags", "customer_id", "customer_id"],
            ["baby_shower_purchases", "guest_customer_id", "guest_customer_id"],
          ];
          for (const [table, field, where] of tables) {
            try {
              await dbRaw.raw(
                `UPDATE ${table} SET ${field} = ? WHERE ${where} = ?`,
                [mainCustomer.id, dup.id]
              );
            } catch (e) {
              // Ignora silenciosamente se tabela não existir ou não houver registros
            }
          }

          await dbRaw.raw(
            "DELETE FROM customers WHERE id = ?",
            [dup.id]
          );

          totalDeleted++;
          logs.push(`   ✅ Processado ID ${dup.id} → Main ID ${mainCustomer.id}`);
        } catch (err: unknown) {
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
  } catch (err: unknown) {
    console.error("[LimpezaBruta] Erro:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
