import { getDb } from "../db.js";
import { babyShowerPurchases } from "../../drizzle/schema.js";
import { eq, and, inArray, lt } from "drizzle-orm";

/**
 * Serviço para limpeza de histórico de compras do Chá de Bebê
 *
 * Regras:
 * 1. Pedidos não finalizados (pending) com mais de 24 horas são automaticamente removidos
 * 2. Histórico de compras antigas (paid/failed/refunded) pode ser limpo manualmente
 */

export class ShoppingCartCleanupService {
  private static readonly BATCH_SIZE = 100;

  /**
   * Remove automaticamente compras pendentes com mais de 24 horas
   * Este método deve ser chamado por um worker/cron a cada hora
   */
  static async cleanupPendingPurchases(): Promise<{ deleted: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas atrás

    // Buscar IDs de compras pendentes antigas (em lotes para evitar lock)
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const oldPendingPurchases = await db
        .select({ id: babyShowerPurchases.id })
        .from(babyShowerPurchases)
        .where(
          and(
            eq(babyShowerPurchases.paymentStatus, "pending"),
            lt(babyShowerPurchases.createdAt, cutoffDate)
          )
        )
        .limit(this.BATCH_SIZE);

      if (oldPendingPurchases.length === 0) {
        hasMore = false;
        continue;
      }

      const ids = oldPendingPurchases.map((p) => p.id);

      // Deletar em lote
      const result = await db
        .delete(babyShowerPurchases)
        .where(inArray(babyShowerPurchases.id, ids));

      totalDeleted += result.affectedRows ?? 0;

      // Se deletou menos que o batch size, acabou
      if (oldPendingPurchases.length < this.BATCH_SIZE) {
        hasMore = false;
      }
    }

    return { deleted: totalDeleted };
  }

  /**
   * Remove manualmente compras antigas (todas as status)
   * @param olderThanDays -remove compras mais antigas que X dias
   */
  static async cleanupOldPurchases(olderThanDays: number = 365): Promise<{ deleted: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await db
      .delete(babyShowerPurchases)
      .where(lt(babyShowerPurchases.createdAt, cutoffDate));

    return { deleted: result.affectedRows ?? 0 };
  }

  /**
   * Remove compras por ID específico (para limpeza manual de um registro)
   */
  static async deletePurchase(purchaseId: number): Promise<{ success: boolean }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .delete(babyShowerPurchases)
      .where(eq(babyShowerPurchases.id, purchaseId));

    return { success: true };
  }

  /**
   * Conta compras pendentes antigas (para métricas/monitoramento)
   */
  static async countPendingOlderThan24h(): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(babyShowerPurchases)
      .where(
        and(
          eq(babyShowerPurchases.paymentStatus, "pending"),
          lt(babyShowerPurchases.createdAt, cutoffDate)
        )
      );

    return result[0]?.count ?? 0;
  }

  /**
   * Obtém estatísticas de compras (para admin)
   */
  static async getStats(): Promise<{
    total: number;
    pending: number;
    paid: number;
    failed: number;
    refunded: number;
    pendingOlder24h: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [
      total,
      pending,
      paid,
      failed,
      refunded,
      pending24,
    ] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(babyShowerPurchases),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(babyShowerPurchases)
        .where(eq(babyShowerPurchases.paymentStatus, "pending")),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(babyShowerPurchases)
        .where(eq(babyShowerPurchases.paymentStatus, "paid")),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(babyShowerPurchases)
        .where(eq(babyShowerPurchases.paymentStatus, "failed")),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(babyShowerPurchases)
        .where(eq(babyShowerPurchases.paymentStatus, "refunded")),
      this.countPendingOlderThan24h(),
    ]);

    return {
      total: total[0]?.count ?? 0,
      pending: pending[0]?.count ?? 0,
      paid: paid[0]?.count ?? 0,
      failed: failed[0]?.count ?? 0,
      refunded: refunded[0]?.count ?? 0,
      pendingOlder24h: pending24,
    };
  }
}

// Correção: adicionar imports faltantes
import { eq, and, inArray } from "drizzle-orm";
