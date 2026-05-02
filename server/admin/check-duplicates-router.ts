import { Router } from "express";
import { getDbRaw } from "../db";

const router = Router();

/**
 * POST /api/admin/check-duplicates
 * Verifica se existem números duplicados no sistema
 */
router.get("/check-duplicates", async (req, res) => {
  const db = await getDbRaw();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    const results: unknown = {
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
    const customersResult: unknown = await (db as any).execute(`
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
    const receivedResult: unknown = await (db as any).execute(`
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
    const conversationResult: unknown = await (db as any).execute(`
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
    // Normaliza removendo +, espaços, traços, parênteses antes de extrair
    const phoneVarResult: unknown = await (db as any).execute(`
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
  } catch (err: unknown) {
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
  const db = await getDbRaw();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    // Buscar amostra de customers com diferentes formatos
    const [rows] = await db.execute(`
      SELECT id, name, phone
      FROM customers
      WHERE phone IS NOT NULL
      ORDER BY RAND()
      LIMIT 20
    `);

    const sample = rows || [];
    
    // Análise manual dos formatos
    const analysis = sample.map((c: unknown) => {
      const digitsOnly = c.phone.replace(/\D/g, '');
      const has9 = digitsOnly.length >= 12; // 55 + DDD + 9 + 8 dígitos = 13, ou DDD + 9 + 8 = 11
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        digits: digitsOnly,
        length: digitsOnly.length,
        format: has9 ? 'COM_9' : 'SEM_9'
      };
    });

    const with9 = analysis.filter((c: unknown) => c.format === 'COM_9').length;
    const without9 = analysis.filter((c: unknown) => c.format === 'SEM_9').length;

    res.json({
      success: true,
      sample: analysis,
      stats: {
        total: analysis.length,
        with9,
        without9,
      },
      message: `Amostra de ${analysis.length} customers: ${with9} com 9º dígito, ${without9} sem 9º dígito`,
    });
  } catch (err: unknown) {
    console.error("[VerifyNormalization] Erro:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
