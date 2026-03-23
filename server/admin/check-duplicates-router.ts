import { Router } from "express";
import { getDb } from "../db";

const router = Router();

/**
 * POST /api/admin/check-duplicates
 * Verifica se existem números duplicados no sistema
 */
router.get("/check-duplicates", async (req, res) => {
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      summary: {
        duplicateCustomers: 0,
        duplicateReceivedMessages: 0,
        duplicateConversationMessages: 0,
        phoneVariations: 0,
      },
      details: {
        duplicateCustomers: [],
        duplicateReceivedMessages: [],
        duplicateConversationMessages: [],
        phoneVariations: [],
      }
    };

    // 1. Verificar duplicatas em customers (por phone)
    const customersResult: any = await (db as any).execute(`
      SELECT phone, COUNT(*) as count, GROUP_CONCAT(id) as ids, GROUP_CONCAT(name) as names
      FROM customers
      WHERE phone IS NOT NULL
      GROUP BY phone
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 50
    `);

    const duplicateCustomers = customersResult.rows || [];
    results.summary.duplicateCustomers = duplicateCustomers.length;
    results.details.duplicateCustomers = duplicateCustomers;

    // 2. Verificar duplicatas em received_messages (provider + externalId)
    const receivedResult: any = await (db as any).execute(`
      SELECT provider, external_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM received_messages
      WHERE external_id IS NOT NULL
      GROUP BY provider, external_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 50
    `);

    const duplicateReceived = receivedResult.rows || [];
    results.summary.duplicateReceivedMessages = duplicateReceived.length;
    results.details.duplicateReceivedMessages = duplicateReceived;

    // 3. Verificar duplicatas em conversation_messages (provider + externalId)
    const conversationResult: any = await (db as any).execute(`
      SELECT provider, external_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM conversation_messages
      WHERE provider IS NOT NULL AND external_id IS NOT NULL
      GROUP BY provider, external_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 50
    `);

    const duplicateConversations = conversationResult.rows || [];
    results.summary.duplicateConversationMessages = duplicateConversations.length;
    results.details.duplicateConversationMessages = duplicateConversations;

    // 4. Verificar variações de telefone (últimos 8 dígitos iguais)
    const phoneVarResult: any = await (db as any).execute(`
      SELECT 
        SUBSTRING(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), -8) as last8,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT phone ORDER BY phone SEPARATOR ' | ') as phones,
        GROUP_CONCAT(DISTINCT id) as ids
      FROM customers
      WHERE phone REGEXP '^[0-9]{10,12}$'
      GROUP BY last8
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);

    const phoneVariations = phoneVarResult.rows || [];
    results.summary.phoneVariations = phoneVariations.length;
    results.details.phoneVariations = phoneVariations;

    // 5. Verificar estatísticas gerais
    const [statsResult] = await (db as any).execute(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as totalCustomers,
        (SELECT COUNT(*) FROM received_messages) as totalReceived,
        (SELECT COUNT(*) FROM conversations) as totalConversations,
        (SELECT COUNT(*) FROM conversation_messages) as totalMessages
    `);
    
    results.stats = statsResult[0];

    // Determinar status geral
    const totalProblems = 
      results.summary.duplicateCustomers + 
      results.summary.duplicateReceivedMessages + 
      results.summary.duplicateConversationMessages + 
      results.summary.phoneVariations;

    results.status = totalProblems === 0 ? "HEALTHY" : "ISSUES_FOUND";
    results.message = totalProblems === 0 
      ? "✅ Sistema sem duplicatas detectadas" 
      : `⚠️ Encontrados ${totalProblems} problemas de duplicação/variação`;

    res.json(results);
  } catch (err: any) {
    console.error("[CheckDuplicates] Erro:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * GET /api/admin/verify-normalization
 * Verifica se a normalização de telefones está funcionando corretamente
 */
router.get("/verify-normalization", async (req, res) => {
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    // Buscar amostra de customers com diferentes formatos
    const result: any = await (db as any).execute(`
      SELECT id, name, phone,
        -- Extrair dígitos apenas
        REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', '') as digits,
        -- Verificar se tem 13 dígitos (55 + DDD + 9 + 8 dígitos)
        CASE 
          WHEN LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', '')) = 13 
          THEN 'COM_9' 
          ELSE 'SEM_9' 
        END as has9
      FROM customers
      WHERE phone IS NOT NULL
      ORDER BY RAND()
      LIMIT 20
    `);

    const sample = result.rows || [];
    
    // Contar por formato
    const with9 = sample.filter((c: any) => c.has9 === 'COM_9').length;
    const without9 = sample.filter((c: any) => c.has9 === 'SEM_9').length;

    res.json({
      success: true,
      sample,
      stats: {
        total: sample.length,
        with9,
        without9,
      },
      message: `Amostra de ${sample.length} customers: ${with9} com 9º dígito, ${without9} sem 9º dígito`,
    });
  } catch (err: any) {
    console.error("[VerifyNormalization] Erro:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
