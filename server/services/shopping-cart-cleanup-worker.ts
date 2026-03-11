/**
 * Worker automático para limpeza de compras pendentes antigas
 *
 * Este worker roda a cada hora e remove automaticamente compras pendentes
 * com mais de 24 horas (não foram finalizadas pelo usuário)
 *
 * Para rodar manualmente: node dist/services/shopping-cart-cleanup-worker.js
 *
 * Para configurar no Railway/PM2/cron:
 *   `*/60 * * * * node /app/dist/services/shopping-cart-cleanup-worker.js`
 */

import { ShoppingCartCleanupService } from "./shopping-cart-cleanup.js";

async function runCleanup() {
  try {
    console.log(`[${new Date().toISOString()}] Iniciando limpeza automática de compras pendentes...`);

    const result = await ShoppingCartCleanupService.cleanupPendingPurchases();

    console.log(`[${new Date().toISOString()}] Limpeza concluída: ${result.deleted} compra(s) removida(s)`);

    // Se removeu muitas compras, é um sinal de que algo pode estar errado
    if (result.deleted > 50) {
      console.warn(`[${new Date().toISOString()}] ATENÇÃO: ${result.deleted} compras removidas em uma única execução! Verifique se há problema no fluxo de pagamento.`);
    }

    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERRO na limpeza automática:`, error);
    process.exit(1);
  }
}

// Se executado diretamente, rodar uma vez
if (import.meta.url === `file://${process.argv[1]}`) {
  runCleanup().then(() => {
    console.log("Worker finalizado");
    process.exit(0);
  });
}
